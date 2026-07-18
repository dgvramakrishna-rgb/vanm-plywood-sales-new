import { 
  collection, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  doc, 
  getDocFromServer
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { SiteVisit } from './types';

const DB_NAME = 'SalesTrackerDB';
const STORE_NAME = 'visits';
const DB_VERSION = 4;

// --- Utility for Firestore Serialization ---

function isPermissionError(error: any): boolean {
  if (!error) return false;
  if (error.code === 'permission-denied') return true;
  const msg = error.message ? error.message.toLowerCase() : '';
  if (msg.includes('permission') || msg.includes('insufficient')) return true;
  return false;
}

// Recursively removes undefined values to satisfy Firestore's constraints
function serializeForFirestore<T extends object>(obj: T): T {
  const cleaned = { ...obj } as any;
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    } else if (cleaned[key] !== null && typeof cleaned[key] === 'object' && !Array.isArray(cleaned[key])) {
      cleaned[key] = serializeForFirestore(cleaned[key]);
    }
  });
  return cleaned;
}

// --- Utility to sanitize document IDs to prevent space/formatting issues ---
export function sanitizeDocId(mobile: string): string {
  if (!mobile) return '';
  return mobile.trim().replace(/[\s\-\(\)\+]/g, '');
}

export function isMobileMatch(m1?: string, m2?: string): boolean {
  const num1 = (m1 || '8790816023').trim().replace(/\D/g, '');
  const num2 = (m2 || '').trim().replace(/\D/g, '');
  if (!num2) return false;
  if (num1 === num2) return true;
  if (num1.length >= 10 && num2.length >= 10) {
    return num1.slice(-10) === num2.slice(-10);
  }
  return false;
}

// --- Local IndexedDB Setup ---

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      const error = request.error;
      if (error && error.name === 'VersionError') {
        console.warn(`IndexedDB version mismatch (requested ${DB_VERSION}). Deleting and recreating database...`);
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        
        deleteRequest.onsuccess = () => {
          const reopenRequest = indexedDB.open(DB_NAME, DB_VERSION);
          reopenRequest.onupgradeneeded = () => {
            const db = reopenRequest.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
          };
          reopenRequest.onsuccess = () => {
            resolve(reopenRequest.result);
          };
          reopenRequest.onerror = () => {
            reject(reopenRequest.error);
          };
        };
        
        deleteRequest.onerror = () => {
          reject(error);
        };
      } else {
        reject(error);
      }
    };
  });
}

export async function getLocalVisits(userMobile?: string): Promise<SiteVisit[]> {
  try {
    const dbInstance = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        let visits = request.result as SiteVisit[];
        if (userMobile) {
          visits = visits.filter(v => isMobileMatch(v.userMobile, userMobile));
        }
        visits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(visits);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to retrieve visits from IndexedDB', error);
    return [];
  }
}

export async function saveLocalVisit(visit: SiteVisit): Promise<void> {
  const dbInstance = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(visit);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteLocalVisit(id: string): Promise<void> {
  const dbInstance = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// --- Firebase Connection Validation (Required by skill) ---

export async function testFirebaseConnection(): Promise<void> {
  try {
    // Tests connection to server
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore database connection validation successful.");
  } catch (error) {
    console.warn("Firestore database is temporarily unreachable. Client will operate gracefully other database services using our built-in offline Cache & IndexedDB fallback.", error);
  }
}

// --- User Profile DB Operations ---

export interface ExecutiveUser {
  id?: string;
  name: string;
  mobile: string;
  zone: string;
  companyName?: string;
  createdAt?: string;
}

export async function fetchUserFromFirestore(mobile: string): Promise<ExecutiveUser | null> {
  const cleanId = sanitizeDocId(mobile);
  const userPath = `users/${cleanId}`;
  try {
    const userDoc = await getDoc(doc(db, 'users', cleanId));
    if (userDoc.exists()) {
      const data = userDoc.data() as ExecutiveUser;
      if (!data.id) {
        data.id = 'usr_' + cleanId;
      }
      return data;
    }
    return null;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, userPath);
    } else {
      console.warn("Firestore connection/get issue on user profile.", error);
      throw error;
    }
  }
}

