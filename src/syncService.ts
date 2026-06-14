import { useState, useEffect, useCallback } from 'react';
import { getLocalVisits, pushVisitToFirestore, saveLocalVisit } from './db';
import { SiteVisit } from './types';

// Periodic interval check for background sync (e.g. every 15 seconds)
const BG_SYNC_INTERVAL_MS = 15000;

/**
 * Iterates through all locally stored visits on IndexedDB, filters out
 * the records marked as unsynced (synced === false), and pushes them
 * sequentially to Cloud Firestore.
 */
export async function syncUnsyncedVisits(
  onProgress?: (successCount: number, totalToSync: number) => void
): Promise<{ success: number; failed: number }> {
  if (!navigator.onLine) {
    return { success: 0, failed: 0 };
  }

  try {
    const visits = await getLocalVisits();
    const unsynced = visits.filter(v => v.synced === false);
    
    if (unsynced.length === 0) {
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;
    const total = unsynced.length;

    for (const visit of unsynced) {
      try {
        await pushVisitToFirestore(visit);
        // Mark as synced locally
        await saveLocalVisit({ ...visit, synced: true });
        successCount++;
        if (onProgress) {
          onProgress(successCount, total);
        }
      } catch (err) {
        console.error(`Background Sync Error for visit ID ${visit.id}:`, err);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Failed to run syncUnsyncedVisits background task', error);
    return { success: 0, failed: 0 };
  }
}

/**
 * Retrieves the count of unsynced records from the IndexedDB visits store.
 */
export async function getUnsyncedCount(): Promise<number> {
  try {
    const visits = await getLocalVisits();
    return visits.filter(v => v.synced === false).length;
  } catch (err) {
    console.error('Failed to count unsynced visits', err);
    return 0;
  }
}

/**
 * Custom React Hook that integrates connection monitoring, periodic background checking
 * and synchronization of unsynced database entries.
 */
export function useBackgroundSync(onSyncSuccess?: () => void) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);

  // Update count of unsynced visits
  const updateUnsyncedCount = useCallback(async () => {
    const count = await getUnsyncedCount();
    setUnsyncedCount(count);
  }, []);

  // Run the synchronization process
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await syncUnsyncedVisits();
      if (result.success > 0) {
        if (onSyncSuccess) {
          onSyncSuccess();
        }
      }
    } catch (err) {
      console.error('Background Sync trigger error', err);
    } finally {
      await updateUnsyncedCount();
      setIsSyncing(false);
    }
  }, [isSyncing, updateUnsyncedCount, onSyncSuccess]);

  // Effect covering initial load and network listeners
  useEffect(() => {
    updateUnsyncedCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Immediately try to sync when returning online
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync, updateUnsyncedCount]);

  // Effect covering periodic background polling
  useEffect(() => {
    const intervalId = setInterval(async () => {
      await updateUnsyncedCount();
      if (navigator.onLine && !isSyncing) {
        const count = await getUnsyncedCount();
        if (count > 0) {
          await triggerSync();
        }
      }
    }, BG_SYNC_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isSyncing, triggerSync, updateUnsyncedCount]);

  return {
    isOnline,
    isSyncing,
    unsyncedCount,
    triggerSync,
    updateUnsyncedCount
  };
}