export async function saveUserToFirestore(user: ExecutiveUser): Promise<void> {
  const cleanId = sanitizeDocId(user.mobile);
  const userPath = `users/${cleanId}`;
  try {
    const userId = user.id || 'usr_' + cleanId;
    await setDoc(doc(db, 'users', cleanId), serializeForFirestore({
      ...user,
      id: userId,
      createdAt: user.createdAt || new Date().toISOString()
    }));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    } else {
      console.warn("Firestore connection/write issue on user profile.", error);
    }
  }
}

// --- Directory (Customers, Carpenters, Interiors) DB Operations ---

export async function saveCustomerToFirestore(customer: { id: string; name: string; mobile: string; address: string; lastVisitDate: string }): Promise<void> {
  const cleanId = sanitizeDocId(customer.mobile);
  const path = `customers/${cleanId}`;
  try {
    await setDoc(doc(db, 'customers', cleanId), serializeForFirestore(customer));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } else {
      console.warn("Firestore connection/write issue on customer entity.", error);
    }
  }
}

export async function deleteCustomerFromFirestore(mobile: string): Promise<void> {
  const cleanId = sanitizeDocId(mobile);
  const path = `customers/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'customers', cleanId));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } else {
      console.warn("Firestore connection/delete issue on customer entity.", error);
    }
  }
}

export async function saveCarpenterToFirestore(carpenter: { id: string; name: string; mobile: string; clientName: string; address: string; lastVisitDate: string }): Promise<void> {
  const cleanId = sanitizeDocId(carpenter.mobile);
  const path = `carpenters/${cleanId}`;
  try {
    await setDoc(doc(db, 'carpenters', cleanId), serializeForFirestore(carpenter));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } else {
      console.warn("Firestore connection/write issue on carpenter entity.", error);
    }
  }
}

export async function deleteCarpenterFromFirestore(mobile: string): Promise<void> {
  const cleanId = sanitizeDocId(mobile);
  const path = `carpenters/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'carpenters', cleanId));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } else {
      console.warn("Firestore connection/delete issue on carpenter entity.", error);
    }
  }
}

export async function saveInteriorToFirestore(interior: { id: string; name: string; mobile: string; clientName: string; address: string; lastVisitDate: string }): Promise<void> {
  const cleanId = sanitizeDocId(interior.mobile);
  const path = `interiors/${cleanId}`;
  try {
    await setDoc(doc(db, 'interiors', cleanId), serializeForFirestore(interior));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } else {
      console.warn("Firestore connection/write issue on interior entity.", error);
    }
  }
}

export async function deleteInteriorFromFirestore(mobile: string): Promise<void> {
  const cleanId = sanitizeDocId(mobile);
  const path = `interiors/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'interiors', cleanId));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } else {
      console.warn("Firestore connection/delete issue on interior entity.", error);
    }
  }
}

export async function saveArchitectToFirestore(architect: { id: string; name: string; mobile: string; clientName: string; address: string; lastVisitDate: string }): Promise<void> {
  const cleanId = sanitizeDocId(architect.mobile);
  const path = `architects/${cleanId}`;
  try {
    await setDoc(doc(db, 'architects', cleanId), serializeForFirestore(architect));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } else {
      console.warn("Firestore connection/write issue on architect entity.", error);
    }
  }
}

export async function deleteArchitectFromFirestore(mobile: string): Promise<void> {
  const cleanId = sanitizeDocId(mobile);
  const path = `architects/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'architects', cleanId));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } else {
      console.warn("Firestore connection/delete issue on architect entity.", error);
    }
  }
}

export async function saveBuilderToFirestore(builder: { id: string; name: string; mobile: string; clientName: string; address: string; lastVisitDate: string }): Promise<void> {
  const cleanId = sanitizeDocId(builder.mobile);
  const path = `builders/${cleanId}`;
  try {
    await setDoc(doc(db, 'builders', cleanId), serializeForFirestore(builder));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } else {
      console.warn("Firestore connection/write issue on builder entity.", error);
    }
  }
}

export async function deleteBuilderFromFirestore(mobile: string): Promise<void> {
  const cleanId = sanitizeDocId(mobile);
  const path = `builders/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'builders', cleanId));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } else {
      console.warn("Firestore connection/delete issue on builder entity.", error);
    }
  }
}

// --- Dealer DB Operations ---

export async function saveDealerToFirestore(dealer: { id: string; name: string; dealerPointName: string; place: string; mobile: string; createdAt: string }): Promise<void> {
  const cleanId = sanitizeDocId(dealer.mobile);
  const path = `dealers/${cleanId}`;
  try {
    await setDoc(doc(db, 'dealers', cleanId), serializeForFirestore({
      ...dealer,
      createdAt: dealer.createdAt || new Date().toISOString()
    }));
    // Update local cache
    const cached = localStorage.getItem('fieldconnect_dealers_cache');
    let dealers = [];
    if (cached) {
      try {
        dealers = JSON.parse(cached);
      } catch (e) {
        console.warn("Corrupted dealers cache in localStorage:", e);
      }
    }
    const index = dealers.findIndex((d: any) => d.mobile === dealer.mobile);
    if (index > -1) {
      dealers[index] = dealer;
    } else {
      dealers.unshift(dealer);
    }
    localStorage.setItem('fieldconnect_dealers_cache', JSON.stringify(dealers));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } else {
      console.warn("Firestore connection/write issue on dealer entity.", error);
      // Even if offline, write to local cache!
      const cached = localStorage.getItem('fieldconnect_dealers_cache');
      let dealers = [];
      if (cached) {
        try {
          dealers = JSON.parse(cached);
        } catch (e) {
          console.warn("Corrupted dealers cache in localStorage:", e);
        }
      }
      const index = dealers.findIndex((d: any) => d.mobile === dealer.mobile);
      if (index > -1) {
        dealers[index] = dealer;
      } else {
        dealers.unshift(dealer);
      }
      localStorage.setItem('fieldconnect_dealers_cache', JSON.stringify(dealers));
    }
  }
}

export async function deleteDealerFromFirestore(mobile: string): Promise<void> {
  const cleanId = sanitizeDocId(mobile);
  const path = `dealers/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'dealers', cleanId));
    const cached = localStorage.getItem('fieldconnect_dealers_cache');
    if (cached) {
      let dealers = [];
      try {
        dealers = JSON.parse(cached);
      } catch (e) {
        console.warn("Corrupted dealers cache in localStorage:", e);
      }
      const filteredDealers = dealers.filter((d: any) => d.mobile !== mobile);
      localStorage.setItem('fieldconnect_dealers_cache', JSON.stringify(filteredDealers));
    }
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } else {
      console.warn("Firestore connection/delete issue on dealer entity.", error);
      const cached = localStorage.getItem('fieldconnect_dealers_cache');
      if (cached) {
        const dealers = JSON.parse(cached).filter((d: any) => d.mobile !== mobile);
        localStorage.setItem('fieldconnect_dealers_cache', JSON.stringify(dealers));
      }
    }
  }
}

export async function getAllDealers(userMobile?: string): Promise<{ id: string; name: string; dealerPointName: string; place: string; mobile: string; createdAt: string; userMobile?: string; userId?: string }[]> {
  const path = 'dealers';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    let dealers: { id: string; name: string; dealerPointName: string; place: string; mobile: string; createdAt: string; userMobile?: string; userId?: string }[] = [];
    querySnapshot.forEach((docSnap) => {
      dealers.push(docSnap.data() as any);
    });
    
    // Save all to cache for reference
    localStorage.setItem('fieldconnect_dealers_cache', JSON.stringify(dealers));

    if (userMobile) {
      dealers = dealers.filter(d => isMobileMatch(d.userMobile, userMobile));
    }

    dealers.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    return dealers;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, path);
    } else {
      console.warn("Firestore collection get issue for dealers. Returning cached.", error);
    }
    const cached = localStorage.getItem('fieldconnect_dealers_cache');
    if (!cached) return [];
    try {
      let dealers = JSON.parse(cached);
      if (userMobile) {
        dealers = dealers.filter((d: any) => isMobileMatch(d.userMobile, userMobile));
      }
      dealers.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      return dealers;
    } catch (e) {
      console.warn("Corrupted dealers cache in localStorage:", e);
      return [];
    }
  }
}

// --- Site Visits / Customer Absent (Unavailable) Sites Operations ---

export async function getAllVisits(userMobile?: string): Promise<SiteVisit[]> {
  const visitsPath = 'visits';
  try {
    const querySnapshot = await getDocs(collection(db, visitsPath));
    let cloudVisits: SiteVisit[] = [];
    querySnapshot.forEach((docSnap) => {
      cloudVisits.push(docSnap.data() as SiteVisit);
    });

    if (userMobile) {
      cloudVisits = cloudVisits.filter(v => isMobileMatch(v.userMobile, userMobile));
    }

    // Sort visits by creation date descending (newest first)
    cloudVisits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Update local DB for fast loading & offline capabilities
    for (const v of cloudVisits) {
      await saveLocalVisit({ ...v, synced: true });
    }

    return cloudVisits;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, visitsPath);
    } else {
      console.warn("Failed to fetch visits from Firestore. Falling back to local IndexedDB.", error);
      return await getLocalVisits(userMobile);
    }
  }
}

export async function clearOlderSyncedVisits(userMobile?: string): Promise<number> {
  try {
    const dbInstance = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const visits = request.result as SiteVisit[];
        let deleteCount = 0;
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

        for (const v of visits) {
          if (userMobile && !isMobileMatch(v.userMobile, userMobile)) {
            continue;
          }
          if (v.synced === true) {
            const createdTime = new Date(v.createdAt).getTime();
            if (createdTime < ninetyDaysAgo) {
              store.delete(v.id);
              deleteCount++;
            }
          }
        }
        resolve(deleteCount);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to clear older synced visits from IndexedDB', error);
    return 0;
  }
}

export async function pushVisitToFirestore(visit: SiteVisit): Promise<void> {
  const { synced, ...cleanVisit } = visit;
  // 1. Save to cloud Firestore
  await setDoc(doc(db, 'visits', visit.id), serializeForFirestore(cleanVisit));

  // 2. Cascade saving profile to Directory databases
  if (visit.clientName && visit.clientMobile) {
    await saveCustomerToFirestore({
      id: visit.id,
      name: visit.clientName,
      mobile: visit.clientMobile,
      address: visit.address,
      lastVisitDate: visit.visitingDate
    });
  }

  if (visit.contractorType === 'carpenter' && visit.contractorName && visit.contractorMobile) {
    await saveCarpenterToFirestore({
      id: visit.id,
      name: visit.contractorName,
      mobile: visit.contractorMobile,
      clientName: visit.clientName,
      address: visit.address,
      lastVisitDate: visit.visitingDate
    });
  }

  if (visit.contractorType === 'interior' && visit.contractorName && visit.contractorMobile) {
    await saveInteriorToFirestore({
      id: visit.id,
      name: visit.contractorName,
      mobile: visit.contractorMobile,
      clientName: visit.clientName,
      address: visit.address,
      lastVisitDate: visit.visitingDate
    });
  }

  if (visit.contractorType === 'architect' && visit.contractorName && visit.contractorMobile) {
    await saveArchitectToFirestore({
      id: visit.id,
      name: visit.contractorName,
      mobile: visit.contractorMobile,
      clientName: visit.clientName,
      address: visit.address,
      lastVisitDate: visit.visitingDate
    });
  }

  if (visit.builderName && visit.builderMobile) {
    await saveBuilderToFirestore({
      id: visit.id,
      name: visit.builderName,
      mobile: visit.builderMobile,
      clientName: visit.clientName,
      address: visit.builderPlace || visit.address,
      lastVisitDate: visit.visitingDate
    });
  }
}

export async function saveVisit(visit: SiteVisit): Promise<void> {
  const visitPath = `visits/${visit.id}`;
  try {
    // 1. Attempt upload to cloud Firestore
    await pushVisitToFirestore(visit);

    // 2. Save local with synced: true
    await saveLocalVisit({ ...visit, synced: true });

  } catch (error) {
    // Fallback local write even if offline
    console.error("Firestore write failed, writing to local database...", error);
    await saveLocalVisit({ ...visit, synced: false });
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, visitPath);
    } else {
      console.warn("Firestore connection/write issue on visit entity. Saved locally.", error);
    }
  }
}

export async function deleteVisit(id: string): Promise<void> {
  const visitPath = `visits/${id}`;
  try {
    // 1. Delete from Cloud
    await deleteDoc(doc(db, 'visits', id));

    // 2. Delete from local database
    await deleteLocalVisit(id);
  } catch (error) {
    console.error("Firestore delete failed, deleting from local database...", error);
    await deleteLocalVisit(id);
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, visitPath);
    } else {
      console.warn("Firestore connection/delete issue on visit entity. Removed locally.", error);
    }
  }
}
