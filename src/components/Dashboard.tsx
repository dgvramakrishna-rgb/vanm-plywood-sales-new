import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  Flame, 
  Snowflake, 
  Target, 
  Calendar, 
  BarChart4, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Compass,
  User,
  Wrench,
  Search,
  Phone,
  MapPin,
  UserPlus,
  Plus,
  Paintbrush,
  Check,
  X,
  PlusCircle,
  PhoneCall,
  MessageSquare,
  MessageCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  Eye,
  UserX,
  Navigation,
  Building2,
  Share2,
  Store,
  RefreshCw,
  Bell,
  BellOff,
  Info,
  CheckSquare,
  Map as MapIcon,
  Layers
} from 'lucide-react';
import { SiteVisit, Dealer } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { exportToCsv } from '../utils/fileExporter';
import { shareVisitDetails } from '../utils/shareUtils';
import { calculateDistance } from '../utils/geoUtils';
import { SitePhotoItem } from './SitePhotoItem';
import SiteVisitsMap from './SiteVisitsMap';
import SiteVisitsOSMMap from './SiteVisitsOSMMap';
import ContactsUploader, { ContactItem } from './ContactsUploader';
import CallManager from './CallManager';
import { 
  requestNotificationPermission, 
  getNotificationPermissionStatus, 
  sendLocalNotification,
  playProximityBeep
} from '../utils/notifications';

// Helper to open URLs externally in Capacitor or native contexts gracefully
const openExternalUrl = (url: string) => {
  const isCapacitor = (window as any).Capacitor !== undefined;
  if (isCapacitor) {
    window.open(url, '_system');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

interface DashboardProps {
  visits: SiteVisit[];
  dealers?: Dealer[];
  onSaveDealer?: (dealer: Omit<Dealer, 'id' | 'createdAt'>) => void;
  onDeleteDealer?: (mobile: string) => void;
  onAddNewVisit: () => void;
  onQuickSave?: (visit: Omit<SiteVisit, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => void;
  onToggleCompleteCustomer?: (mobile: string, isCompleted: boolean) => Promise<void>;
  onDeleteCustomer?: (mobile: string) => Promise<void>;
  onDeleteCarpenter?: (mobile: string) => Promise<void>;
  onDeleteInterior?: (mobile: string) => Promise<void>;
  onDeleteArchitect?: (mobile: string) => Promise<void>;
  onDeleteBuilder?: (mobile: string) => Promise<void>;
  currentUser?: { name: string; mobile: string; zone: string; companyName?: string } | null;
  onUpdateProfile?: (updated: { name: string; mobile: string; zone: string; companyName?: string }) => void;
  onSignOut?: () => void;
  onEditVisit?: (visit: SiteVisit) => void;
  onTriggerToast?: (msg: string, type?: 'success' | 'info') => void;
}

export default function Dashboard({ 
  visits, 
  dealers = [],
  onSaveDealer,
  onDeleteDealer,
  onAddNewVisit,
  onQuickSave,
  onToggleCompleteCustomer,
  onDeleteCustomer,
  onDeleteCarpenter,
  onDeleteInterior,
  onDeleteArchitect,
  onDeleteBuilder,
  currentUser: initialCurrentUser,
  onUpdateProfile,
  onSignOut,
  onEditVisit,
  onTriggerToast
}: DashboardProps) {
  // Current date constants based on system date
  const todayStr = new Date().toISOString().split('T')[0];
  const absentVisits = visits.filter(v => v.customerNotAvailable === true && !v.isCompleted);
  
  // Navigation tab state within the Home Page: overview, followups, reports, absent, places, dealers, completed, partners, call
  const [activeHomeTab, setActiveHomeTab] = useState<'overview' | 'followups' | 'reports' | 'absent' | 'places' | 'dealers' | 'completed' | 'partners' | 'map' | 'call'>('overview');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mapType, setMapType] = useState<'google' | 'osm'>('osm');
  
  const unsyncedCount = visits.filter(v => v.synced !== true).length;

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [dealersSearchQuery, setDealersSearchQuery] = useState('');
  const [completedSearchQuery, setCompletedSearchQuery] = useState('');
  const [placesSearchQuery, setPlacesSearchQuery] = useState('');
  
  // States for registering dealers
  const [dealerName, setDealerName] = useState('');
  const [dealerPointName, setDealerPointName] = useState('');
  const [dealerPlace, setDealerPlace] = useState('');
  const [dealerMobile, setDealerMobile] = useState('');
  const [dealerError, setDealerError] = useState('');
  const [dealerSuccess, setDealerSuccess] = useState('');
  
  // Load current user context for reports
  const [currentUser, setCurrentUser] = useState<{ name: string; mobile: string; zone: string; companyName?: string } | null>(() => {
    if (initialCurrentUser) return initialCurrentUser;
    const saved = localStorage.getItem('fieldconnect_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Track profile form inputs
  const [profName, setProfName] = useState(currentUser?.name || '');
  const [profCompany, setProfCompany] = useState(currentUser?.companyName || 'Sales Pro');
  const [profMobile, setProfMobile] = useState(currentUser?.mobile || '');
  const [isProfileExpanded, setIsProfileExpanded] = useState(true); // show by default for accessibility
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Sync state if initialCurrentUser changes
  React.useEffect(() => {
    if (initialCurrentUser) {
      setCurrentUser(initialCurrentUser);
      setProfName(initialCurrentUser.name);
      setProfCompany(initialCurrentUser.companyName || 'Sales Pro');
      setProfMobile(initialCurrentUser.mobile);
    }
  }, [initialCurrentUser]);

  // State variables for Custom Daily Report generator
  const [reportDateInput, setReportDateInput] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [reportUserName, setReportUserName] = useState<string>(currentUser?.name || 'Ramakrishna');
  const [reportPlace, setReportPlace] = useState<string>('');
  const [reportDealerSubdealer, setReportDealerSubdealer] = useState<string>('');
  const [reportSecondarySalesToday, setReportSecondarySalesToday] = useState<string>('');
  const [reportCumulativeSalesMonth, setReportCumulativeSalesMonth] = useState<string>('');
  const [reportTomorrowWorkAt, setReportTomorrowWorkAt] = useState<string>('');
  const [customReportText, setCustomReportText] = useState<string>('');
  const [isCustomEditing, setIsCustomEditing] = useState<boolean>(false);
  const [customPOAReportText, setCustomPOAReportText] = useState<string>('');
  const [isCustomPOAEditing, setIsCustomPOAEditing] = useState<boolean>(false);

  // Helper to format date
  const formatDateToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Image zoom modal state for absent list photos
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Followups sub-tab options within the Follow-Up tab: client, carpenter, interim, architect, builder
  const [activeFollowupSubTab, setActiveFollowupSubTab] = useState<'client' | 'carpenter' | 'interior' | 'architect' | 'builder'>('client');
  const [followupSearchQuery, setFollowupSearchQuery] = useState('');

  // Persistence of completed/snoozed follow-ups (snoozed for 4 days)
  const [snoozedFollowups, setSnoozedFollowups] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('fieldconnect_followup_snooze');
    return saved ? JSON.parse(saved) : {};
  });

  // Offline notifications state
  const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'default'>('default');
  const [autoNotifyClients, setAutoNotifyClients] = useState<boolean>(() => {
    return localStorage.getItem('vanmply_notify_clients') !== 'false';
  });
  const [autoNotifyCarpenters, setAutoNotifyCarpenters] = useState<boolean>(() => {
    return localStorage.getItem('vanmply_notify_carpenters') !== 'false';
  });
  const [autoNotifyInteriors, setAutoNotifyInteriors] = useState<boolean>(() => {
    return localStorage.getItem('vanmply_notify_interiors') !== 'false';
  });
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(() => {
    return localStorage.getItem('vanmply_show_notification_center') === 'true';
  });

  // Proximity Notification State
  const [notifiedSiteIds, setNotifiedSiteIds] = useState<Set<string>>(new Set());
  const [currentDistanceToNearest, setCurrentDistanceToNearest] = useState<{ id: string; name: string; distance: number } | null>(null);
  const [isProximityAlertEnabled, setIsProximityAlertEnabled] = useState<boolean>(() => {
    return localStorage.getItem('vanmply_proximity_alerts') !== 'false';
  });

  // Load and check notification permission status on component mount
  React.useEffect(() => {
    const checkStatus = async () => {
      const status = await getNotificationPermissionStatus();
      setNotificationPermission(status);
    };
    checkStatus();
  }, []);

  // Proximity Location Tracking Effect
  React.useEffect(() => {
    if (!isProximityAlertEnabled || !navigator.geolocation) return;

    // Request notification permission if not granted
    if (notificationPermission === 'default') {
      requestNotificationPermission().then(status => setNotificationPermission(status));
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: userLat, longitude: userLon } = position.coords;
        let nearest: { id: string; name: string; distance: number } | null = null;

        visits.forEach(visit => {
          if (!visit.latitude || !visit.longitude || visit.isCompleted) return;

          const distance = calculateDistance(userLat, userLon, visit.latitude, visit.longitude);
          
          // Check if within 100 meters
          if (distance <= 100 && !notifiedSiteIds.has(visit.id)) {
            sendLocalNotification(
              '📍 Arrival: Nearby Client Site',
              `${visit.clientName} is ${Math.round(distance)}m from your current location.`
            );
            setNotifiedSiteIds(prev => new Set(prev).add(visit.id));
            
            // Play pulsing alert beep sound for exactly 5 seconds
            playProximityBeep(5000);
            
            if (onTriggerToast) {
              onTriggerToast(`📍 Arrival: ${visit.clientName} is ${Math.round(distance)}m away!`, 'info');
            }
          }

          // Track nearest for UI display
          if (!nearest || distance < nearest.distance) {
            nearest = { id: visit.id, name: visit.clientName, distance };
          }
        });

        setCurrentDistanceToNearest(nearest);
      },
      (error) => {
        console.warn("Proximity tracking error:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isProximityAlertEnabled, visits, notifiedSiteIds, notificationPermission, onTriggerToast]);

  // Proactive automatic notification reminders on login / app open
  React.useEffect(() => {
    if (notificationPermission !== 'granted') return;

    // Use sessionStorage to prevent spamming notifications multiple times in a single session
    const sessionAlertSent = sessionStorage.getItem('vanmply_notify_session_sent');
    if (sessionAlertSent === 'true') return;

    const timer = setTimeout(() => {
      // Safely compute counts inside the hook to prevent temporal dead zone
      const pendingClientCount = visits.filter(v => !v.isCompleted && v.clientName).length;
      
      const carpentersMap = new Map();
      visits.forEach(v => {
        if (v.contractorType === 'carpenter' && v.contractorName) carpentersMap.set(v.contractorMobile, 1);
        if (v.carpenterName && v.carpenterMobile) carpentersMap.set(v.carpenterMobile, 1);
      });
      const responseNeededCarpenters = carpentersMap.size;

      const interiorsMap = new Map();
      visits.forEach(v => {
        if (v.contractorType === 'interior' && v.contractorName) interiorsMap.set(v.contractorMobile, 1);
        if (v.interiorName && v.interiorMobile) interiorsMap.set(v.interiorMobile, 1);
      });
      const responseNeededInteriors = interiorsMap.size;

      const title = 'Sales Tracker: Active Follow-up Reminders';
      let bodyParts: string[] = [];
      
      if (autoNotifyClients && pendingClientCount > 0) {
        bodyParts.push(`${pendingClientCount} Clients`);
      }
      if (autoNotifyCarpenters && responseNeededCarpenters > 0) {
        bodyParts.push(`${responseNeededCarpenters} Carpenters`);
      }
      if (autoNotifyInteriors && responseNeededInteriors > 0) {
        bodyParts.push(`${responseNeededInteriors} Interiors`);
      }

      if (bodyParts.length > 0) {
        sendLocalNotification(
          title,
          `📝 Pending updates: ${bodyParts.join(', ')}. Tap to view lists offline!`,
          1000
        );
        sessionStorage.setItem('vanmply_notify_session_sent', 'true');
      }
    }, 4500); // 4.5 second delay for smooth startup experience

    return () => clearTimeout(timer);
  }, [notificationPermission, visits, autoNotifyClients, autoNotifyCarpenters, autoNotifyInteriors]);

  const startNotificationTest = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted ? 'granted' : 'denied');
    
    if (!granted) {
      onTriggerToast?.("⚠️ Notification permissions are blocked. Please enable notices in your device options.", 'info');
      return;
    }

    setTestCountdown(3);
    const interval = setInterval(() => {
      setTestCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Trigger verification local notification
          sendLocalNotification(
            "🔔 Sales Tracker: Offline Reminders Live!",
            "Your offline notifications are working perfectly on this phone! 👍",
            500
          );
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFollowupInteraction = (item: any, source: 'Call' | 'WhatsApp') => {
    const identifier = item.mobile && item.mobile !== '0000000000' ? item.mobile : item.name;
    const role = activeFollowupSubTab;
    const key = `${identifier}_${role}`;
    
    // Calculate snooze date: 4 days from now
    const d = new Date();
    d.setDate(d.getDate() + 4);
    const snoozeUntil = d.toISOString();
    
    const updatedSnoozes = { ...snoozedFollowups, [key]: snoozeUntil };
    setSnoozedFollowups(updatedSnoozes);
    localStorage.setItem('fieldconnect_followup_snooze', JSON.stringify(updatedSnoozes));

    // Display a toast/alert notifying the user of this action
    const displayRole = role === 'client' ? 'Client' 
                     : role === 'carpenter' ? 'Carpenter' 
                     : role === 'interior' ? 'Interior Designer' 
                     : role === 'architect' ? 'Architect' 
                     : 'Builder';
                     
    // Format the date 4 days from now nicely (e.g. DD/MM/YYYY)
    const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    
    onTriggerToast?.(`📢 Follow-up marked complete for ${displayRole}: ${item.name}!`, 'success');
  };
  
  // Reports view internal state filters
  const [reportStageFilter, setReportStageFilter] = useState<string>('all');
  const [reportLeadFilter, setReportLeadFilter] = useState<'all' | 'hot' | 'cold'>('all');

  const [whatsappTemplate] = useState<string>(
    "hello [Client] garu,i recently visited your site, work progress is good 👍.thank you sir."
  );

  const [partnerWhatsappTemplate] = useState<string>(
    "hello [Partner] garu,how are you.projects going well, Regards"
  );

  // Simple stub mock states for compatibility if they are referenced anywhere
  const completedFollowups: Record<string, any> = {};
  const markFollowUpComplete = () => {};
  const undoFollowUp = () => {};

  const getDaysElapsed = (dateStr: string) => {
    if (!dateStr) return 0;
    const vDate = new Date(dateStr);
    const refDate = new Date(todayStr); // '2026-05-28'
    vDate.setHours(0,0,0,0);
    refDate.setHours(0,0,0,0);
    const diffTime = refDate.getTime() - vDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleCopyImageToClipboard = async (base64Data: string, clientName: string) => {
    try {
      // Instead of fetch, which can be flaky with large data URLs in some environments,
      // we use an Image load + Canvas approach for both conversion and support.
      const blob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get 2D canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((pngBlob) => {
            if (pngBlob) {
              resolve(pngBlob);
            } else {
              reject(new Error('Canvas conversion returned null blob'));
            }
          }, 'image/png');
        };
        img.onerror = () => {
          reject(new Error('Failed to load image for clipboard conversion'));
        };
        img.src = base64Data;
      });

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ]);
        onTriggerToast?.(`✅ Photo for ${clientName} copied successfully! You can paste directly on WhatsApp.`, 'success');
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${clientName.replace(/\s+/g, '_')}_site_visit.png`;
        link.click();
        URL.revokeObjectURL(link.href);
        onTriggerToast?.(`💾 Photo exported as PNG! Drag and drop this picture into the WhatsApp chat.`, 'info');
      }
    } catch (err) {
      console.error("Clipboard copy error: ", err);
      const link = document.createElement('a');
      link.href = base64Data;
      link.download = `${clientName.replace(/\s+/g, '_')}_site_visit.png`;
      link.click();
      onTriggerToast?.(`💾 Downloaded photo as fallback due to clipboard restrictions.`, 'info');
    }
  };
  
  // Directory Tab & Filtering State
  const [activeDirTab, setActiveDirTab] = useState<'customers' | 'carpenters' | 'interiors' | 'architects' | 'builders'>('customers');
  const [dirSearchQuery, setDirSearchQuery] = useState('');
  const [showCustomersPlaceWise, setShowCustomersPlaceWise] = useState<boolean>(true);
  const [followupGroupMode, setFollowupGroupMode] = useState<'placewise' | 'buildingwise' | 'singlegrid'>('placewise');
  const [dirGroupMode, setDirGroupMode] = useState<'placewise' | 'buildingwise' | 'singlegrid'>('placewise');
  
  // Selected Directory Item details modal state
  const [selectedDirItem, setSelectedDirItem] = useState<{ type: 'customer' | 'carpenter' | 'interior' | 'architect' | 'builder'; data: any } | null>(null);
  const [whatsappSelectModal, setWhatsappSelectModal] = useState<{ phone: string; text: string; name: string } | null>(null);
  
  // Quick Add Modals State
  const [quickAddModal, setQuickAddModal] = useState<'customer' | 'carpenter' | 'interior' | 'architect' | 'builder' | null>(null);
  
  // Form input states
  const [qaName, setQaName] = useState('');
  const [qaMobile, setQaMobile] = useState('');
  const [qaAddress, setQaAddress] = useState('');
  const [qaLocation, setQaLocation] = useState('');
  const [qaClientName, setQaClientName] = useState('');
  const [qaClientMobile, setQaClientMobile] = useState('');
  const [qaCustomerNotAvailable, setQaCustomerNotAvailable] = useState(false);
  const [qaNearestLandmark, setQaNearestLandmark] = useState('');
  const [qaPhoto, setQaPhoto] = useState<string | null>(null);
  const [qaContractorRemarks, setQaContractorRemarks] = useState('');
  const [qaError, setQaError] = useState('');

  // Extract real entities from current DB visit logs to ensure organic integration:
  
  // 1. Customers map
  const customersMap = new Map<string, { name: string; mobile: string; address: string; lastVisitDate: string; id: string; isCompleted?: boolean; buildingType?: string }>();
  visits.forEach(v => {
    if (v.isCompleted) return;
    if (v.clientName && !customersMap.has(v.clientMobile)) {
      customersMap.set(v.clientMobile, {
        name: v.clientName,
        mobile: v.clientMobile,
        address: v.address,
        lastVisitDate: v.visitingDate,
        id: v.id,
        isCompleted: false,
        buildingType: v.buildingType || 'Home'
      });
    }
  });
  const customers = Array.from(customersMap.values());

  // 1b. Completed Customers map
  const completedCustomersMap = new Map<string, { name: string; mobile: string; address: string; lastVisitDate: string; id: string; isCompleted?: boolean; buildingType?: string }>();
  visits.forEach(v => {
    if (v.isCompleted && v.clientName && !completedCustomersMap.has(v.clientMobile)) {
      completedCustomersMap.set(v.clientMobile, {
        name: v.clientName,
        mobile: v.clientMobile,
        address: v.address,
        lastVisitDate: v.visitingDate,
        id: v.id,
        isCompleted: true,
        buildingType: v.buildingType || 'Home'
      });
    }
  });
  const completedCustomers = Array.from(completedCustomersMap.values());

  // 2. Carpenters map
  const carpentersMap = new Map<string, { name: string; mobile: string; clientName: string; address: string; lastVisitDate: string; id: string; photo?: string | null; contractorRemarks?: string; contractorAddress?: string }>();
  visits.forEach(v => {
    if (v.contractorType === 'carpenter' && v.contractorName && !carpentersMap.has(v.contractorMobile)) {
      carpentersMap.set(v.contractorMobile, {
        name: v.contractorName,
        mobile: v.contractorMobile,
        clientName: v.clientName,
        address: v.address || v.contractorAddress || '',
        lastVisitDate: v.visitingDate,
        id: v.id,
        photo: v.photo,
        contractorRemarks: v.contractorRemarks,
        contractorAddress: v.contractorAddress
      });
    }
    if (v.carpenterName && v.carpenterMobile && !carpentersMap.has(v.carpenterMobile)) {
      carpentersMap.set(v.carpenterMobile, {
        name: v.carpenterName,
        mobile: v.carpenterMobile,
        clientName: v.clientName,
        address: v.address || v.carpenterPlace || '',
        lastVisitDate: v.visitingDate,
        id: v.id,
        photo: null,
        contractorRemarks: '',
        contractorAddress: v.carpenterPlace
      });
    }
  });
  const carpenters = Array.from(carpentersMap.values());

  // 3. Interior Designers map
  const interiorsMap = new Map<string, { name: string; mobile: string; clientName: string; address: string; lastVisitDate: string; id: string; photo?: string | null; contractorRemarks?: string; contractorAddress?: string }>();
  visits.forEach(v => {
    if (v.contractorType === 'interior' && v.contractorName && !interiorsMap.has(v.contractorMobile)) {
      interiorsMap.set(v.contractorMobile, {
        name: v.contractorName,
        mobile: v.contractorMobile,
        clientName: v.clientName,
        address: v.address || v.contractorAddress || '',
        lastVisitDate: v.visitingDate,
        id: v.id,
        photo: v.photo,
        contractorRemarks: v.contractorRemarks,
        contractorAddress: v.contractorAddress
      });
    }
    if (v.interiorName && v.interiorMobile && !interiorsMap.has(v.interiorMobile)) {
      interiorsMap.set(v.interiorMobile, {
        name: v.interiorName,
        mobile: v.interiorMobile,
        clientName: v.clientName,
        address: v.address || v.interiorPlace || '',
        lastVisitDate: v.visitingDate,
        id: v.id,
        photo: null,
        contractorRemarks: '',
        contractorAddress: v.interiorPlace
      });
    }
  });
  const interiors = Array.from(interiorsMap.values());

  // 4. Architects map
  const architectsMap = new Map<string, { name: string; mobile: string; clientName: string; address: string; lastVisitDate: string; id: string; photo?: string | null; contractorRemarks?: string; contractorAddress?: string }>();
  visits.forEach(v => {
    if (v.contractorType === 'architect' && v.contractorName && !architectsMap.has(v.contractorMobile)) {
      architectsMap.set(v.contractorMobile, {
        name: v.contractorName,
        mobile: v.contractorMobile,
        clientName: v.clientName,
        address: v.address || v.contractorAddress || '',
        lastVisitDate: v.visitingDate,
        id: v.id,
        photo: v.photo,
        contractorRemarks: v.contractorRemarks,
        contractorAddress: v.contractorAddress
      });
    }
    if (v.architectName && v.architectMobile && !architectsMap.has(v.architectMobile)) {
      architectsMap.set(v.architectMobile, {
        name: v.architectName,
        mobile: v.architectMobile,
        clientName: v.clientName,
        address: v.address || v.architectPlace || '',
        lastVisitDate: v.visitingDate,
        id: v.id,
        photo: null,
        contractorRemarks: '',
        contractorAddress: v.architectPlace
      });
    }
  });
  const architects = Array.from(architectsMap.values());

  // 5. Builders map
  const buildersMap = new Map<string, { name: string; mobile: string; clientName: string; address: string; lastVisitDate: string; id: string; photo?: string | null; contractorRemarks?: string; contractorAddress?: string }>();
  visits.forEach(v => {
    if (v.contractorType === 'builder' && v.contractorName && !buildersMap.has(v.contractorMobile)) {
      buildersMap.set(v.contractorMobile, {
        name: v.contractorName,
        mobile: v.contractorMobile,
        clientName: v.clientName,
        address: v.address || v.contractorAddress || '',
        lastVisitDate: v.visitingDate,
        id: v.id,
        photo: v.photo,
        contractorRemarks: v.contractorRemarks,
        contractorAddress: v.contractorAddress
      });
    }
    if (v.builderName && v.builderMobile && !buildersMap.has(v.builderMobile)) {
      buildersMap.set(v.builderMobile, {
        name: v.builderName,
        mobile: v.builderMobile,
        clientName: v.clientName,
        address: v.address || v.builderPlace || '',
        lastVisitDate: v.visitingDate,
        id: v.id,
        photo: null,
        contractorRemarks: '',
        contractorAddress: v.builderPlace
      });
    }
  });
  const builders = Array.from(buildersMap.values());

  // Helper for determining human-friendly place of visit is changed to purely return the location name for location-wise grouping
  const getPlaceName = React.useCallback((v: SiteVisit) => {
    return v.address?.trim() || v.location?.trim() || 'No Location Name';
  }, []);

  // Simple unique Places summary dataset
  const uniquePlacesList = React.useMemo(() => {
    const placeMap: Record<string, { placeName: string; clientCount: number; carpenterCount: number; interiorCount: number; visits: SiteVisit[] }> = {};
    
    visits.forEach(v => {
      const placeName = getPlaceName(v);
      if (!placeMap[placeName]) {
        placeMap[placeName] = {
          placeName,
          clientCount: 0,
          carpenterCount: 0,
          interiorCount: 0,
          visits: []
        };
      }
      
      placeMap[placeName].visits.push(v);
      placeMap[placeName].clientCount += 1;
      
      if (v.carpenterName || v.carpenterMobile) {
        placeMap[placeName].carpenterCount += 1;
      }
      
      if (v.interiorName || v.interiorMobile) {
        placeMap[placeName].interiorCount += 1;
      }
    });

    let list = Object.values(placeMap);

    if (placesSearchQuery) {
      const query = placesSearchQuery.toLowerCase();
      list = list.filter(p => 
        p.placeName.toLowerCase().includes(query) || 
        p.visits.some(v => 
          v.clientName.toLowerCase().includes(query) || 
          (v.address && v.address.toLowerCase().includes(query))
        )
      );
    }

    return list;
  }, [visits, placesSearchQuery, getPlaceName]);

  // Simple follow-up count badge logic: count only visits with a manually-set nextFollowUpDate
  const totalRemindersCount = visits.filter(v => v.nextFollowUpDate).length;

  // Dynamic duplicate check for Quick Add Panel
  const qaDuplicates = React.useMemo(() => {
    if (!visits || !quickAddModal) return [];
    
    const results: Array<{ visit: SiteVisit; reasons: string[] }> = [];
    const cleanMobile = qaMobile?.trim().replace(/\D/g, '') || '';

    visits.forEach(v => {
      const reasons: string[] = [];

      // Check Mobile
      if (cleanMobile.length >= 5) {
        // If Quick Add matches on Mobile for Carpenter / Interior / Architect or Client
        const targetMobile = (quickAddModal === 'customer') ? v.clientMobile : (quickAddModal === 'carpenter' && v.contractorType === 'carpenter') ? v.contractorMobile : (quickAddModal === 'interior' && v.contractorType === 'interior') ? v.contractorMobile : (quickAddModal === 'architect' && v.contractorType === 'architect') ? v.contractorMobile : '';
        const vMobile = targetMobile?.trim().replace(/\D/g, '') || '';
        if (vMobile && (vMobile === cleanMobile || (cleanMobile.length >= 10 && vMobile.endsWith(cleanMobile)) || (vMobile.length >= 10 && cleanMobile.endsWith(vMobile)))) {
          reasons.push('Mobile Matches');
        }
      }

      if (reasons.length > 0) {
        results.push({ visit: v, reasons });
      }
    });

    return results;
  }, [visits, quickAddModal, qaMobile]);

  // Compute suggestions for existing contractors inside Quick Add
  const qaContractorSuggestions = React.useMemo(() => {
    if (quickAddModal !== 'carpenter' && quickAddModal !== 'interior' && quickAddModal !== 'architect') return [];
    const cleanName = qaName.trim().toLowerCase();
    const cleanMobile = qaMobile.trim().replace(/\D/g, '');
    if (cleanName.length < 2 && cleanMobile.length < 3) return [];

    const list = quickAddModal === 'carpenter' ? carpenters : quickAddModal === 'architect' ? architects : interiors;
    return list.filter(item => {
      const mName = cleanName ? item.name.toLowerCase().includes(cleanName) : false;
      const mMobile = cleanMobile ? item.mobile.replace(/\D/g, '').includes(cleanMobile) : false;
      return mName || mMobile;
    });
  }, [quickAddModal, qaName, qaMobile, carpenters, architects, interiors]);

  const closeAndResetQuickAdd = () => {
    setQuickAddModal(null);
    setQaName('');
    setQaMobile('');
    setQaAddress('');
    setQaLocation('');
    setQaClientName('');
    setQaClientMobile('');
    setQaCustomerNotAvailable(false);
    setQaNearestLandmark('');
    setQaPhoto(null);
    setQaContractorRemarks('');
    setQaError('');
  };

  // Submit Quick Form
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isCustomerAbsent = quickAddModal === 'customer' && qaCustomerNotAvailable;

    if (!isCustomerAbsent) {
      if (!qaName.trim()) {
        setQaError('Name is required');
        return;
      }
      if (!qaMobile.trim()) {
        setQaError('Contact number is required');
        return;
      }
      if (!/^\+?[0-9\s-]{10,15}$/.test(qaMobile.trim().replace(/\s+/g, ''))) {
        setQaError('Please enter a valid mobile number (at least 10 digits)');
        return;
      }
    }

    let visitData: Omit<SiteVisit, 'id' | 'createdAt'>;

    if (quickAddModal === 'customer') {
      if (!qaAddress.trim()) {
        setQaError('Place is required');
        return;
      }
      if (qaCustomerNotAvailable) {
        if (!qaPhoto) {
          setQaError('📸 A snapped photo is required when the customer is not available, to aid revisiting.');
          return;
        }
        if (!qaNearestLandmark.trim()) {
          setQaError('📍 Nearest Landmark is required when the customer is not available, to assist in future revisits.');
          return;
        }
      }

      visitData = {
        clientName: qaName.trim() || 'Client (Absent Visit)',
        clientMobile: qaMobile.trim() || '0000000000',
        address: qaAddress.trim(),
        location: qaLocation.trim(),
        latitude: null,
        longitude: null,
        photo: qaPhoto,
        video: null,
        contractorType: 'none',
        contractorName: '',
        contractorMobile: '',
        visitingDate: new Date().toISOString().split('T')[0],
        buildingStatus: 'Excavation & Footing',
        leadStatus: 'cold',
        customerNotAvailable: qaCustomerNotAvailable,
        nearestLandmark: qaNearestLandmark.trim() || undefined,
        notes: 'Quick customer record logged from homepage connections.'
      };
    } else if (quickAddModal === 'carpenter') {
      visitData = {
        clientName: `Site Partner: ${qaName.trim()}`,
        clientMobile: '0000000000',
        address: '',
        location: '',
        latitude: null,
        longitude: null,
        photo: null,
        video: null,
        contractorType: 'carpenter',
        contractorName: qaName.trim(),
        contractorMobile: qaMobile.trim(),
        contractorRemarks: qaContractorRemarks.trim() || undefined,
        contractorAddress: qaAddress.trim() || undefined,
        visitingDate: new Date().toISOString().split('T')[0],
        buildingStatus: 'Woodwork & Carpentry',
        leadStatus: 'cold',
        notes: 'Quick carpenter partner recorded from directory.'
      };
    } else if (quickAddModal === 'architect') {
      visitData = {
        clientName: `Architect Partner: ${qaName.trim()}`,
        clientMobile: '0000000000',
        address: '',
        location: '',
        latitude: null,
        longitude: null,
        photo: null,
        video: null,
        contractorType: 'architect',
        contractorName: qaName.trim(),
        contractorMobile: qaMobile.trim(),
        contractorRemarks: qaContractorRemarks.trim() || undefined,
        contractorAddress: qaAddress.trim() || undefined,
        visitingDate: new Date().toISOString().split('T')[0],
        buildingStatus: 'Planning & Designing',
        leadStatus: 'cold',
        notes: 'Quick architect partner recorded from directory.'
      };
    } else { // interior
      visitData = {
        clientName: `Design Partner: ${qaName.trim()}`,
        clientMobile: '0000000000',
        address: '',
        location: '',
        latitude: null,
        longitude: null,
        photo: null,
        video: null,
        contractorType: 'interior',
        contractorName: qaName.trim(),
        contractorMobile: qaMobile.trim(),
        contractorRemarks: qaContractorRemarks.trim() || undefined,
        contractorAddress: qaAddress.trim() || undefined,
        visitingDate: new Date().toISOString().split('T')[0],
        buildingStatus: 'Interior Designing',
        leadStatus: 'cold',
        notes: 'Quick interior designer partner recorded from directory.'
      };
    }

    if (onQuickSave) {
      onQuickSave(visitData);
    }

    closeAndResetQuickAdd();
  };
  
  // Dynamic stats calculation (only customer present and customer absent site visits - excluding completed sites)
  const clientSiteVisits = visits.filter(v => (v.contractorType === 'none' || !v.contractorType) && !v.isCompleted);
  const totalVisits = clientSiteVisits.length;
  
  const hotLeads = clientSiteVisits.filter(v => v.leadStatus === 'hot').length;
  const coldLeads = clientSiteVisits.filter(v => v.leadStatus === 'cold').length;
  
  const visitsToday = clientSiteVisits.filter(v => v.visitingDate === todayStr).length;
  
  // Calculate visits in the last 7 days from today
  const visitsThisWeek = clientSiteVisits.filter(v => {
    const vDate = new Date(v.visitingDate);
    const referenceDate = new Date(todayStr);
    const diffTime = Math.abs(referenceDate.getTime() - vDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }).length;

  // Daily target is 5 visits
  const dailyTarget = 5;
  const targetPercentage = Math.min(Math.round((visitsToday / dailyTarget) * 100), 100);

  // Calculate hot percentage
  const hotPercentage = totalVisits > 0 ? Math.round((hotLeads / totalVisits) * 100) : 0;

  // Generate active client list using unique client mobiles, tracking their latest visit
  const activeProjectsMap = new Map<string, SiteVisit>();
  [...clientSiteVisits]
    .sort((a, b) => new Date(a.visitingDate).getTime() - new Date(b.visitingDate).getTime())
    .forEach(v => {
      activeProjectsMap.set(v.clientMobile, v);
    });
  const activeProjectsList = Array.from(activeProjectsMap.values());

  const stageCounts: { [key: string]: number } = {
    'Excavation & Footing': 0,
    'Brickwork & Masonry': 0,
    'Plastering & Wiring': 0,
    'Flooring & Tiling': 0,
    'Woodwork & Carpentry': 0,
    'Interior Designing': 0,
    'Finished & Handover': 0,
  };
  activeProjectsList.forEach(p => {
    if (stageCounts[p.buildingStatus] !== undefined) {
      stageCounts[p.buildingStatus]++;
    }
  });

  const totalCarpentersCount = new Set(visits.filter(v => v.contractorType === 'carpenter' && v.contractorMobile).map(v => v.contractorMobile)).size;
  const totalInteriorsCount = new Set(visits.filter(v => v.contractorType === 'interior' && v.contractorMobile).map(v => v.contractorMobile)).size;
  const totalArchitectsCount = new Set(visits.filter(v => v.contractorType === 'architect' && v.contractorMobile).map(v => v.contractorMobile)).size;

  const activeHotLeads = activeProjectsList.filter(p => p.leadStatus === 'hot').length;
  const activeColdLeads = activeProjectsList.filter(p => p.leadStatus === 'cold').length;
  const conversionRatePct = activeProjectsList.length > 0 ? Math.round((activeHotLeads / activeProjectsList.length) * 100) : 0;

  // Last 7 days counting
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date(todayStr); // 2026-05-28
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };
  
  const last7DaysList = [6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
    const dStr = getPastDateStr(daysAgo);
    const count = clientSiteVisits.filter(v => v.visitingDate === dStr).length;
    const dateObj = new Date(dStr);
    const label = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { dateStr: dStr, count, label };
  });

  // Today, Week, Month metrics for Customer Visits, Carpenter Meets, Interior Meets
  const todayCust = visits.filter(v => v.visitingDate === todayStr && v.contractorType === 'none').length;
  const todayCarp = visits.filter(v => v.visitingDate === todayStr && v.carpenterName).length;
  const todayInt = visits.filter(v => v.visitingDate === todayStr && v.interiorName).length;

  const weekCust = visits.filter(v => v.contractorType === 'none' && getDaysElapsed(v.visitingDate) >= 0 && getDaysElapsed(v.visitingDate) <= 7).length;
  const weekCarp = visits.filter(v => v.carpenterName && getDaysElapsed(v.visitingDate) >= 0 && getDaysElapsed(v.visitingDate) <= 7).length;
  const weekInt = visits.filter(v => v.interiorName && getDaysElapsed(v.visitingDate) >= 0 && getDaysElapsed(v.visitingDate) <= 7).length;

  const monthCust = visits.filter(v => v.contractorType === 'none' && getDaysElapsed(v.visitingDate) >= 0 && getDaysElapsed(v.visitingDate) <= 30).length;
  const monthCarp = visits.filter(v => v.carpenterName && getDaysElapsed(v.visitingDate) >= 0 && getDaysElapsed(v.visitingDate) <= 30).length;
  const monthInt = visits.filter(v => v.interiorName && getDaysElapsed(v.visitingDate) >= 0 && getDaysElapsed(v.visitingDate) <= 30).length;

  const handleExportCSVReport = () => {
    // Generate headers
    const headers = [
      'Client Name', 
      'Mobile', 
      'Site Address', 
      'Visiting Date', 
      'Construction Stage', 
      'Lead Status', 
      'Contractor Type', 
      'Contractor Name', 
      'Carpenter Name',
      'Carpenter Mobile',
      'Carpenter Place',
      'Interior Designer Partner Name',
      'Interior Designer Mobile',
      'Interior Designer Place',
      'Builder Name',
      'Builder Mobile',
      'Builder Place',
      'Architect Name',
      'Architect Mobile',
      'Architect Place',
      'Notes'
    ];
    const rows = activeProjectsList.map(p => [
      p.clientName,
      p.clientMobile,
      p.address,
      p.visitingDate,
      p.buildingStatus,
      p.leadStatus.toUpperCase(),
      p.contractorType,
      p.contractorName || 'None Assigned',
      p.carpenterName || '',
      p.carpenterMobile || '',
      p.carpenterPlace || '',
      p.interiorName || '',
      p.interiorMobile || '',
      p.interiorPlace || '',
      p.builderName || '',
      p.builderMobile || '',
      p.builderPlace || '',
      p.architectName || '',
      p.architectMobile || '',
      p.architectPlace || '',
      p.notes || ''
    ]);
    
    exportToCsv(`fieldconnect_pro_report_${todayStr}.csv`, headers, rows);
  };

  const getDealerForPlace = (placeStr: string, defaultDealer: string) => {
    const p = (placeStr || '').toLowerCase();
    if (p.includes('tadepalligudem')) return 'NVR PLYWOODS';
    if (p.includes('bhimavaram')) return 'tirumala plywood and hardware';
    if (p.includes('eluru')) return 'srinivasa plywoods';
    return defaultDealer;
  };

  const getCompiledDailyReportText = () => {
    const formattedDate = formatDateToDDMMYYYY(reportDateInput);
    // Remove client absent sites from the day visits
    const dayVisits = visits.filter(v => v.visitingDate === reportDateInput && v.customerNotAvailable !== true);
    
    let text = `DAILY REPORT \n`;
    text += `DATE. ${formattedDate}\n\n`;
    text += `NAME: ${reportUserName}\n`;
    text += `Place:  ${reportPlace || ' '}\n\n`;
    
    const todayDealer = getDealerForPlace(reportPlace, reportDealerSubdealer);
    text += `DEALERS/SUB DEALERS\n${todayDealer || ' '}\n\n`;
    
    // Helper to filter unique entries from a list by phone, to avoid repeating identical contacts
    const getUniqueEntriesByMobile = (allVisits: SiteVisit[], type: 'secondary' | 'carpenter' | 'interior') => {
      const seenMobiles = new Set<string>();
      const list: SiteVisit[] = [];
      const sorted = [...allVisits]
        .filter(v => v.customerNotAvailable !== true) // Client absent sites removed from fallback options too
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      for (const v of sorted) {
        let mobile = '';
        if (type === 'secondary') {
          if (v.contractorType === 'carpenter' || v.contractorType === 'interior') continue;
          mobile = v.clientMobile;
        } else if (type === 'carpenter') {
          if (v.contractorType !== 'carpenter') continue;
          mobile = v.contractorMobile || v.clientMobile;
        } else if (type === 'interior') {
          if (v.contractorType !== 'interior' && v.contractorType !== 'architect') continue;
          mobile = v.contractorMobile || v.clientMobile;
        }
        
        if (mobile && mobile !== '0000000000' && !seenMobiles.has(mobile)) {
          seenMobiles.add(mobile);
          list.push(v);
        }
      }
      return list;
    };

    // 1. SECONDARY CUSTOMERS: present day customers, if less than 6, fill using fallbacks. Limit 5-6.
    text += `SECONDARY  CUSTOMER.\n\n`;
    
    // Filter today's customers (no contractor assigned)
    const daySecondaryCustomers = dayVisits.filter(v => 
      (v.contractorType === 'none' || !v.contractorType)
    );

    // Prioritize those with mobile numbers
    const sortedDaySecondary = [...daySecondaryCustomers].sort((a, b) => {
      const hasMobileA = a.clientMobile && a.clientMobile !== '0000000000';
      const hasMobileB = b.clientMobile && b.clientMobile !== '0000000000';
      if (hasMobileA && !hasMobileB) return -1;
      if (!hasMobileA && hasMobileB) return 1;
      return 0;
    });

    let finalList = sortedDaySecondary.slice(0, 6);
    const seenMobilesInReport = new Set(finalList.map(v => v.clientMobile).filter(m => m && m !== '0000000000'));

    // If less than 6, add fallbacks from historical visits
    if (finalList.length < 6) {
      const fallbackSecondary = getUniqueEntriesByMobile(visits, 'secondary');
      
      // Filter out already included ones
      const filteredFallback = fallbackSecondary.filter(v => 
        !seenMobilesInReport.has(v.clientMobile) && 
        !finalList.some(existing => existing.id === v.id)
      );

      // Sort fallback by priority (mobile then place/address)
      const sortedFallback = [...filteredFallback].sort((a, b) => {
        const hasMobileA = a.clientMobile && a.clientMobile !== '0000000000';
        const hasMobileB = b.clientMobile && b.clientMobile !== '0000000000';
        if (hasMobileA && !hasMobileB) return -1;
        if (!hasMobileA && hasMobileB) return 1;
        
        // Address proximity fallback
        if (reportPlace) {
          const lowerPlace = reportPlace.toLowerCase().trim();
          const hasA = (a.address || a.location || '').toLowerCase().includes(lowerPlace);
          const hasB = (b.address || b.location || '').toLowerCase().includes(lowerPlace);
          if (hasA && !hasB) return -1;
          if (!hasA && hasB) return 1;
        }
        return 0;
      });

      for (const v of sortedFallback) {
        if (finalList.length >= 6) break;
        finalList.push(v);
      }
    }

    if (finalList.length === 0) {
      text += `No follow-up records found.\n\n`;
    } else {
      finalList.forEach((v, index) => {
        let baseName = v.clientName.replace(/\s+garu\b/gi, '').replace(/\s*\(owner\)/gi, '').trim();
        const name = `${baseName} garu (owner)`;
        const mobile = (v.clientMobile && v.clientMobile !== '0000000000') ? v.clientMobile : (v.address || v.location || 'Place of Work');
        text += `${index + 1}.${name}, ${mobile},\ni explained the product details and he/she said I will call you\n\n`;
      });
    }

    // 2. CARPENTERS: same logic as secondary customers (5-6 members)
    text += `CARPENTER/CONTRACTOR \n\n`;
    const dayCarpenters = dayVisits.filter(v => v.contractorType === 'carpenter');
    
    const sortedDayCarp = [...dayCarpenters].sort((a, b) => {
      const mobileA = a.contractorMobile || a.clientMobile;
      const mobileB = b.contractorMobile || b.clientMobile;
      const hasMobileA = mobileA && mobileA !== '0000000000';
      const hasMobileB = mobileB && mobileB !== '0000000000';
      if (hasMobileA && !hasMobileB) return -1;
      if (!hasMobileA && hasMobileB) return 1;
      return 0;
    });

    let finalCarpList = sortedDayCarp.slice(0, 6);
    const seenCarpMobiles = new Set(finalCarpList.map(v => v.contractorMobile || v.clientMobile).filter(m => m && m !== '0000000000'));

    if (finalCarpList.length < 6) {
      const fallbackCarpenters = getUniqueEntriesByMobile(visits, 'carpenter');
      const filteredFallbackCarp = fallbackCarpenters.filter(v => {
        const m = v.contractorMobile || v.clientMobile;
        return !seenCarpMobiles.has(m) && !finalCarpList.some(existing => existing.id === v.id);
      });

      const sortedFallbackCarp = [...filteredFallbackCarp].sort((a, b) => {
        const mobileA = a.contractorMobile || a.clientMobile;
        const mobileB = b.contractorMobile || b.clientMobile;
        const hasMobileA = mobileA && mobileA !== '0000000000';
        const hasMobileB = mobileB && mobileB !== '0000000000';
        if (hasMobileA && !hasMobileB) return -1;
        if (!hasMobileA && hasMobileB) return 1;
        return 0;
      });

      for (const v of sortedFallbackCarp) {
        if (finalCarpList.length >= 6) break;
        finalCarpList.push(v);
      }
    }

    if (finalCarpList.length === 0) {
      text += `No follow-up records found.\n\n`;
    } else {
      finalCarpList.forEach((v, index) => {
        let baseName = (v.contractorName || v.clientName).replace(/\s+garu\b/gi, '').trim();
        const name = `${baseName} garu`;
        const mobile = (v.contractorMobile && v.contractorMobile !== '0000000000') ? v.contractorMobile : 
                      (v.clientMobile && v.clientMobile !== '0000000000') ? v.clientMobile :
                      (v.address || v.location || 'Place of Work');
        text += `${index + 1}.${name}, ${mobile},\ni explained the product details and he said i will arrange next project\n\n`;
      });
    }

      // 3. INTERIOR/ARCHITECTS: take visit wise else address wise (Only 1 or 2 members)
    text += `INTERIOR/ARCHITECTS\n\n`;
    const interiorsList = dayVisits.filter(v => (v.contractorType === 'interior' || v.contractorType === 'architect') && (v.contractorMobile || v.clientMobile) && (v.contractorMobile || v.clientMobile) !== '0000000000');
    if (interiorsList.length > 0) {
      const visitWiseInteriors = [...interiorsList]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 2); // Limit to 1 or 2 members
      visitWiseInteriors.forEach((v, index) => {
        let baseName = (v.contractorName || v.clientName).trim();
        const mobile = v.contractorMobile || v.clientMobile;
        text += `${index + 1}.${baseName}, ${mobile},\ni explained the product details and he said i will arrange next project\n\n`;
      });
    } else {
      const fallbackInteriors = getUniqueEntriesByMobile(visits, 'interior');
      const addressWiseFallbackInt = [...fallbackInteriors]
        .sort((a, b) => (a.address || '').localeCompare(b.address || ''))
        .slice(0, 2); // Limit to 1 or 2 members
      
      if (addressWiseFallbackInt.length === 0) {
        text += `No follow-up records found.\n\n`;
      } else {
        addressWiseFallbackInt.forEach((v, index) => {
          let baseName = (v.contractorName || v.clientName).trim();
          const mobile = v.contractorMobile || v.clientMobile;
          text += `${index + 1}.${baseName}, ${mobile},\ni explained the product details and he said i will arrange next project\n\n`;
        });
      }
    }

    text += `*SECONDARY sales TODAY:*(no of pcs): ${reportSecondarySalesToday || ' '}\n\n`;
    text += `CUMULATIVE sale no if pcs for this month :${reportCumulativeSalesMonth || ' '}\n\n`;

    return text;
  };

  const getCompiledPOAReportText = () => {
    const getTomorrowDateFormatted = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        d.setDate(d.getDate() + 1);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return '';
    };

    const tomorrowDate = getTomorrowDateFormatted(reportDateInput);
    const cleanTomorrowPlace = (reportTomorrowWorkAt || '').trim().toLowerCase();

    let tomorrowCarpenters = carpenters.filter(c => {
      if (!cleanTomorrowPlace) return false;
      if (!c.mobile || c.mobile === '0000000000') return false;
      const addressStr = (c.contractorAddress || c.address || '').toLowerCase();
      const nameStr = c.name.toLowerCase();
      return addressStr.includes(cleanTomorrowPlace) || nameStr.includes(cleanTomorrowPlace);
    });

    if (tomorrowCarpenters.length < 3) {
      const otherCarpenters = carpenters.filter(c => !tomorrowCarpenters.some(tc => tc.mobile === c.mobile) && c.mobile && c.mobile !== '0000000000');
      tomorrowCarpenters = [...tomorrowCarpenters, ...otherCarpenters].slice(0, 3);
    } else {
      tomorrowCarpenters = tomorrowCarpenters.slice(0, 3);
    }

    let tomorrowClients = customers.filter(c => {
      if (!cleanTomorrowPlace) return false;
      if (!c.mobile || c.mobile === '0000000000') return false;
      const addressStr = (c.address || '').toLowerCase();
      const nameStr = c.name.toLowerCase();
      return addressStr.includes(cleanTomorrowPlace) || nameStr.includes(cleanTomorrowPlace);
    });

    if (tomorrowClients.length < 2) {
      const otherClients = customers.filter(c => !tomorrowClients.some(tc => tc.mobile === c.mobile) && c.mobile && c.mobile !== '0000000000');
      tomorrowClients = [...tomorrowClients, ...otherClients].slice(0, 2);
    } else {
      tomorrowClients = tomorrowClients.slice(0, 2);
    }

    const carp1 = tomorrowCarpenters[0] ? tomorrowCarpenters[0].name : '';
    const carp2 = tomorrowCarpenters[1] ? tomorrowCarpenters[1].name : '';
    const carp3 = tomorrowCarpenters[2] ? tomorrowCarpenters[2].name : '';

    const client1 = tomorrowClients[0] ? tomorrowClients[0].name : '';
    const client2 = tomorrowClients[1] ? tomorrowClients[1].name : '';

    let text = `*Plan Of Action*\n\n`;
    text += `Date:- ${tomorrowDate}\n \n`;
    text += `Place: ${reportTomorrowWorkAt || ' '}\n\n`;
    text += `POA    \n`;
    text += `.TOUR PROGRAME \n`;
    text += `*Channel Partner*:\n`;
    text += `(1)   \n`;
    text += `(2)\n`;
    text += `3)\n`;
    text += `4)\n`;
    text += `5) \n`;
    text += `(6)\n\n`;
    
    const tomorrowDealer = getDealerForPlace(reportTomorrowWorkAt, reportDealerSubdealer);
    text += `(DEALERS POINT \n`;
    text += `1. ${tomorrowDealer || 'Delear name'}\n`;
    text += `2. \n\n`;
    text += `Contractor/Carpenter* :\n`;
    text += `1. ${carp1 || 'Carpenter name'}\n`;
    text += `2. ${carp2 || ' '}\n`;
    text += `3. ${carp3 || ' '}\n`;
    text += `*Consumer/Site*:- \n`;
    text += `(1) ${client1 || 'Client name'}\n`;
    text += `(2) ${client2 || ' '}\n`;
    text += `(3) \n`;
    text += `(4)\n`;

    return text;
  };

  const getCompiledReportText = () => {
    return getCompiledDailyReportText() + "\n\n" + getCompiledPOAReportText();
  };

  const handleCopyWhatsAppReport = () => {
    const summaryText = `*📋 FIELDCONNECT PRO CRM STATUS REPORT (${todayStr})*
---------------------------------------
*📈 Core Performance Metrics:*
• Unique Client Sites Checked: ${activeProjectsList.length}
• 🔥 Active Hot Leads: ${activeHotLeads} (${conversionRatePct}% conversion pace)
• ❄️ Active Cold Leads: ${activeColdLeads}
• Daily Target Progress: ${visitsToday}/${dailyTarget} visits reached

*⏱️ Chronological Engagement Summary:*
• Today: ${todayCust} Customer Visits, ${todayCarp} Carpenter meets, ${todayInt} Interior meets
• This Week: ${weekCust} Customer Visits, ${weekCarp} Carpenter meets, ${weekInt} Interior meets
• This Month: ${monthCust} Customer Visits, ${monthCarp} Carpenter meets, ${monthInt} Interior meets

*🏗️ Site Build Pipeline Summary:*
• Excavation & Footing: ${stageCounts['Excavation & Footing']} sites
• Brickwork & Masonry: ${stageCounts['Brickwork & Masonry']} sites
• Plastering & Wiring: ${stageCounts['Plastering & Wiring']} sites
• Flooring & Tiling: ${stageCounts['Flooring & Tiling']} sites
• Woodwork & Carpentry: ${stageCounts['Woodwork & Carpentry']} sites
• Interior Designing: ${stageCounts['Interior Designing']} sites
• Finished & Handover: ${stageCounts['Finished & Handover']} sites

*👥 Partner Network Footprint:*
• Unique Carpenter Contractors: ${totalCarpentersCount}
• Unique Interior Designers: ${totalInteriorsCount}
• Unique Architect Partners: ${totalArchitectsCount}

Report generated locally from zone sync.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summaryText);
      onTriggerToast?.('💬 Dynamic report output copied to clipboard! Paste into WhatsApp.', 'success');
    } else {
      onTriggerToast?.('Your browser does not support automatic clipboard copying.', 'info');
    }
  };

  const handleSaveProfileClick = () => {
    if (!profName.trim()) {
      setProfileMessage('❌ Employee Name is required.');
      return;
    }
    const cleanNumber = profMobile.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      setProfileMessage('❌ Please enter a valid 10-digit mobile number.');
      return;
    }

    const updatedUser = {
      name: profName.trim(),
      mobile: cleanNumber,
      zone: currentUser?.zone || 'Central HQ',
      companyName: profCompany.trim()
    };

    if (onUpdateProfile) {
      onUpdateProfile(updatedUser);
    } else {
      localStorage.setItem('fieldconnect_user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    }
    setProfileMessage('✅ Profile settings updated successfully!');
    setTimeout(() => {
      setProfileMessage(null);
    }, 3000);
  };

  const handleSignOutClick = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      localStorage.removeItem('fieldconnect_user');
      window.location.reload();
    }
  };

  const handleMapWhatsApp = (mobile: string, name: string) => {
    const cleanPhone = mobile.replace(/\D/g, '').length === 10 ? '91' + mobile.replace(/\D/g, '') : mobile.replace(/\D/g, '');
    setWhatsappSelectModal({
      phone: cleanPhone,
      text: `Hello ${name} garu, I recently visited your site, work progress is good 👍. Thank you sir.`,
      name: name
    });
  };

  const handleMapViewHistory = (mobile: string) => {
    const cust = customers.find(c => c.mobile === mobile);
    if (cust) {
      setSelectedDirItem({ type: 'customer', data: cust });
    } else {
      const visit = visits.find(v => v.clientMobile === mobile);
      if (visit) {
        setSelectedDirItem({ 
          type: 'customer', 
          data: { 
            name: visit.clientName, 
            mobile: visit.clientMobile, 
            address: visit.address, 
            lastVisitDate: visit.visitingDate, 
            id: visit.id,
            buildingType: visit.buildingType
          } 
        });
      }
    }
  };

  return (
    <div className="space-y-4" id="dashboard-container">

      {/* Sales Welcome & Action banner matching Professional Polish */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-xl p-4 md:p-5 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden border border-indigo-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 to-transparent pointer-events-none" />
        <div className="space-y-1 relative z-10">
          {!isOnline && unsyncedCount > 50 && (
            <div className="bg-red-600 text-white p-3 rounded-lg mb-3 font-bold text-xs border border-red-500 animate-pulse">
              ⚠️ WARNING: Offline mode with {unsyncedCount} unsynced records! Connect to internet to sync data and prevent loss.
            </div>
          )}
          <span className="bg-white/10 text-indigo-250 font-mono text-[8px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded border border-white/15">
            Cloud Sync Status: {isOnline ? 'Active' : 'Offline'}
          </span>
          <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white m-0">
            Field Workspace Dashboard
          </h1>
          <p className="text-indigo-100 text-[11px] md:text-xs max-w-lg leading-relaxed opacity-90">
            Boost client conversion metrics. Capture photographs, GPS geographical offsets, contact logs, and follow-ups.
          </p>
        </div>
        <button
          onClick={onAddNewVisit}
          className="bg-indigo-600 hover:bg-indigo-505 text-white text-[11px] font-bold uppercase tracking-wider py-2.5 px-4.5 rounded-lg shadow-md shadow-indigo-950/40 transition duration-200 flex-shrink-0 relative z-10 active:scale-98 border border-indigo-400/20 cursor-pointer"
          id="btn-goto-new-visit"
        >
          + Record New Site Location
        </button>
      </div>

      {/* Home Page Sub-Navigation Options for Follow-Ups & Analytics Reports arranged Grid Wise */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm" id="homepage-options-navbar">
        <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-3">
          <button
            onClick={() => setActiveHomeTab('overview')}
            className={`p-3 rounded-xl text-[10px] font-extrabold flex flex-col items-center justify-center gap-2 transition cursor-pointer font-sans border ${
              activeHomeTab === 'overview'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-white hover:border-indigo-200'
            }`}
            id="opt-tab-overview"
          >
            <Compass size={18} />
            <span className="text-center">Overview</span>
          </button>

          <button
            onClick={() => setActiveHomeTab('map')}
            className={`p-3 rounded-xl text-[10px] font-extrabold flex flex-col items-center justify-center gap-2 transition cursor-pointer font-sans border ${
              activeHomeTab === 'map'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-white hover:border-indigo-200'
            }`}
            id="opt-tab-map"
          >
            <MapIcon size={18} className={activeHomeTab === 'map' ? 'text-white' : 'text-blue-500'} />
            <span className="text-center">Site Map</span>
          </button>

          <button
            onClick={() => setActiveHomeTab('reports')}
            className={`p-3 rounded-xl text-[10px] font-extrabold flex flex-col items-center justify-center gap-2 transition cursor-pointer font-sans border ${
              activeHomeTab === 'reports'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-white hover:border-indigo-200'
            }`}
            id="opt-tab-reports"
          >
            <BarChart4 size={18} />
            <span className="text-center">Reports</span>
          </button>

          <button
            onClick={() => setActiveHomeTab('absent')}
            className={`p-3 rounded-xl text-[10px] font-extrabold flex flex-col items-center justify-center gap-2 transition cursor-pointer font-sans border relative ${
              activeHomeTab === 'absent'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-white hover:border-indigo-200'
            }`}
            id="opt-tab-absent"
          >
            <UserX size={18} className={activeHomeTab === 'absent' ? 'text-white' : 'text-rose-600'} />
            <span className="text-center">Absent</span>
            {visits.filter(v => v.customerNotAvailable).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm">
                {visits.filter(v => v.customerNotAvailable).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveHomeTab('dealers')}
            className={`p-3 rounded-xl text-[10px] font-extrabold flex flex-col items-center justify-center gap-2 transition cursor-pointer font-sans border relative ${
              activeHomeTab === 'dealers'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-white hover:border-indigo-200'
            }`}
            id="opt-tab-dealers"
          >
            <Building2 size={18} className={activeHomeTab === 'dealers' ? 'text-white' : 'text-amber-500'} />
            <span className="text-center">Dealers</span>
            {dealers.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                {dealers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveHomeTab('partners')}
            className={`p-3 rounded-xl text-[10px] font-extrabold flex flex-col items-center justify-center gap-2 transition cursor-pointer font-sans border relative ${
              activeHomeTab === 'partners'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-white hover:border-indigo-200'
            }`}
            id="opt-tab-partners"
          >
            <UserPlus size={18} className={activeHomeTab === 'partners' ? 'text-white' : 'text-pink-500'} />
            <span className="text-center">Partners</span>
          </button>

          <button
            onClick={() => setActiveHomeTab('completed')}
            className={`p-3 rounded-xl text-[10px] font-extrabold flex flex-col items-center justify-center gap-2 transition cursor-pointer font-sans border ${
              activeHomeTab === 'completed'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-white hover:border-indigo-200'
            }`}
            id="opt-tab-completed"
          >
            <CheckSquare size={18} className={activeHomeTab === 'completed' ? 'text-white' : 'text-emerald-500'} />
            <span className="text-center">Done</span>
          </button>

          <button
            onClick={() => setActiveHomeTab('call')}
            className={`p-3 rounded-xl text-[10px] font-extrabold flex flex-col items-center justify-center gap-2 transition cursor-pointer font-sans border ${
              activeHomeTab === 'call'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-white hover:border-indigo-200'
            }`}
            id="opt-tab-call"
          >
            <Phone size={18} className={activeHomeTab === 'call' ? 'text-white' : 'text-indigo-500'} />
            <span className="text-center">Follow Up</span>
          </button>
        </div>
      </div>

        {/* Dynamic workspace status message */}
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 font-mono tracking-wider px-1 uppercase justify-center sm:justify-start">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping"></span>
          <span>Field Sync ({visits.length} logs)</span>
        </div>

      {activeHomeTab === 'overview' && (
        <>
          {/* KPI Stats Widgets Grid */}
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="stats-widgets">
            {/* Total Visits widget */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex items-center justify-between transition hover:shadow-md hover:border-slate-300 interactive-highlight">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider font-mono">Total Sites Visited</span>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">{totalVisits}</div>
                <p className="text-[9px] text-slate-500 font-sans">Indexed locally</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 border border-indigo-100 shrink-0 ml-1">
                <Briefcase size={14} className="sm:size-[16px]" />
              </div>
            </div>

            {/* Hot Leads widget */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex items-center justify-between transition hover:shadow-md hover:border-slate-300 interactive-highlight">
              <div className="space-y-0.5">
                <span className="text-[9px] text-orange-600 font-bold uppercase tracking-wider font-mono">🔥 Hot Leads</span>
                <div className="text-xl sm:text-2xl font-extrabold text-orange-600 font-display">{hotLeads}</div>
                <p className="text-[9px] text-slate-500 font-sans">{hotPercentage}% interaction rate</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-700 border border-orange-100 shrink-0 ml-1">
                <Flame size={14} className="sm:size-[16px] fill-orange-100" />
              </div>
            </div>

            {/* Cold Leads widget */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex items-center justify-between transition hover:shadow-md hover:border-slate-300 interactive-highlight">
              <div className="space-y-0.5">
                <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider font-mono">❄️ Cold Leads</span>
                <div className="text-xl sm:text-2xl font-extrabold text-indigo-600 font-display">{coldLeads}</div>
                <p className="text-[9px] text-slate-500 font-sans">{totalVisits - hotLeads} pending follow-up</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 border border-indigo-100 shrink-0 ml-1">
                <Snowflake size={14} className="sm:size-[16px]" />
              </div>
            </div>

            {/* Visits Today goal tracking widget */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex items-center justify-between transition hover:shadow-md hover:border-slate-300 interactive-highlight">
              <div className="space-y-0.5 flex-1">
                <span className="text-[9px] text-teal-600 font-bold uppercase tracking-wider font-mono">Visits Today</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">{visitsToday}</span>
                  <span className="text-[10px] text-slate-500 font-mono">/ {dailyTarget} goal</span>
                </div>
                {/* simple micro progress bar */}
                <div className="w-full bg-slate-100 h-1 rounded-full mt-1 overflow-hidden border border-slate-200">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${targetPercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 border border-teal-100 shrink-0 ml-3">
                <Target size={16} className="sm:size-[18px]" />
              </div>
            </div>
          </div>

          {/* Special Customer Not Available Alert Banner on Overview */}
          {visits.filter(v => v.customerNotAvailable).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3 mt-4" 
              id="alert-unattended-customers"
            >
              <span className="text-lg">⚠️</span>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-orange-900 uppercase tracking-wider font-mono">
                  🚨 Client Absence Warning
                </h4>
                <p className="text-xs text-orange-800 leading-relaxed font-sans">
                  You have logged <strong>{visits.filter(v => v.customerNotAvailable).length} site visit(s)</strong> where the customer was <strong>absent or unavailable</strong>. Please prioritize calls or WhatsApp connections under your Follow-Up Reminders tab to coordinate project progress.
                </p>
              </div>
            </motion.div>
          )}
        </>
      )}

      {activeHomeTab === 'map' && (
        <div className="space-y-4 animate-fade-in" id="site-map-view">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-indigo-600 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="space-y-0.5">
                <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                  <MapIcon size={18} />
                  <span>Site Geolocation Intelligence</span>
                </h2>
                <p className="text-[10px] text-indigo-100 font-medium opacity-90">
                  Visualizing client sites across the region with 5km coverage radius analysis
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 p-1 bg-white/10 rounded-xl border border-white/20 mr-2">
                  <button
                    onClick={() => {
                      const next = !isProximityAlertEnabled;
                      setIsProximityAlertEnabled(next);
                      localStorage.setItem('vanmply_proximity_alerts', next.toString());
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 ${
                      isProximityAlertEnabled 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    title="Toggle 100m Proximity Notifications"
                  >
                    <Bell size={12} className={isProximityAlertEnabled ? 'animate-bounce' : ''} />
                    {isProximityAlertEnabled ? 'Alerts ON' : 'Alerts OFF'}
                  </button>
                  
                  {currentDistanceToNearest && isProximityAlertEnabled && (
                    <div className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/10 text-white border border-white/5 flex items-center gap-1.5">
                      <Navigation size={12} className="text-indigo-300" />
                      <span>{currentDistanceToNearest.distance < 1000 ? `${Math.round(currentDistanceToNearest.distance)}m` : `${(currentDistanceToNearest.distance/1000).toFixed(1)}km`} to {currentDistanceToNearest.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="relative h-[650px] w-full">
              <SiteVisitsOSMMap 
                visits={visits.filter(v => !v.isCompleted)} 
                onEditVisit={onEditVisit}
                onCompleteVisit={async (visit) => {
                  if (onToggleCompleteCustomer) {
                    await onToggleCompleteCustomer(visit.clientMobile, true);
                  }
                }}
                onWhatsApp={handleMapWhatsApp}
                onViewHistory={handleMapViewHistory}
              />
            </div>
          </div>
        </div>
      )}

      {activeHomeTab === 'places' && (
        <div className="space-y-6 animate-fade-in" id="places-visit-dashboard">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="space-y-1">
                <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                  <MapPin size={18} className="text-indigo-400" />
                  <span>Geographical Location Summary</span>
                </h2>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest font-mono">
                  Categorizing your {visits.length} site visit logs into {uniquePlacesList.length} unique regions
                </p>
              </div>

              <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search regions..."
                  value={placesSearchQuery}
                  onChange={(e) => setPlacesSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-700 rounded-xl text-xs bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-sans"
                />
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50">
              {uniquePlacesList.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <MapPin size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-bold">No location groupings found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uniquePlacesList.map((place, idx) => (
                    <motion.div
                      key={place.placeName + idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-2xl border border-slate-150 p-4 shadow-sm hover:shadow-md transition group overflow-hidden relative"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition duration-300">
                            <MapPin size={16} />
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-slate-900 truncate max-w-[140px]" title={place.placeName}>
                              {place.placeName}
                            </h3>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                              {place.clientCount} Total Logs
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-[8px] text-slate-400 font-bold uppercase block mb-1 tracking-tighter">Carpenters</span>
                          <span className="text-xs font-black text-slate-800">{place.carpenterCount}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-[8px] text-slate-400 font-bold uppercase block mb-1 tracking-tighter">Interiors</span>
                          <span className="text-xs font-black text-slate-800">{place.interiorCount}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveHomeTab('map');
                          // Logic to center map on first visit of this place could go here if map component supported it
                        }}
                        className="w-full py-2 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition duration-200 border border-indigo-100 shadow-xs"
                      >
                        View on Live Map
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {activeHomeTab === 'followups' && (
        <div className="space-y-6">
          {/* Sub-navigation option switcher */}
          <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl border border-slate-200/85 gap-1.5" id="followup-roles-selector">
            {(['client', 'carpenter', 'interior', 'architect', 'builder'] as const).map((tab) => {
              const label = tab === 'client' ? '👥 Clients'
                : tab === 'carpenter' ? '🪚 Carpenters'
                : tab === 'interior' ? '🎨 Interiors'
                : tab === 'architect' ? '🏢 Architects'
                : '🚜 Builders';
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFollowupSubTab(tab)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition cursor-pointer font-sans whitespace-nowrap ${
                    activeFollowupSubTab === tab
                      ? 'bg-white text-indigo-775 shadow-sm border border-slate-200/20'
                      : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50/50'
                  }`}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Offline Notification Configuration Panel */}
          <div className="bg-gradient-to-br from-indigo-50/80 to-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-2xs" id="offline-notifications-dashboard">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                  <Bell size={16} className={notificationPermission === 'granted' ? "animate-bounce" : ""} />
                </span>
                <div>
                  <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest font-mono">
                    Offline Device Notifications
                  </h3>
                  <p className="text-[10px] text-slate-500 font-sans leading-tight">
                    Receive timely follow-up reminders in your phone's notification shade even when fully offline
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const state = !showNotificationCenter;
                  setShowNotificationCenter(state);
                  localStorage.setItem('vanmply_show_notification_center', String(state));
                }}
                className="px-3 py-1.5 text-[10px] font-bold text-indigo-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition font-mono shadow-3xs self-start sm:self-auto"
              >
                {showNotificationCenter ? 'Hide Settings' : '🔧 Configure Alerts'}
              </button>
            </div>

            {showNotificationCenter && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-slate-200/60 space-y-4 overflow-hidden"
              >
                {/* 1. Device Permission Status Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white border border-slate-200 gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 font-mono block uppercase tracking-wider">
                      Android APK / PWA System Permission
                    </span>
                    <div className="flex items-center gap-1.5">
                      {notificationPermission === 'granted' ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-xs font-bold text-emerald-800">ACTIVE & GRANTED</span>
                        </>
                      ) : notificationPermission === 'denied' ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span className="text-xs font-bold text-rose-800">BLOCKED (Check Device/Browser Settings)</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          <span className="text-xs font-bold text-amber-800">NOT ENABLED YET</span>
                        </>
                      )}
                    </div>
                  </div>

                  {notificationPermission !== 'granted' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const granted = await requestNotificationPermission();
                        setNotificationPermission(granted ? 'granted' : 'denied');
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer"
                    >
                      Grant Phone Permission
                    </button>
                  ) : (
                    <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg font-mono font-bold">
                      ✓ System Link Established
                    </div>
                  )}
                </div>

                {/* 2. Custom Switches to limit alert scope organically */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200/80 p-3 rounded-xl flex items-center justify-between gap-2 shadow-3xs">
                    <div>
                      <span className="text-xs font-bold text-slate-800 font-sans block">Client Follow-Ups</span>
                      <p className="text-[9px] text-slate-400 leading-tight">Notify about client response</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={autoNotifyClients}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setAutoNotifyClients(val);
                          localStorage.setItem('vanmply_notify_clients', String(val));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-305 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-3 rounded-xl flex items-center justify-between gap-2 shadow-3xs">
                    <div>
                      <span className="text-xs font-bold text-slate-800 font-sans block">Carpenter Visits</span>
                      <p className="text-[9px] text-slate-400 leading-tight">Reminders of wood layout design</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={autoNotifyCarpenters}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setAutoNotifyCarpenters(val);
                          localStorage.setItem('vanmply_notify_carpenters', String(val));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-305 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-3 rounded-xl flex items-center justify-between gap-2 shadow-3xs">
                    <div>
                      <span className="text-xs font-bold text-slate-800 font-sans block">Interior Designers</span>
                      <p className="text-[9px] text-slate-400 leading-tight">Notify color/finish reviews</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={autoNotifyInteriors}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setAutoNotifyInteriors(val);
                          localStorage.setItem('vanmply_notify_interiors', String(val));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-305 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                {/* 3. Real Live Test Tool */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 decoration-none">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-indigo-900 font-mono uppercase tracking-wider block">
                      ⚡ Tap to Test Offline Notification Trigger
                    </span>
                    <p className="text-[9px] text-indigo-750 font-sans leading-relaxed">
                      Tap the trigger, then lock your screen or close the screen immediately. A notification reminder will slide into your phone's notification shade after a 3-second simulation delay!
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={testCountdown !== null}
                    onClick={startNotificationTest}
                    className={`px-3.5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-lg border transition ${
                      testCountdown !== null
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-indigo-600 hover:bg-indigo-750 text-white border-indigo-700 shadow-sm cursor-pointer'
                    } shrink-0`}
                  >
                    {testCountdown !== null ? `Ringing in ${testCountdown}s...` : '🔔 Test Alarm'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative my-4">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={14} className="text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search by name or client site..."
              value={followupSearchQuery}
              onChange={(e) => setFollowupSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            />
          </div>

          {/* List Display */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            {activeFollowupSubTab === 'client' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-205 gap-3" id="display-mode-switch-followup">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 text-xs text-center font-bold">🏢</span>
                  <div>
                    <span className="text-xs font-black text-slate-800 font-sans tracking-tight block">Display Grouping</span>
                    <p className="text-[10px] text-slate-500 font-sans leading-none">Group client contacts by their building category or place</p>
                  </div>
                </div>
                <div className="flex flex-wrap bg-slate-200/60 p-0.5 rounded-lg gap-0.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setFollowupGroupMode('placewise');
                      setShowCustomersPlaceWise(true);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                      followupGroupMode === 'placewise'
                        ? 'bg-white text-indigo-750 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    id="btn-followup-display-placewise"
                  >
                    📍 Place-Wise
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFollowupGroupMode('buildingwise');
                      setShowCustomersPlaceWise(false);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                      followupGroupMode === 'buildingwise'
                        ? 'bg-white text-indigo-750 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    id="btn-followup-display-buildingwise"
                  >
                    🏠 Building-Wise
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFollowupGroupMode('singlegrid');
                      setShowCustomersPlaceWise(false);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                      followupGroupMode === 'singlegrid'
                        ? 'bg-white text-indigo-750 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    id="btn-followup-display-singlegrid"
                  >
                    🔲 Single Grid
                  </button>
                </div>
              </div>
            )}

            {(() => {
              let rawData: { name: string; mobile: string; clientName?: string; address?: string; lastVisitDate?: string; buildingType?: string }[] = [];
              if (activeFollowupSubTab === 'client') {
                rawData = Array.from(customersMap.values()).map(c => ({
                  name: c.name,
                  mobile: c.mobile,
                  clientName: c.name,
                  address: c.address,
                  lastVisitDate: c.lastVisitDate,
                  buildingType: c.buildingType
                }));
              } else if (activeFollowupSubTab === 'carpenter') {
                rawData = carpenters;
              } else if (activeFollowupSubTab === 'interior') {
                rawData = interiors;
              } else if (activeFollowupSubTab === 'architect') {
                rawData = architects;
              } else if (activeFollowupSubTab === 'builder') {
                rawData = builders;
              }

              const query = followupSearchQuery.toLowerCase().trim();
              const nowMs = Date.now();
              const filtered = rawData.filter(item => {
                const identifier = item.mobile && item.mobile !== '0000000000' ? item.mobile : item.name;
                const key = `${identifier}_${activeFollowupSubTab}`;
                const snoozeUntil = snoozedFollowups[key];
                if (snoozeUntil && new Date(snoozeUntil).getTime() > nowMs) {
                  return false;
                }
                return item.name.toLowerCase().includes(query) || 
                  (item.clientName || '').toLowerCase().includes(query) ||
                  (item.mobile || '').includes(query);
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-400 font-sans space-y-1">
                    <p className="text-xs font-semibold">No contacts found</p>
                    <p className="text-[10px]">Try searching for something else or register a site visit first.</p>
                  </div>
                );
              }

              if (activeFollowupSubTab === 'client' && followupGroupMode === 'buildingwise') {
                const groupedByBuilding: Record<string, typeof filtered> = {
                  'Home 🏠': [],
                  'Duplex 🏡': [],
                  'Apartment 🏢': [],
                  'Shop 🏬': [],
                  'Other 🏗️': []
                };

                filtered.forEach(item => {
                  const bType = item.buildingType || 'Home';
                  const key = bType === 'Home' ? 'Home 🏠'
                    : bType === 'Duplex' ? 'Duplex 🏡'
                    : bType === 'Apartment' ? 'Apartment 🏢'
                    : bType === 'Shop' ? 'Shop 🏬'
                    : 'Other 🏗️';
                  groupedByBuilding[key].push(item);
                });

                const buildingKeys = Object.keys(groupedByBuilding).filter(k => groupedByBuilding[k].length > 0);

                return (
                  <div className="space-y-6" id="followup-buildingwise-sections">
                    {buildingKeys.map((buildingName, gIdx) => (
                      <div key={`${buildingName}-${gIdx}`} className="space-y-3 bg-slate-50/20 p-4.5 rounded-2xl border border-slate-200/60" id={`followup-building-group-${gIdx}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h3 className="text-sm font-black text-slate-900 font-sans tracking-tight flex items-center gap-1.5">
                            <span>{buildingName}</span>
                            <span className="text-[10px] bg-indigo-100/60 text-indigo-850 px-1.5 py-0.5 rounded font-mono font-bold">
                              {groupedByBuilding[buildingName].length} {groupedByBuilding[buildingName].length === 1 ? 'Customer' : 'Customers'}
                            </span>
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedByBuilding[buildingName].map((item, idx) => {
                            const hasMobile = item.mobile && item.mobile !== '0000000000';
                            const activeDate = item.lastVisitDate ? formatDateToDDMMYYYY(item.lastVisitDate) : '';
                            return (
                              <div key={idx} className="p-4 rounded-xl border border-slate-150 bg-white hover:border-indigo-250 transition-all flex flex-col justify-between space-y-3 shadow-2xs">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-xs font-bold text-slate-800 leading-snug truncate">{item.name}</h4>
                                      <p className="text-[10px] text-slate-500 font-sans truncate" title={item.address}>
                                        📍 {item.address || 'No Address'}
                                      </p>
                                    </div>
                                    <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100/50 shrink-0">
                                      {item.buildingType || 'Home'}
                                    </span>
                                  </div>
                                  {activeDate && (
                                    <p className="text-[9px] text-slate-400 font-mono">
                                      Last Visited: {activeDate}
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  {hasMobile ? (
                                    <a
                                      href={`tel:${item.mobile}`}
                                      onClick={() => handleFollowupInteraction(item, 'Call')}
                                      className="flex-1 py-1.5 px-3 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/50 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
                                    >
                                      <PhoneCall size={10} />
                                      <span>Call</span>
                                    </a>
                                  ) : (
                                    <span className="flex-1 py-1.5 px-3 bg-slate-105 border border-slate-150 text-slate-400 rounded-lg text-[10px] font-bold flex items-center justify-center cursor-not-allowed select-none text-center">
                                      No Phone
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cleanPh = item.mobile.replace(/\D/g, '').length === 10 ? '91' + item.mobile.replace(/\D/g, '') : item.mobile.replace(/\D/g, '');
                                      setWhatsappSelectModal({
                                        phone: cleanPh,
                                        text: activeFollowupSubTab === 'client' 
                                          ? `hello ${item.name} garu,i recently visited your site, work progress is good 👍.thank you sir.`
                                          : `hello ${item.name} garu,how are you.projects going well, Regards`,
                                        name: item.name
                                      });
                                      handleFollowupInteraction(item, 'WhatsApp');
                                    }}
                                    className="flex-1 py-1.5 px-3 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/50 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
                                  >
                                    <MessageCircle size={10} />
                                    <span>WhatsApp</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              if (activeFollowupSubTab === 'client' && followupGroupMode === 'placewise') {
                const grouped: Record<string, typeof filtered> = {};
                filtered.forEach(item => {
                  const pl = (item.address || 'No Address').trim();
                  if (!grouped[pl]) {
                    grouped[pl] = [];
                  }
                  grouped[pl].push(item);
                });

                const sortedPlaces = Object.keys(grouped).sort();

                return (
                  <div className="space-y-6" id="followup-placewise-sections">
                    {sortedPlaces.map((placeName, gIdx) => (
                      <div key={`${placeName}-${gIdx}`} className="space-y-3 bg-slate-50/20 p-4.5 rounded-2xl border border-slate-200/60" id={`followup-place-group-${gIdx}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h3 className="text-sm font-black text-slate-900 font-sans tracking-tight flex items-center gap-1.5">
                            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 text-[10px]">📍</span>
                            <span>{placeName}</span>
                            <span className="text-[10px] bg-indigo-100/60 text-indigo-850 px-1.5 py-0.5 rounded font-mono font-bold">
                              {grouped[placeName].length} {grouped[placeName].length === 1 ? 'Customer' : 'Customers'}
                            </span>
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {grouped[placeName].map((item, idx) => {
                            const hasMobile = item.mobile && item.mobile !== '0000000000';
                            const activeDate = item.lastVisitDate ? formatDateToDDMMYYYY(item.lastVisitDate) : '';
                            return (
                              <div key={idx} className="p-4 rounded-xl border border-slate-150 bg-white hover:border-indigo-250 transition-all flex flex-col justify-between space-y-3 shadow-2xs">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-xs font-bold text-slate-800 leading-snug truncate">{item.name}</h4>
                                      <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/50">
                                        Client
                                      </span>
                                    </div>
                                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100/50 shrink-0">
                                      {item.buildingType || 'Home'}
                                    </span>
                                  </div>
                                  {item.clientName && item.clientName !== item.name && (
                                    <p className="text-[10px] text-slate-550 font-sans">
                                      Site: <strong className="text-slate-705">{item.clientName}</strong>
                                    </p>
                                  )}
                                  {activeDate && (
                                    <p className="text-[9px] text-slate-400 font-mono">
                                      Last Visited: {activeDate}
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  {hasMobile ? (
                                    <a
                                      href={`tel:${item.mobile}`}
                                      onClick={() => handleFollowupInteraction(item, 'Call')}
                                      className="flex-1 py-1.5 px-3 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/50 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
                                    >
                                      <PhoneCall size={10} />
                                      <span>Call</span>
                                    </a>
                                  ) : (
                                    <span className="flex-1 py-1.5 px-3 bg-slate-105 border border-slate-150 text-slate-400 rounded-lg text-[10px] font-bold flex items-center justify-center cursor-not-allowed select-none text-center">
                                      No Phone
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cleanPh = item.mobile.replace(/\D/g, '').length === 10 ? '91' + item.mobile.replace(/\D/g, '') : item.mobile.replace(/\D/g, '');
                                      setWhatsappSelectModal({
                                        phone: cleanPh,
                                        text: activeFollowupSubTab === 'client' 
                                          ? `hello ${item.name} garu,i recently visited your site, work progress is good 👍.thank you sir.`
                                          : `hello ${item.name} garu,how are you.projects going well, Regards`,
                                        name: item.name
                                      });
                                      handleFollowupInteraction(item, 'WhatsApp');
                                    }}
                                    className="flex-1 py-1.5 px-3 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/50 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
                                  >
                                    <MessageCircle size={10} />
                                    <span>WhatsApp</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="followup-singlegrid-view">
                  {filtered.map((item, idx) => {
                    const hasMobile = item.mobile && item.mobile !== '0000000000';
                    const activeDate = item.lastVisitDate ? formatDateToDDMMYYYY(item.lastVisitDate) : '';
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-slate-200/80 transition-all flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-slate-800 leading-snug truncate">{item.name}</h4>
                              <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/50">
                                {activeFollowupSubTab}
                              </span>
                            </div>
                            {item.buildingType && (
                              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100/50 shrink-0">
                                {item.buildingType}
                              </span>
                            )}
                          </div>
                          {item.clientName && item.clientName !== item.name && (
                            <p className="text-[10px] text-slate-550 font-sans">
                              Site: <strong className="text-slate-705">{item.clientName}</strong>
                            </p>
                          )}
                          {activeDate && (
                            <p className="text-[9px] text-slate-400 font-mono">
                              Last Visited: {activeDate}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {hasMobile ? (
                            <a
                              href={`tel:${item.mobile}`}
                              onClick={() => handleFollowupInteraction(item, 'Call')}
                              className="flex-1 py-1.5 px-3 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/50 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
                            >
                              <PhoneCall size={10} />
                              <span>Call</span>
                            </a>
                          ) : (
                            <span className="flex-1 py-1.5 px-3 bg-slate-100 border border-slate-150 text-slate-400 rounded-lg text-[10px] font-bold flex items-center justify-center cursor-not-allowed select-none text-center">
                              No Phone
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const cleanPh = item.mobile.replace(/\D/g, '').length === 10 ? '91' + item.mobile.replace(/\D/g, '') : item.mobile.replace(/\D/g, '');
                              setWhatsappSelectModal({
                                phone: cleanPh,
                                text: activeFollowupSubTab === 'client' 
                                  ? `hello ${item.name} garu,i recently visited your site, work progress is good 👍.thank you sir.`
                                  : `hello ${item.name} garu,how are you.projects going well, Regards`,
                                name: item.name
                              });
                              handleFollowupInteraction(item, 'WhatsApp');
                            }}
                            className="flex-1 py-1.5 px-3 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/50 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
                          >
                            <MessageCircle size={10} />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeHomeTab === 'overview' && (
        <>
          {/* SECTION V: Field Connections Directory */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6" id="connections-directory">
        
        {/* Directory header line */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-950 font-sans tracking-tight flex items-center gap-2">
              <User className="text-indigo-600" size={18} />
              <span>Partner Directory & Client Connections</span>
            </h2>
            <p className="text-xs text-slate-500">
              Manage core customer details, active carpentry contractors, and associated interior designer partnerships.
            </p>
          </div>
          
          {/* Quick Creator buttons - Responsive Grid */}
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-3" id="quick-creator-grid">
            <button
              onClick={() => setQuickAddModal('customer')}
              className="p-3 bg-white hover:bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] font-bold tracking-wide transition border border-indigo-100 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
              id="btn-qa-customer"
            >
              <div className="p-2 bg-indigo-100 rounded-lg">
                <UserPlus size={18} />
              </div>
              <span>Add Customer</span>
            </button>
            <button
              onClick={() => setQuickAddModal('carpenter')}
              className="p-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-bold tracking-wide transition border border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
              id="btn-qa-carpenter"
            >
              <div className="p-2 bg-slate-100 rounded-lg">
                <Wrench size={18} />
              </div>
              <span>Add Carpenter</span>
            </button>
            <button
              onClick={() => setQuickAddModal('interior')}
              className="p-3 bg-white hover:bg-teal-50 text-teal-700 rounded-2xl text-[10px] font-bold tracking-wide transition border border-teal-100 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
              id="btn-qa-interior"
            >
              <div className="p-2 bg-teal-100 rounded-lg">
                <Paintbrush size={18} />
              </div>
              <span>Add Interior</span>
            </button>
            <button
              onClick={() => setQuickAddModal('architect')}
              className="p-3 bg-white hover:bg-blue-50 text-blue-700 rounded-2xl text-[10px] font-bold tracking-wide transition border border-blue-200 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
              id="btn-qa-architect"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 size={18} />
              </div>
              <span>Add Architect</span>
            </button>
            <button
              onClick={() => setQuickAddModal('builder')}
              className="p-3 bg-white hover:bg-amber-50 text-amber-700 rounded-2xl text-[10px] font-bold tracking-wide transition border border-amber-200 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
              id="btn-qa-builder"
            >
              <div className="p-2 bg-amber-100 rounded-lg">
                <Briefcase size={18} />
              </div>
              <span>Add Builder</span>
            </button>
          </div>
        </div>

        {/* Directory tabs and Search bar */}
        <div className="flex flex-col gap-6">
          {/* Tabs - Responsive Grid Layout */}
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-3" id="directory-tabs-grid">
            <button
              onClick={() => { setActiveDirTab('customers'); setDirSearchQuery(''); }}
              className={`p-4 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-3 cursor-pointer border-2 ${
                activeDirTab === 'customers'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                  : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-indigo-200 hover:bg-white'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${activeDirTab === 'customers' ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'}`}>
                <User size={22} />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span>Customers</span>
                <span className={`text-[10px] font-medium ${activeDirTab === 'customers' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {customers.length} logs
                </span>
              </div>
            </button>

            <button
              onClick={() => { setActiveDirTab('carpenters'); setDirSearchQuery(''); }}
              className={`p-4 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-3 cursor-pointer border-2 ${
                activeDirTab === 'carpenters'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                  : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-indigo-200 hover:bg-white'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${activeDirTab === 'carpenters' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                <Wrench size={22} />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span>Carpenters</span>
                <span className={`text-[10px] font-medium ${activeDirTab === 'carpenters' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {carpenters.length} logs
                </span>
              </div>
            </button>

            <button
              onClick={() => { setActiveDirTab('interiors'); setDirSearchQuery(''); }}
              className={`p-4 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-3 cursor-pointer border-2 ${
                activeDirTab === 'interiors'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                  : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-indigo-200 hover:bg-white'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${activeDirTab === 'interiors' ? 'bg-white/20' : 'bg-teal-100 text-teal-600'}`}>
                <Paintbrush size={22} />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span>Interiors</span>
                <span className={`text-[10px] font-medium ${activeDirTab === 'interiors' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {interiors.length} logs
                </span>
              </div>
            </button>

            <button
              onClick={() => { setActiveDirTab('architects'); setDirSearchQuery(''); }}
              className={`p-4 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-3 cursor-pointer border-2 ${
                activeDirTab === 'architects'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                  : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-indigo-200 hover:bg-white'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${activeDirTab === 'architects' ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>
                <Building2 size={22} />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span>Architects</span>
                <span className={`text-[10px] font-medium ${activeDirTab === 'architects' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {architects.length} logs
                </span>
              </div>
            </button>

            <button
              onClick={() => { setActiveDirTab('builders'); setDirSearchQuery(''); }}
              className={`p-4 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-3 cursor-pointer border-2 ${
                activeDirTab === 'builders'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                  : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-indigo-200 hover:bg-white'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${activeDirTab === 'builders' ? 'bg-white/20' : 'bg-amber-100 text-amber-600'}`}>
                <Briefcase size={22} />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span>Builders</span>
                <span className={`text-[10px] font-medium ${activeDirTab === 'builders' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {builders.length} logs
                </span>
              </div>
            </button>
          </div>

          {/* Search query box */}
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder={`Search ${activeDirTab}...`}
              value={dirSearchQuery}
              onChange={(e) => setDirSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
            />
          </div>
        </div>

        {/* Directory grids based on active tab selection */}
        <div>
          {activeDirTab === 'customers' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-205 gap-3" id="display-mode-switch-dir">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 text-xs text-center font-bold">🏢</span>
                  <div>
                    <span className="text-xs font-black text-slate-800 font-sans tracking-tight block">Display Grouping</span>
                    <p className="text-[10px] text-slate-500 font-sans leading-none">Group directory contacts by their building category or place</p>
                  </div>
                </div>
                <div className="flex flex-wrap bg-slate-200/60 p-0.5 rounded-lg gap-0.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setDirGroupMode('placewise');
                      setShowCustomersPlaceWise(true);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                      dirGroupMode === 'placewise'
                        ? 'bg-white text-indigo-750 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    id="btn-dir-display-placewise"
                  >
                    📍 Place-Wise
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirGroupMode('buildingwise');
                      setShowCustomersPlaceWise(false);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                      dirGroupMode === 'buildingwise'
                        ? 'bg-white text-indigo-750 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    id="btn-dir-display-buildingwise"
                  >
                    🏠 Building-Wise
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirGroupMode('singlegrid');
                      setShowCustomersPlaceWise(false);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                      dirGroupMode === 'singlegrid'
                        ? 'bg-white text-indigo-750 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    id="btn-dir-display-singlegrid"
                  >
                    🔲 Single Grid
                  </button>
                </div>
              </div>

              {(() => {
                const filteredCustomers = customers.filter(c => 
                  c.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
                  c.mobile.includes(dirSearchQuery) ||
                  c.address.toLowerCase().includes(dirSearchQuery.toLowerCase())
                );

                if (filteredCustomers.length === 0) {
                  return (
                    <div className="col-span-3 py-10 bg-slate-50 border border-dashed border-slate-150 rounded-xl text-center">
                      <p className="text-xs text-slate-500">No registered customers match your filter query.</p>
                    </div>
                  );
                }

                if (dirGroupMode === 'buildingwise') {
                  const groupedByBuilding: Record<string, typeof customers> = {
                    'Home 🏠': [],
                    'Duplex 🏡': [],
                    'Apartment 🏢': [],
                    'Shop 🏬': [],
                    'Other 🏗️': []
                  };

                  filteredCustomers.forEach(c => {
                    const bType = c.buildingType || 'Home';
                    const key = bType === 'Home' ? 'Home 🏠'
                      : bType === 'Duplex' ? 'Duplex 🏡'
                      : bType === 'Apartment' ? 'Apartment 🏢'
                      : bType === 'Shop' ? 'Shop 🏬'
                      : 'Other 🏗️';
                    groupedByBuilding[key].push(c);
                  });

                  const buildingKeys = Object.keys(groupedByBuilding).filter(k => groupedByBuilding[k].length > 0);

                  return (
                    <div className="space-y-6" id="dir-buildingwise-sections">
                      {buildingKeys.map((buildingName, gIdx) => (
                        <div key={`${buildingName}-${gIdx}`} className="space-y-3 bg-slate-50/20 p-4.5 rounded-2xl border border-slate-200/60" id={`dir-building-group-${gIdx}`}>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="text-sm font-black text-slate-900 font-sans tracking-tight flex items-center gap-1.5">
                              <span>{buildingName}</span>
                              <span className="text-[10px] bg-indigo-100/60 text-indigo-805 px-1.5 py-0.5 rounded font-mono font-bold">
                                {groupedByBuilding[buildingName].length} {groupedByBuilding[buildingName].length === 1 ? 'Customer' : 'Customers'}
                              </span>
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupedByBuilding[buildingName].map(c => (
                              <div key={c.mobile} className="p-4 border border-slate-150 bg-white hover:border-indigo-250 rounded-xl shadow-2xs hover:shadow-xs transition-all space-y-3 relative group flex flex-col justify-between">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">{c.name}</h4>
                                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Last Active: {c.lastVisitDate}</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 uppercase tracking-wider text-[8px]">{c.buildingType || 'Home'}</span>
                                  </div>
                                  
                                  <div className="space-y-1.5 text-xs text-slate-650 font-sans">
                                    {c.address && (
                                      <p className="line-clamp-2 text-slate-500 font-semibold truncate" title={c.address}>
                                        <MapPin size={11} className="inline mr-1 text-slate-400" />
                                        {c.address}
                                      </p>
                                    )}
                                    <div className="flex flex-col sm:flex-row gap-2 pt-1 font-sans">
                                      {c.mobile && c.mobile !== '0000000000' ? (
                                        <a 
                                          href={`tel:${c.mobile}`} 
                                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-805 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                                        >
                                          <PhoneCall size={11} className="text-indigo-650" />
                                          <span>Call Client</span>
                                        </a>
                                      ) : (
                                        <span className="bg-slate-105 text-slate-400 border border-slate-150 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold select-none text-center flex-1">
                                          No Mobile
                                        </span>
                                      )}
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const cleanPh = c.mobile.replace(/\D/g, '').length === 10 ? '91' + c.mobile.replace(/\D/g, '') : c.mobile.replace(/\D/g, '');
                                          setWhatsappSelectModal({
                                            phone: cleanPh,
                                            text: `hello ${c.name} garu,i recently visited your site, work progress is good 👍.thank you sir.`,
                                            name: c.name
                                          });
                                        }}
                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                                      >
                                        <MessageCircle size={11} className="text-emerald-600 fill-emerald-50/20" />
                                        <span>WhatsApp</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <button 
                                    onClick={() => setSelectedDirItem({ type: 'customer', data: c })}
                                    className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition uppercase"
                                  >
                                    <Eye size={10} />
                                    <span>Show Details</span>
                                  </button>
                                  <button 
                                    onClick={() => onDeleteCustomer?.(c.mobile)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg cursor-pointer transition"
                                    title="Delete customer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                if (dirGroupMode === 'placewise') {
                  const grouped: Record<string, typeof customers> = {};
                  filteredCustomers.forEach(c => {
                    const pl = (c.address || 'No Address').trim();
                    if (!grouped[pl]) {
                      grouped[pl] = [];
                    }
                    grouped[pl].push(c);
                  });

                  // Sort place names alphabetically
                  const sortedPlaces = Object.keys(grouped).sort();

                  return (
                    <div className="space-y-6" id="dir-placewise-sections">
                      {sortedPlaces.map((placeName, gIdx) => (
                        <div key={`${placeName}-${gIdx}`} className="space-y-3 bg-slate-50/20 p-4.5 rounded-2xl border border-slate-200/60" id={`dir-place-group-${gIdx}`}>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="text-sm font-black text-slate-900 font-sans tracking-tight flex items-center gap-1.5">
                              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 text-[10px]">📍</span>
                              <span>{placeName}</span>
                              <span className="text-[10px] bg-indigo-100/60 text-indigo-805 px-1.5 py-0.5 rounded font-mono font-bold">
                                {grouped[placeName].length} {grouped[placeName].length === 1 ? 'Customer' : 'Customers'}
                              </span>
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {grouped[placeName].map(c => (
                              <div key={c.mobile} className="p-4 border border-slate-150 bg-white hover:border-indigo-250 rounded-xl shadow-2xs hover:shadow-xs transition-all space-y-3 relative group flex flex-col justify-between">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">{c.name}</h4>
                                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Last Active: {c.lastVisitDate}</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 uppercase tracking-wider text-[8px]">{c.buildingType || 'Home'}</span>
                                  </div>
                                  
                                  <div className="space-y-1.5 text-xs text-slate-650 font-sans">
                                    {c.address && (
                                      <p className="line-clamp-2 text-slate-500 font-semibold" title={c.address}>
                                        <MapPin size={11} className="inline mr-1 text-slate-400" />
                                        {c.address}
                                      </p>
                                    )}
                                    <div className="flex flex-col sm:flex-row gap-2 pt-1 font-sans">
                                      {c.mobile && c.mobile !== '0000000000' ? (
                                        <a 
                                          href={`tel:${c.mobile}`} 
                                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-805 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                                        >
                                          <PhoneCall size={11} className="text-indigo-650" />
                                          <span>Call Client</span>
                                        </a>
                                      ) : (
                                        <span className="bg-slate-105 text-slate-400 border border-slate-150 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold select-none text-center flex-1">
                                          No Mobile
                                        </span>
                                      )}
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const cleanPh = c.mobile.replace(/\D/g, '').length === 10 ? '91' + c.mobile.replace(/\D/g, '') : c.mobile.replace(/\D/g, '');
                                          setWhatsappSelectModal({
                                            phone: cleanPh,
                                            text: `hello ${c.name} garu,i recently visited your site, work progress is good 👍.thank you sir.`,
                                            name: c.name
                                          });
                                        }}
                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                                      >
                                        <MessageCircle size={11} className="text-emerald-600 fill-emerald-50/20" />
                                        <span>WhatsApp</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <button 
                                    onClick={() => setSelectedDirItem({ type: 'customer', data: c })}
                                    className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition uppercase"
                                  >
                                    <Eye size={10} />
                                    <span>Show Details</span>
                                  </button>
                                  <button 
                                    onClick={() => onDeleteCustomer?.(c.mobile)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg cursor-pointer transition"
                                    title="Delete customer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                // Render default Single Grid
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="dir-singlegrid-view">
                    {filteredCustomers.map(c => (
                      <div key={c.mobile} className="p-4 border border-slate-150 bg-slate-50/40 hover:bg-white rounded-xl shadow-xs transition hover:shadow-sm space-y-3 relative group flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-slate-900 leading-snug truncate">{c.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Last Active: {c.lastVisitDate}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100/50 font-bold uppercase tracking-wider text-[8px]">{c.buildingType || 'Home'}</span>
                          </div>
                          
                          <div className="space-y-1.5 text-xs text-slate-650 font-sans">
                            {c.address && (
                              <p className="line-clamp-2" title={c.address}>
                                <MapPin size={11} className="inline mr-1 text-slate-400" />
                                {c.address}
                              </p>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2 pt-1 font-sans">
                              {c.mobile && c.mobile !== '0000000000' ? (
                                <a 
                                  href={`tel:${c.mobile}`} 
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-805 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                                >
                                  <PhoneCall size={11} className="text-indigo-650" />
                                  <span>Call Client</span>
                                </a>
                              ) : (
                                <span className="bg-slate-105 text-slate-400 border border-slate-150 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold select-none text-center flex-1">
                                  No Mobile
                                </span>
                              )}
                              <button 
                                type="button"
                                onClick={() => {
                                  const cleanPh = c.mobile.replace(/\D/g, '').length === 10 ? '91' + c.mobile.replace(/\D/g, '') : c.mobile.replace(/\D/g, '');
                                  setWhatsappSelectModal({
                                    phone: cleanPh,
                                    text: `hello ${c.name} garu,i recently visited your site, work progress is good 👍.thank you sir.`,
                                    name: c.name
                                  });
                                }}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                              >
                                <MessageCircle size={11} className="text-emerald-600 fill-emerald-50/20" />
                                <span>WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button 
                            onClick={() => setSelectedDirItem({ type: 'customer', data: c })}
                            className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition uppercase"
                          >
                            <Eye size={10} />
                            <span>Show Details</span>
                          </button>
                          <button 
                            onClick={() => onDeleteCustomer?.(c.mobile)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg cursor-pointer transition"
                            title="Delete customer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {activeDirTab === 'carpenters' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {carpenters.filter(c => 
                c.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
                c.mobile.includes(dirSearchQuery) ||
                c.clientName.toLowerCase().includes(dirSearchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="col-span-3 py-10 bg-slate-50 border border-dashed border-slate-150 rounded-xl text-center">
                  <p className="text-xs text-slate-500">No carpenter partners match your filter query.</p>
                </div>
              ) : (
                carpenters.filter(c => 
                  c.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
                  c.mobile.includes(dirSearchQuery) ||
                  c.clientName.toLowerCase().includes(dirSearchQuery.toLowerCase())
                ).map(c => {
                  const partnerKey = `carpenter-${c.mobile}`;
                  const isCompleted = !!completedFollowups[partnerKey] || !!completedFollowups[c.mobile];
                  const completedInfo = completedFollowups[partnerKey] || completedFollowups[c.mobile];

                  return (
                    <div key={c.mobile} className="p-4 border border-slate-150 bg-slate-50/40 hover:bg-white rounded-xl shadow-xs transition hover:shadow-sm space-y-3 relative group flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 leading-snug">{c.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Last Seen: {c.lastVisitDate}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-250 uppercase tracking-wider text-[8px]">Carpenter</span>
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-slate-650 font-sans">
                          <p className="bg-slate-100/60 p-1.5 rounded text-[11px] leading-snug">
                            <span className="text-[10px] text-slate-400 font-mono uppercase block">Assigned Project Site</span>
                            <strong className="text-slate-800">{c.clientName}</strong>
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2 pt-1 font-sans">
                            {c.mobile && c.mobile !== '0000000000' ? (
                              <a 
                                href={`tel:${c.mobile}`} 
                                className="bg-slate-150/70 hover:bg-slate-200 text-slate-800 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                              >
                                <PhoneCall size={11} className="text-slate-600" />
                                <span>Call Partner</span>
                              </a>
                            ) : (
                              <span className="bg-slate-100/50 text-slate-400 border border-slate-100/30 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold select-none text-center flex-1">
                                No Mobile
                              </span>
                            )}
                            <button 
                              type="button"
                              onClick={() => {
                                const cleanPh = c.mobile.replace(/\D/g, '').length === 10 ? '91' + c.mobile.replace(/\D/g, '') : c.mobile.replace(/\D/g, '');
                                setWhatsappSelectModal({
                                  phone: cleanPh,
                                  text: `hello ${c.name} garu,how are you.projects going well, Regards`,
                                  name: c.name
                                });
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                            >
                              <MessageCircle size={11} className="text-emerald-600 fill-emerald-50/20" />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button 
                          onClick={() => setSelectedDirItem({ type: 'carpenter', data: c })}
                          className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition uppercase"
                        >
                          <Eye size={10} />
                          <span>Show Details</span>
                        </button>
                        <button 
                          onClick={() => onDeleteCarpenter?.(c.mobile)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg cursor-pointer transition"
                          title="Delete carpenter"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeDirTab === 'interiors' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {interiors.filter(i => 
                i.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
                i.mobile.includes(dirSearchQuery) ||
                i.clientName.toLowerCase().includes(dirSearchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="col-span-3 py-10 bg-slate-50 border border-dashed border-slate-150 rounded-xl text-center">
                  <p className="text-xs text-slate-500">No interior designing partners match your filter query.</p>
                </div>
              ) : (
                interiors.filter(i => 
                  i.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
                  i.mobile.includes(dirSearchQuery) ||
                  i.clientName.toLowerCase().includes(dirSearchQuery.toLowerCase())
                ).map(i => {
                  const partnerKey = `interior-${i.mobile}`;
                                   return (
                    <div key={i.mobile} className="p-4 border border-slate-150 bg-slate-50/40 hover:bg-white rounded-xl shadow-xs transition hover:shadow-sm space-y-3 relative group flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 leading-snug">{i.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Last Active: {i.lastVisitDate}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-teal-55/10 text-teal-700 font-bold border border-teal-100 uppercase tracking-wider text-[8px]">Interior</span>
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-slate-650 font-sans">
                          <p className="bg-teal-50/30 p-1.5 rounded text-[11px] leading-snug border border-teal-100/40">
                            <span className="text-[10px] text-teal-600 font-mono uppercase block">Associated Client Site</span>
                            <strong className="text-slate-800">{i.clientName}</strong>
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2 pt-1 font-sans">
                            {i.mobile && i.mobile !== '0000000000' ? (
                              <a 
                                href={`tel:${i.mobile}`} 
                                className="bg-teal-50/50 hover:bg-teal-100/60 text-teal-850 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                              >
                                <PhoneCall size={11} className="text-teal-650" />
                                <span>Call Designer</span>
                              </a>
                            ) : (
                              <span className="bg-slate-100/50 text-slate-400 border border-slate-100/30 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold select-none text-center flex-1">
                                No Mobile
                              </span>
                            )}
                            <button 
                              type="button"
                              onClick={() => {
                                const cleanPh = i.mobile.replace(/\D/g, '').length === 10 ? '91' + i.mobile.replace(/\D/g, '') : i.mobile.replace(/\D/g, '');
                                setWhatsappSelectModal({
                                  phone: cleanPh,
                                  text: `hello ${i.name} garu,how are you.projects going well, Regards`,
                                  name: i.name
                                });
                              }}
                              className="bg-emerald-55 hover:bg-emerald-100 text-emerald-800 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                            >
                              <MessageCircle size={11} className="text-emerald-600 fill-emerald-50/20" />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button 
                          onClick={() => setSelectedDirItem({ type: 'interior', data: i })}
                          className="flex-1 py-1.5 px-2 bg-teal-55/10 hover:bg-teal-50 text-teal-800 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition uppercase"
                        >
                          <Eye size={10} />
                          <span>Show Details</span>
                        </button>
                        <button 
                          onClick={() => onDeleteInterior?.(i.mobile)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg cursor-pointer transition"
                          title="Delete interior partner"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeDirTab === 'architects' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {architects.filter(a => 
                a.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
                a.mobile.includes(dirSearchQuery) ||
                a.clientName.toLowerCase().includes(dirSearchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="col-span-3 py-10 bg-slate-50 border border-dashed border-slate-150 rounded-xl text-center">
                  <p className="text-xs text-slate-500">No architect partners match your filter query.</p>
                </div>
              ) : (
                architects.filter(a => 
                  a.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
                  a.mobile.includes(dirSearchQuery) ||
                  a.clientName.toLowerCase().includes(dirSearchQuery.toLowerCase())
                ).map(a => {
                  return (
                    <div key={a.mobile} className="p-4 border border-slate-150 bg-slate-50/40 hover:bg-white rounded-xl shadow-xs transition hover:shadow-sm space-y-3 relative group flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 leading-snug">{a.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Last Active: {a.lastVisitDate}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 uppercase tracking-wider text-[8px]">Architect</span>
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-slate-650 font-sans">
                          <p className="bg-blue-50/30 p-1.5 rounded text-[11px] leading-snug border border-blue-100/40">
                            <span className="text-[10px] text-blue-600 font-mono uppercase block">Associated Client Site</span>
                            <strong className="text-slate-800">{a.clientName}</strong>
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2 pt-1 font-sans">
                            {a.mobile && a.mobile !== '0000000000' ? (
                              <a 
                                href={`tel:${a.mobile}`} 
                                className="bg-blue-50/50 hover:bg-blue-100/60 text-blue-850 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                              >
                                <PhoneCall size={11} className="text-blue-655" />
                                <span>Call Architect</span>
                              </a>
                            ) : (
                              <span className="bg-slate-100/50 text-slate-400 border border-slate-100/30 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold select-none text-center flex-1">
                                No Mobile
                              </span>
                            )}
                            <button 
                              type="button"
                              onClick={() => {
                                const cleanPh = a.mobile.replace(/\D/g, '').length === 10 ? '91' + a.mobile.replace(/\D/g, '') : a.mobile.replace(/\D/g, '');
                                setWhatsappSelectModal({
                                  phone: cleanPh,
                                  text: `hello ${a.name} garu,how are you.projects going well, Regards`,
                                  name: a.name
                                });
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                            >
                              <MessageCircle size={11} className="text-emerald-600 fill-emerald-50/20" />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button 
                          onClick={() => setSelectedDirItem({ type: 'architect', data: a })}
                          className="flex-1 py-1.5 px-2 bg-blue-55/10 hover:bg-blue-50 text-blue-800 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition uppercase"
                        >
                          <Eye size={10} />
                          <span>Show Details</span>
                        </button>
                        <button 
                          onClick={() => onDeleteArchitect?.(a.mobile)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg cursor-pointer transition"
                          title="Delete architect partner"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeDirTab === 'builders' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {builders.filter(b => 
                b.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
                b.mobile.includes(dirSearchQuery) ||
                b.clientName.toLowerCase().includes(dirSearchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="col-span-3 py-10 bg-slate-50 border border-dashed border-slate-150 rounded-xl text-center">
                  <p className="text-xs text-slate-500">No builder partners match your filter query.</p>
                </div>
              ) : (
                builders.filter(b => 
                  b.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
                  b.mobile.includes(dirSearchQuery) ||
                  b.clientName.toLowerCase().includes(dirSearchQuery.toLowerCase())
                ).map(b => {
                  return (
                    <div key={b.mobile} className="p-4 border border-slate-150 bg-slate-50/40 hover:bg-white rounded-xl shadow-xs transition hover:shadow-sm space-y-3 relative group flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 leading-snug">{b.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Last Active: {b.lastVisitDate}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-100 uppercase tracking-wider text-[8px]">Builder</span>
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-slate-650 font-sans">
                          <p className="bg-amber-50/30 p-1.5 rounded text-[11px] leading-snug border border-amber-100/40">
                            <span className="text-[10px] text-amber-600 font-mono uppercase block">Associated Client Site</span>
                            <strong className="text-slate-800">{b.clientName}</strong>
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2 pt-1 font-sans">
                            {b.mobile && b.mobile !== '0000000000' ? (
                              <a 
                                href={`tel:${b.mobile}`} 
                                className="bg-amber-50/50 hover:bg-amber-100/60 text-amber-850 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                              >
                                <PhoneCall size={11} className="text-amber-655" />
                                <span>Call Builder</span>
                              </a>
                            ) : (
                              <span className="bg-slate-100/50 text-slate-400 border border-slate-100/30 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold select-none text-center flex-1">
                                No Mobile
                              </span>
                            )}
                            <button 
                              type="button"
                              onClick={() => {
                                const cleanPh = b.mobile.replace(/\D/g, '').length === 10 ? '91' + b.mobile.replace(/\D/g, '') : b.mobile.replace(/\D/g, '');
                                setWhatsappSelectModal({
                                  phone: cleanPh,
                                  text: `hello ${b.name} garu,how are you.projects going well, Regards`,
                                  name: b.name
                                });
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex-1 cursor-pointer text-center"
                            >
                              <MessageCircle size={11} className="text-emerald-600 fill-emerald-50/20" />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button 
                          onClick={() => setSelectedDirItem({ type: 'builder', data: b })}
                          className="flex-1 py-1.5 px-2 bg-amber-55/10 hover:bg-amber-50 text-amber-800 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition uppercase"
                        >
                          <Eye size={10} />
                          <span>Show Details</span>
                        </button>
                        <button 
                          onClick={() => onDeleteBuilder?.(b.mobile)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg cursor-pointer transition"
                          title="Delete builder partner"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )}

      {/* SECTION VI: Dynamic Performance Reports & Analytics Suite */}
      {activeHomeTab === 'reports' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-8 animate-fade-in" id="performance-reports-suite">
          {/* Header row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-slate-950 font-sans tracking-tight flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-teal-100 text-teal-600">📈</span>
                <span>Zone Performance & Site Progress Reports</span>
              </h2>
              <p className="text-xs text-slate-500">
                Actionable metrics and pipeline visualizers generated directly from your local site logs.
              </p>
            </div>

            {/* Quick Export tools */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyWhatsAppReport}
                className="inline-flex items-center gap-2 px-3.5 py-2 border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Copy ready-to-paste text report for WhatsApp"
              >
                <span>💬 Copy WhatsApp Report</span>
              </button>

              <button
                onClick={handleExportCSVReport}
                className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Download full database CSV file"
              >
                <span>📥 Export CSV data</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid with conversion health, active partner ratios, and daily target accuracy was removed per user request */}

          {/* Daily Report Format Generator Section */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-6" id="daily-report-generator-box">
            <div className="border-b border-slate-200/60 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] text-indigo-600 uppercase font-mono font-bold tracking-widest block font-sans">Operational Report Tool</span>
                <h3 className="text-sm font-extrabold text-slate-900 font-sans tracking-tight flex items-center gap-2 mt-0.5 animate-fade-in">
                  <span>📋</span> <span>WhatsApp Live Daily Report & POA Generator</span>
                </h3>
              </div>
            </div>

            {/* Inputs grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Select Report Date</label>
                <input
                  type="date"
                  value={reportDateInput}
                  onChange={(e) => {
                    setReportDateInput(e.target.value);
                    setIsCustomEditing(false);
                    setIsCustomPOAEditing(false);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Sales Person Name (NAME)</label>
                <input
                  type="text"
                  placeholder="e.g. Ramakrishna"
                  value={reportUserName}
                  onChange={(e) => {
                    setReportUserName(e.target.value);
                    setIsCustomEditing(false);
                    setIsCustomPOAEditing(false);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Place of Work (PLACE)</label>
                <input
                  type="text"
                  placeholder="e.g. Gachibowli, Madhapur"
                  value={reportPlace}
                  onChange={(e) => {
                    setReportPlace(e.target.value);
                    setIsCustomEditing(false);
                    setIsCustomPOAEditing(false);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Dealers / Sub Dealer</label>
                <input
                  type="text"
                  placeholder="e.g. Tirumala timber"
                  value={reportDealerSubdealer}
                  onChange={(e) => {
                    setReportDealerSubdealer(e.target.value);
                    setIsCustomEditing(false);
                    setIsCustomPOAEditing(false);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Secondary Sales Today (no of pcs)</label>
                <input
                  type="text"
                  placeholder="e.g. 12"
                  value={reportSecondarySalesToday}
                  onChange={(e) => {
                    setReportSecondarySalesToday(e.target.value);
                    setIsCustomEditing(false);
                    setIsCustomPOAEditing(false);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1">Cumulative sales for this month</label>
                <input
                  type="text"
                  placeholder="e.g. 137"
                  value={reportCumulativeSalesMonth}
                  onChange={(e) => {
                    setReportCumulativeSalesMonth(e.target.value);
                    setIsCustomEditing(false);
                    setIsCustomPOAEditing(false);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1 font-sans">Tomorrow's Work At (TOMORROW PLACE)</label>
                <input
                  type="text"
                  placeholder="e.g. Vijayawada / Guntur"
                  value={reportTomorrowWorkAt}
                  onChange={(e) => {
                    setReportTomorrowWorkAt(e.target.value);
                    setIsCustomEditing(false);
                    setIsCustomPOAEditing(false);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-medium text-slate-800 font-sans"
                />
              </div>
            </div>

            {/* Generated Report Split Display Box */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-[11px] font-black uppercase text-indigo-700 font-sans tracking-wide">
                  ✨ SPLIT REPORTS (FOR SEPARATE SMS/WHATSAPP SENT MESSAGES)
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-sans">
                  {visits.filter(v => v.visitingDate === reportDateInput).length} check-ins matching selected date
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Panel 1: Daily Status Report SMS */}
                <div className="bg-white border border-slate-150 rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-slate-850 uppercase font-sans">📋 (1) Daily Status Report</span>
                      {isCustomEditing && (
                        <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold font-sans px-1.5 py-0.5 rounded uppercase leading-none tracking-wider animate-pulse">
                          Edited
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (!isCustomEditing) {
                            setCustomReportText(getCompiledDailyReportText());
                          }
                          setIsCustomEditing(!isCustomEditing);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-extrabold transition cursor-pointer font-sans ${isCustomEditing ? 'bg-indigo-650 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                        title="Tweak Daily report text manually"
                      >
                        {isCustomEditing ? '✓ Done' : '✍️ Edit'}
                      </button>
                      {isCustomEditing && (
                        <button
                          onClick={() => {
                            setIsCustomEditing(false);
                            setCustomReportText('');
                          }}
                          className="px-2 py-1 rounded text-[10px] bg-rose-50 text-rose-600 hover:bg-rose-100 font-extrabold font-sans transition cursor-pointer"
                          title="Reset to automatically loaded logs"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly={!isCustomEditing}
                      value={isCustomEditing ? customReportText : getCompiledDailyReportText()}
                      onChange={(e) => {
                        if (isCustomEditing) {
                          setCustomReportText(e.target.value);
                        }
                      }}
                      className={`w-full p-4 border rounded-xl font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-inner h-80 ${isCustomEditing ? 'bg-white border-indigo-200 focus:border-indigo-600' : 'bg-slate-50/75 border-slate-200 text-slate-800'}`}
                      placeholder="Status report text container..."
                    />
                    
                    <button
                      onClick={() => {
                        const textToCopy = isCustomEditing ? customReportText : getCompiledDailyReportText();
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(textToCopy);
                          onTriggerToast?.("📋 Daily Status Report draft copied!", 'success');
                        } else {
                          onTriggerToast?.("Error copying: Browser clipboard API is unavailable.", 'info');
                        }
                      }}
                      className="absolute right-3.5 bottom-3.5 px-3 py-1.8 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-md text-[11px] shadow-md transition flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] font-sans"
                    >
                      <span>💬 Copy Daily SMS</span>
                    </button>
                  </div>
                </div>

                {/* Panel 2: Plan Of Action (POA) Report SMS */}
                <div className="bg-white border border-slate-150 rounded-xl p-4 space-y-3 shadow-xs font-sans">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-slate-850 uppercase font-sans">🔮 (2) Tomorrow's POA Report</span>
                      {isCustomPOAEditing && (
                        <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold font-sans px-1.5 py-0.5 rounded uppercase leading-none tracking-wider animate-pulse">
                          Edited
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (!isCustomPOAEditing) {
                            setCustomPOAReportText(getCompiledPOAReportText());
                          }
                          setIsCustomPOAEditing(!isCustomPOAEditing);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-extrabold transition cursor-pointer font-sans ${isCustomPOAEditing ? 'bg-indigo-650 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                        title="Tweak Plan Of Action text manually"
                      >
                        {isCustomPOAEditing ? '✓ Done' : '✍️ Edit'}
                      </button>
                      {isCustomPOAEditing && (
                        <button
                          onClick={() => {
                            setIsCustomPOAEditing(false);
                            setCustomPOAReportText('');
                          }}
                          className="px-2 py-1 rounded text-[10px] bg-rose-50 text-rose-600 hover:bg-rose-100 font-extrabold font-sans transition cursor-pointer"
                          title="Reset to automatic location predictions"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly={!isCustomPOAEditing}
                      value={isCustomPOAEditing ? customPOAReportText : getCompiledPOAReportText()}
                      onChange={(e) => {
                        if (isCustomPOAEditing) {
                          setCustomPOAReportText(e.target.value);
                        }
                      }}
                      className={`w-full p-4 border rounded-xl font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-inner h-80 ${isCustomPOAEditing ? 'bg-white border-indigo-200 focus:border-indigo-600' : 'bg-slate-50/75 border-slate-200 text-slate-800'}`}
                      placeholder="Plan of Action text container..."
                    />
                    
                    <button
                      onClick={() => {
                        const textToCopy = isCustomPOAEditing ? customPOAReportText : getCompiledPOAReportText();
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(textToCopy);
                          onTriggerToast?.("🔮 Tomorrow's POA draft copied!", 'success');
                        } else {
                          onTriggerToast?.("Error copying: Browser clipboard API is unavailable.", 'info');
                        }
                      }}
                      className="absolute right-3.5 bottom-3.5 px-3 py-1.8 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-md text-[11px] shadow-md transition flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] font-sans"
                    >
                      <span>💬 Copy POA SMS</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Combined fallback action bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-150">
                <span className="text-[10px] text-slate-500 font-medium">
                  💡 Dynamic predictions automatically select 3 carpenters and 2 clients matching tomorrow's location.
                </span>
                
                <button
                  onClick={() => {
                    const daily = isCustomEditing ? customReportText : getCompiledDailyReportText();
                    const poa = isCustomPOAEditing ? customPOAReportText : getCompiledPOAReportText();
                    const combined = `${daily}\n\n${poa}`;
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(combined);
                      onTriggerToast?.("🔗 Combined Report + POA copied to clipboard!", 'success');
                    } else {
                      onTriggerToast?.("Error copying: Browser clipboard API is unavailable.", 'info');
                    }
                  }}
                  className="px-3.5 py-1.8 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 text-slate-600 font-extrabold rounded-lg text-xs transition cursor-pointer font-sans"
                >
                  📋 Copy Combined (Status + POA Together)
                </button>
              </div>

              <div className="p-3 bg-indigo-50/50 border border-indigo-100/80 rounded-xl text-[11px] text-slate-600 leading-normal flex items-start gap-1.5 font-sans">
                <span className="text-xs">👋</span>
                <p>
                  You can now send **Daily Status report** and **Plan of Action (POA) report** as separate SMS or WhatsApp messages! Tap the green copy button for the status logs and the blue copy button for tomorrow's targets to send them one after another easily!
                </p>
              </div>
            </div>
          </div>

          {/* Timeframe-wise Meeting & Engagement Matrix */}
          <div className="space-y-4" id="timeframe-wise-meetings">
            <div className="border-b border-slate-100 pb-2">
              <span className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider">⏱️ Segmented Engagements breakdown (Today vs. Week vs. Month)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Today Card */}
              <div className="bg-[#fcfdfa] border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm" id="timeframe-today">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1">
                    <span>📅</span> Today's Meetings
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase font-mono tracking-wide border border-indigo-100">
                    {todayStr}
                  </span>
                </div>

                <div className="space-y-3 font-sans">
                  {/* Customer Visits */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-150 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-650 flex items-center justify-center border border-indigo-100/50">
                        <User size={13} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Customer Visits</span>
                    </div>
                    <span className="text-[15px] font-black text-indigo-700 font-mono">{todayCust}</span>
                  </div>

                  {/* Carpenter Meets */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-150 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-650 flex items-center justify-center border border-orange-100/50">
                        <Wrench size={13} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Carpenter Meets</span>
                    </div>
                    <span className="text-[15px] font-black text-orange-600 font-mono">{todayCarp}</span>
                  </div>

                  {/* Interior Meets */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-150 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center border border-teal-100/50">
                        <Paintbrush size={13} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Interior Meets</span>
                    </div>
                    <span className="text-[15px] font-black text-teal-600 font-mono">{todayInt}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-medium font-sans pt-1 flex justify-between items-center bg-slate-50/62 p-2 rounded-xl border border-slate-100">
                  <span>Total logged:</span>
                  <strong className="text-slate-800 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-100">{todayCust + todayCarp + todayInt} entries</strong>
                </div>
              </div>


              {/* This Week Card */}
              <div className="bg-[#fcfdfa] border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm" id="timeframe-week">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1">
                    <span>🗓️</span> Weekly Velocity
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-black font-mono uppercase border border-slate-200">
                    Last 7 Days
                  </span>
                </div>

                <div className="space-y-3 font-sans">
                  {/* Customer Visits */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-150 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-650 flex items-center justify-center border border-indigo-100/50">
                        <User size={13} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Customer Visits</span>
                    </div>
                    <span className="text-[15px] font-black text-indigo-700 font-mono">{weekCust}</span>
                  </div>

                  {/* Carpenter Meets */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-150 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-650 flex items-center justify-center border border-orange-100/50">
                        <Wrench size={13} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Carpenter Meets</span>
                    </div>
                    <span className="text-[15px] font-black text-orange-600 font-mono">{weekCarp}</span>
                  </div>

                  {/* Interior Meets */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-150 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center border border-teal-100/50">
                        <Paintbrush size={13} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Interior Meets</span>
                    </div>
                    <span className="text-[15px] font-black text-teal-600 font-mono">{weekInt}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-medium font-sans pt-1 flex justify-between items-center bg-slate-50/62 p-2 rounded-xl border border-slate-100">
                  <span>Total logged:</span>
                  <strong className="text-slate-800 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-100">{weekCust + weekCarp + weekInt} entries</strong>
                </div>
              </div>


              {/* This Month Card */}
              <div className="bg-[#fcfdfa] border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm" id="timeframe-month">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1">
                    <span>📊</span> Monthly Outreach
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[9px] font-black font-mono uppercase border border-teal-100">
                    Past 30 Days
                  </span>
                </div>

                <div className="space-y-3 font-sans">
                  {/* Customer Visits */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-150 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-650 flex items-center justify-center border border-indigo-100/50">
                        <User size={13} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Customer Visits</span>
                    </div>
                    <span className="text-[15px] font-black text-indigo-700 font-mono">{monthCust}</span>
                  </div>

                  {/* Carpenter Meets */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-150 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-650 flex items-center justify-center border border-orange-100/50">
                        <Wrench size={13} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Carpenter Meets</span>
                    </div>
                    <span className="text-[15px] font-black text-orange-600 font-mono">{monthCarp}</span>
                  </div>

                  {/* Interior Meets */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-150 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center border border-teal-100/50">
                        <Paintbrush size={13} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Interior Meets</span>
                    </div>
                    <span className="text-[15px] font-black text-teal-600 font-mono">{monthInt}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-medium font-sans pt-1 flex justify-between items-center bg-slate-50/62 p-2 rounded-xl border border-slate-100">
                  <span>Total logged:</span>
                  <strong className="text-slate-800 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-100">{monthCust + monthCarp + monthInt} entries</strong>
                </div>
              </div>

            </div>
          </div>

          {/* Construction Progress Pipeline */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <span className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider">🏗️ Stage-Wise Site progress Pipeline ({activeProjectsList.length} Unique Sites)</span>
            </div>

            <div className="space-y-3.5">
              {[
                { name: 'Excavation & Footing', color: 'bg-amber-550 border-amber-600 text-amber-800' },
                { name: 'Brickwork & Masonry', color: 'bg-orange-550 border-orange-600 text-orange-850' },
                { name: 'Plastering & Wiring', color: 'bg-indigo-550 border-indigo-600 text-indigo-805' },
                { name: 'Flooring & Tiling', color: 'bg-indigo-600 border-indigo-700 text-indigo-900' },
                { name: 'Woodwork & Carpentry', color: 'bg-violet-600 border-violet-700 text-violet-805' },
                { name: 'Interior Designing', color: 'bg-teal-650 border-teal-750 text-teal-800' },
                { name: 'Finished & Handover', color: 'bg-emerald-600 border-emerald-700 text-emerald-800' }
              ].map(stage => {
                const count = stageCounts[stage.name] || 0;
                const pct = activeProjectsList.length > 0 ? Math.round((count / activeProjectsList.length) * 100) : 0;
                
                return (
                  <div key={stage.name} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
                    <span className="text-xs font-bold text-slate-700 w-44 shrink-0 font-sans">{stage.name}</span>
                    
                    <div className="flex-1 w-full bg-slate-100 h-7 rounded-xl border border-slate-200/60 overflow-hidden flex items-center relative pr-4">
                      <div 
                        className={`h-full opacity-15 transition-all duration-500 bg-indigo-600`}
                        style={{ width: `${pct}%` }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                        <span className="font-mono text-[10px] text-slate-400">
                          {pct}% of active portfolio
                        </span>
                        <span className="font-extrabold text-slate-900 font-sans">
                          {count} {count === 1 ? 'site' : 'sites'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Past 7 Days Entry Logs Activity Graph */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-150/60">
            
            {/* Daily Velocity Column representation */}
            <div className="space-y-4">
              <span className="text-xs font-black uppercase text-slate-400 font-mono tracking-wider block">📅 Daily visit velocity (Past 7 Days)</span>
              
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 h-56 flex flex-col justify-between">
                <div className="flex items-end justify-between gap-2 h-40 pt-4">
                  {last7DaysList.map(item => {
                    const barHeightPct = Math.min((item.count / 10) * 105, 100);
                    return (
                      <div key={item.dateStr} className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
                        {/* Tooltip */}
                        <div className="absolute -top-6 bg-slate-805 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                          {item.count} recorded visits
                        </div>
                        <div 
                          className={`w-full max-w-[20px] rounded-t-md transition-all duration-300 ${
                            item.count > 0 ? 'bg-indigo-600 group-hover:bg-indigo-505 shadow-sm' : 'bg-slate-250'
                          }`}
                          style={{ height: `${Math.max(barHeightPct, 4)}%` }}
                        ></div>
                        <span className="text-[8px] font-bold text-slate-400 font-mono text-center mt-2 scale-90 sm:scale-100">
                          {item.label.split(',')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-slate-150 pt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Velocity count</span>
                  <span>Total visits this week: {visitsThisWeek}</span>
                </div>
              </div>
            </div>

            {/* Filters and Search logs */}
            <div className="space-y-4">
              <span className="text-xs font-black uppercase text-slate-450 font-mono tracking-wider block">🔍 Live portfolio reports filter ({activeProjectsList.length} sites)</span>
              
              <div className="bg-slate-50 border border-slate-250/50 rounded-2xl p-5 space-y-4 text-xs">
                <div className="flex gap-4">
                  {/* Lead Category select */}
                  <div className="flex-1">
                    <label className="block text-slate-550 font-bold text-[10px] uppercase font-mono tracking-wide mb-1.5">Lead status filter</label>
                    <select 
                      value={reportLeadFilter} 
                      onChange={(e) => setReportLeadFilter(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 bg-no-repeat focus:outline-none focus:ring-1 focus:ring-indigo-550 font-semibold text-xs"
                    >
                      <option value="all">All statuses</option>
                      <option value="hot">🔥 Hot Leads only</option>
                      <option value="cold">❄️ Cold Leads only</option>
                    </select>
                  </div>

                  {/* Stage Category select */}
                  <div className="flex-1">
                    <label className="block text-slate-555 font-bold text-[10px] uppercase font-mono tracking-wide mb-1.5">Construction Stage</label>
                    <select 
                      value={reportStageFilter} 
                      onChange={(e) => setReportStageFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 bg-no-repeat focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-xs"
                    >
                      <option value="all">All stages</option>
                      {Object.keys(stageCounts).map(sh => (
                        <option key={sh} value={sh}>{sh}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Listing elements */}
                <div className="bg-white rounded-xl border border-slate-150 overflow-y-auto max-h-36 divide-y divide-slate-100">
                  {(() => {
                    const filtered = activeProjectsList.filter(p => {
                      if (reportLeadFilter !== 'all' && p.leadStatus !== reportLeadFilter) return false;
                      if (reportStageFilter !== 'all' && p.buildingStatus !== reportStageFilter) return false;
                      return true;
                    });
                    
                    if (filtered.length === 0) {
                      return (
                        <div className="p-4 text-center text-slate-400 font-sans tracking-wide">
                          No active sites match selected reports filters.
                        </div>
                      );
                    }
                    
                    return filtered.map(p => (
                      <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block">{p.clientName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{p.buildingStatus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono tracking-widest ${
                            p.leadStatus === 'hot' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {p.leadStatus}
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {activeHomeTab === 'absent' && (
        <div className="space-y-6 animate-fade-in" id="client-absent-dashboard">
            
            {/* Header row / intro */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h2 className="text-base font-extrabold text-slate-950 font-sans tracking-tight flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-100 text-rose-600 text-xs">👤</span>
                    <span>Unattended & Client Absent Site Logs</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Detailed logs of sites where check-ins were registered while the customer was absent or unavailable.
                  </p>
                </div>
                <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 font-bold font-mono">
                  {absentVisits.length} Absent Listings
                </div>
              </div>

              {/* Micro KPI widgets row inside the tab */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-150 flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400 font-mono">Total Pending Revisit</span>
                    <span className="text-lg font-black text-slate-800">{absentVisits.length} Sites</span>
                  </div>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <UserX size={16} />
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-150 flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400 font-mono">Landmarks Documented</span>
                    <span className="text-lg font-black text-slate-800">{absentVisits.filter(v => v.nearestLandmark).length} / {absentVisits.length}</span>
                  </div>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <MapPin size={16} />
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-150 flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400 font-mono">Evidence Photos Snapped</span>
                    <span className="text-lg font-black text-slate-800">{absentVisits.filter(v => v.photo).length} / {absentVisits.length}</span>
                  </div>
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                    📷
                  </div>
                </div>
              </div>
            </div>

            {/* Cards list */}
            {absentVisits.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center" id="empty-absent-state">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-slate-800 font-bold font-sans text-sm">Perfect Attendance Record</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No client absent visits registered! All scheduled site syncs were registered with active customers on-site.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="absent-site-grid">
                {absentVisits.map((visit) => {
                const isHot = visit.leadStatus === 'hot';
                
                // Format phone number specifically for WhatsApp (using 91 code for India if no country code exists)
                let cleanPhone = (visit.clientMobile || '').replace(/\D/g, ''); 
                if (cleanPhone.length === 10) {
                  cleanPhone = '91' + cleanPhone;
                } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
                  cleanPhone = '91' + cleanPhone.substring(1);
                }
                const customizedText = whatsappTemplate
                  .replace('[Client]', visit.clientName)
                  .replace('[Address]', visit.address || 'villas/apartments site')
                  .replace('[Date]', visit.visitingDate);
                  
                const waUrl = `https://wa.me/${cleanPhone}/?text=${encodeURIComponent(customizedText)}`;

                const handleShareGoogleMapsLocal = () => {
                  if (visit.latitude && visit.longitude) {
                    openExternalUrl(`https://www.google.com/maps/dir/?api=1&destination=${visit.latitude},${visit.longitude}`);
                  } else {
                    openExternalUrl(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(visit.address)}`);
                  }
                };

                return (
                  <div 
                    key={visit.id} 
                    className="bg-white rounded-2xl border border-slate-150 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-5 flex flex-col justify-between hover:shadow-md transition relative"
                  >
                    {/* Top line info */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 font-sans">
                          <span className="text-[10px] text-rose-600 font-bold uppercase tracking-widest font-mono flex items-center gap-1">
                            📅 {visit.visitingDate}
                          </span>
                          <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{visit.clientName}</h3>
                          <div className="flex flex-wrap gap-1 items-center mt-1">
                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold border border-slate-150">
                              Stage: {visit.buildingStatus}
                            </span>
                            {visit.buildingType && (
                              <span className="text-[10px] bg-amber-50 text-amber-805 px-2 py-0.5 rounded font-extrabold border border-amber-200/50 uppercase flex items-center gap-1">
                                <span>{visit.buildingType === 'Home' ? '🏠' : visit.buildingType === 'Apartment' ? '🏢' : '🏡'}</span>
                                <span>{visit.buildingType}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Photo container with zoom handler */}
                        {visit.photo ? (
                          <div 
                            onClick={() => setSelectedImage(visit.photo)}
                            className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in group shrink-0"
                            title="Zoom site photo evidence"
                          >
                            <img src={visit.photo} alt="site" className="w-full h-full object-cover group-hover:scale-105 duration-200" />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 duration-150 flex items-center justify-center text-white text-[9px] font-bold">
                              ZOOM
                            </div>
                          </div>
                        ) : (
                          <div className="w-14 h-14 bg-slate-50 text-slate-400 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-[8px] font-mono shrink-0 select-none">
                            <span>NO PHOTO</span>
                          </div>
                        )}
                      </div>

                      {/* Site address & landmark */}
                      <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-150 text-xs">
                        <div>
                          <span className="text-[8px] font-bold text-slate-400 font-mono uppercase tracking-wider block font-sans">Site Location Address</span>
                          <p className="text-slate-750 font-sans leading-relaxed font-semibold">{visit.address}</p>
                        </div>

                        {visit.location && (
                          <div className="border-t border-slate-200/50 pt-2 mt-1">
                            <span className="text-[8px] font-bold text-indigo-405 font-mono uppercase tracking-wider block font-sans">Location / Area</span>
                            <p className="text-indigo-850 font-sans leading-relaxed font-semibold">{visit.location}</p>
                          </div>
                        )}

                        {visit.nextFollowUpDate && (
                          <div className="border-t border-slate-200/50 pt-2 mt-1 flex items-start gap-1 font-sans">
                            <span className="text-xs text-teal-600">📅</span>
                            <div>
                              <span className="text-[8px] font-bold text-teal-600 font-mono uppercase tracking-wider block">Next Follow-Up Date</span>
                              <p className="font-extrabold text-teal-800 leading-snug">{visit.nextFollowUpDate}</p>
                            </div>
                          </div>
                        )}

                        {visit.nearestLandmark && (
                          <div className="border-t border-slate-200/50 pt-2 mt-1 flex items-start gap-1 font-sans">
                            <span className="text-xs">🧭</span>
                            <div>
                              <span className="text-[8px] font-bold text-slate-400 font-mono uppercase tracking-wider block">Nearest Landmark</span>
                              <p className="font-bold text-slate-800 leading-snug">{visit.nearestLandmark}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Follow up Notes & Remarks */}
                      {visit.notes && (
                        <div className="space-y-1 border-l-2 border-indigo-400 pl-2.5 text-xs">
                          <span className="text-[8px] uppercase font-bold text-slate-400 font-mono tracking-wider font-sans">Follow-Up Note</span>
                          <p className="text-slate-650 font-serif leading-relaxed italic">"{visit.notes}"</p>
                        </div>
                      )}
                    </div>

                    {/* Management & Status Actions */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs">
                      {onEditVisit && (
                        <button
                          type="button"
                          onClick={() => onEditVisit(visit)}
                          className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-205 text-slate-700 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                          title="Edit client and site details"
                          id={`btn-edit-absent-${visit.id}`}
                        >
                          <Edit2 size={12} className="text-slate-500" />
                          <span>Edit Details</span>
                        </button>
                      )}

                      {onQuickSave && (
                        <button
                          type="button"
                          onClick={() => {
                            onQuickSave({
                              ...visit,
                              customerNotAvailable: false
                            });
                          }}
                          className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-800 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                          title="Update report status: mark this customer as present & available"
                          id={`btn-mark-available-${visit.id}`}
                        >
                          <Check size={12} className="text-emerald-600 font-extrabold" />
                          <span>Mark Available</span>
                        </button>
                      )}
                    </div>

                    {/* Bottom actionable controls specifically for getting in touch */}
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={handleShareGoogleMapsLocal}
                        className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Navigate to this site address using Google Maps Directions"
                      >
                        <Compass size={13} className="text-indigo-500 animate-spin-slow" />
                        <span>Navigate GPS</span>
                      </button>

                      <a 
                        href={`tel:${visit.clientMobile}`}
                        className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Call client"
                      >
                        <Phone size={13} className="text-slate-650" />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setWhatsappSelectModal({
                            phone: cleanPhone,
                            text: customizedText,
                            name: visit.clientName
                          });
                        }}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        title="WhatsApp client"
                      >
                        <MessageCircle size={13} className="text-emerald-600" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeHomeTab === 'dealers' && (
        <div className="space-y-6 animate-fade-in" id="dealers-portal-view">
          {/* Header element */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-slate-950 font-sans tracking-tight flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-100 text-amber-600 text-xs">🏬</span>
                  <span>Dealer Point Directory & Logs</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Register active localized dealer stores, track sales point details, and initiate immediate follow-up connections.
                </p>
              </div>
              
              {/* Modern Search field for Dealers */}
              <div className="relative w-full md:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search dealers by name, point or place..."
                  value={dealersSearchQuery}
                  onChange={(e) => setDealersSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition font-sans text-slate-800"
                />
                {dealersSearchQuery && (
                  <button
                    onClick={() => setDealersSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-450 hover:text-slate-750 text-[10px] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Quick dealer KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                <span className="text-[9.5px] uppercase font-mono tracking-wider font-extrabold text-slate-550 block">Total Dealers Registered</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {dealers.length}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                <span className="text-[9.5px] uppercase font-mono tracking-wider font-extrabold text-slate-550 block">Unique Dealer Places</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {new Set(dealers.map(d => d.place.trim())).size}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center col-span-2 lg:col-span-1">
                <span className="text-[9.5px] uppercase font-mono tracking-wider font-extrabold text-slate-550 block font-bold">Active Connections Today</span>
                <span className="text-xl font-black text-emerald-600 mt-1 block">
                  🟢 Synchronous
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Split col 1: Register form (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-mono">
                    ➕ Register New Dealer
                  </h3>
                  <p className="text-[10px] text-slate-505 mt-0.5">
                    Submit mobile, outlet point, and rep name details.
                  </p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  setDealerError('');
                  setDealerSuccess('');

                  if (!dealerName.trim()) {
                    setDealerError('Representative Name is required.');
                    return;
                  }
                  if (!dealerPointName.trim()) {
                    setDealerError('Dealer Point Name is required.');
                    return;
                  }
                  if (!dealerPlace.trim()) {
                    setDealerError('Place / Location is required.');
                    return;
                  }
                  if (!dealerMobile.trim()) {
                    setDealerError('Mobile contact number is required.');
                    return;
                  }
                  if (!/^\+?[0-9\s-]{10,15}$/.test(dealerMobile.trim().replace(/\s+/g, ''))) {
                    setDealerError('Please enter a valid mobile number (at least 10 digits).');
                    return;
                  }

                  if (onSaveDealer) {
                    onSaveDealer({
                      name: dealerName.trim(),
                      dealerPointName: dealerPointName.trim(),
                      place: dealerPlace.trim(),
                      mobile: dealerMobile.trim()
                    });
                    setDealerSuccess('🎉 Dealer registered successfully!');
                    setDealerName('');
                    setDealerPointName('');
                    setDealerPlace('');
                    setDealerMobile('');
                    setTimeout(() => setDealerSuccess(''), 3000);
                  }
                }} className="space-y-4">
                  {dealerError && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-lg text-xs font-semibold leading-relaxed font-sans">
                      ⚠️ {dealerError}
                    </div>
                  )}

                  {dealerSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-lg text-xs font-semibold leading-relaxed font-sans">
                      {dealerSuccess}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 font-mono block">
                      Dealer Representative Name *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition text-slate-800 font-sans"
                      placeholder="e.g. Anand Sharma"
                      value={dealerName}
                      onChange={(e) => setDealerName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 font-mono block">
                      Dealer Point Name / Outlet *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition text-slate-800 font-sans"
                      placeholder="e.g. Tirumala Hardware & Plywoods"
                      value={dealerPointName}
                      onChange={(e) => setDealerPointName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1 block">
                    <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 font-mono block">
                      Place / Location *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition text-slate-800 font-sans"
                      placeholder="e.g. Tanuku"
                      value={dealerPlace}
                      onChange={(e) => setDealerPlace(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 font-mono block">
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition text-slate-800 font-sans font-mono"
                      placeholder="e.g. 9848523456"
                      value={dealerMobile}
                      onChange={(e) => setDealerMobile(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-wider text-white rounded-lg text-xs shadow-md shadow-indigo-100 transition duration-200 cursor-pointer active:scale-98 font-sans"
                  >
                    Save Dealer Point
                  </button>
                </form>
              </div>
            </div>

            {/* Split col 2: Registered Dealers List (7 cols) */}
            <div className="lg:col-span-7">
              {(() => {
                const query = dealersSearchQuery.trim().toLowerCase();
                const filteredDealers = dealers.filter((d) => {
                  return (
                    d.name.toLowerCase().includes(query) ||
                    d.dealerPointName.toLowerCase().includes(query) ||
                    d.place.toLowerCase().includes(query) ||
                    d.mobile.includes(query)
                  );
                });

                if (filteredDealers.length === 0) {
                  return (
                    <div className="bg-white border border-slate-250 rounded-2xl p-12 text-center text-slate-500 font-sans space-y-3">
                      <span className="text-3xl block">🏬</span>
                      <h4 className="text-sm font-semibold text-slate-800">No Matching Dealers Found</h4>
                      <p className="text-xs max-w-sm mx-auto text-slate-450 leading-relaxed">
                        {query ? "We couldn't locate any records matching your search queries. Try modifying your search." : "No dealers registered yet. Use the form on the left to add active dealer outlets."}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    {filteredDealers.map((dealer) => {
                      const cleanPhone = dealer.mobile.replace(/\D/g, '');
                      const customizedText = `Hello ${dealer.name}, this is a sales representative following up regarding updates of dealer point: ${dealer.dealerPointName} at ${dealer.place}.`;

                      return (
                        <div
                          key={dealer.id}
                          className="bg-white border border-slate-200 hover:border-indigo-200 rounded-xl p-4.5 shadow-2xs hover:shadow-xs transition duration-200 flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            {/* Header row with Delete */}
                            <div className="flex items-start justify-between gap-1">
                              <div className="space-y-0.5">
                                <span className="text-[9.5px] uppercase font-mono tracking-wider font-extrabold text-amber-600 flex items-center gap-1">
                                  <Store size={10} />
                                  <span>Dealer Point</span>
                                </span>
                                <h4 className="text-sm font-black text-slate-900 leading-tight font-sans tracking-tight block break-words">
                                  {dealer.dealerPointName}
                                </h4>
                              </div>
                              {onDeleteDealer && (
                                <button
                                  onClick={() => onDeleteDealer(dealer.mobile)}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Delete dealer profile"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>

                            {/* Details list */}
                            <div className="space-y-1 text-slate-600 font-sans text-xs">
                              <p className="flex items-center gap-1.5 font-medium">
                                <span className="text-slate-455 font-semibold">Rep Name:</span>
                                <span className="text-slate-850 font-extrabold">{dealer.name}</span>
                              </p>
                              <p className="flex items-center gap-1.5">
                                <span className="text-slate-455 font-semibold">Place:</span>
                                <span className="text-slate-805 font-bold">{dealer.place}</span>
                              </p>
                              <p className="flex items-center gap-1.5">
                                <span className="text-slate-455 font-semibold">Mobile:</span>
                                <span className="text-slate-805 font-mono">{dealer.mobile}</span>
                              </p>
                            </div>
                          </div>

                          {/* Connection Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                            {/* Call button */}
                            <a
                              href={`tel:${dealer.mobile}`}
                              className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <PhoneCall size={11} className="text-slate-550" />
                              <span>Call</span>
                            </a>

                            {/* WhatsApp option */}
                            <button
                              type="button"
                              onClick={() => {
                                setWhatsappSelectModal({
                                  phone: cleanPhone,
                                  text: customizedText,
                                  name: dealer.name
                                });
                              }}
                              className="py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-700 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <MessageCircle size={11} className="text-emerald-650" />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activeHomeTab === 'partners' && (
        <div className="space-y-6 animate-fade-in" id="partners-portal-view">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-slate-950 font-sans tracking-tight flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-pink-100 text-pink-600 text-xs">🤝</span>
                  <span>Site Partners & Assignments</span>
                </h2>
                <p className="text-xs text-slate-500">
                  View site details assigned to Carpenters, Interior Designers, and Architects.
                </p>
              </div>
              
              <div className="relative w-full md:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search partners or site details..."
                  value={dirSearchQuery}
                  onChange={(e) => setDirSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-600 transition font-sans text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-8">
              {/* Carpenters Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-mono border-b border-slate-100 pb-2">
                  <Wrench size={14} className="text-amber-600" />
                  <span>Carpenters ({carpenters.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {carpenters.filter(c => 
                    c.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) || 
                    c.mobile.includes(dirSearchQuery)
                  ).map(partner => {
                    const assignedSites = visits.filter(v => v.contractorMobile === partner.mobile || v.carpenterMobile === partner.mobile);
                    return (
                      <div key={partner.id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{partner.name}</h4>
                            <p className="text-[10px] font-mono text-slate-500">{partner.mobile}</p>
                          </div>
                          <a href={`tel:${partner.mobile}`} className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 transition">
                            <Phone size={12} className="text-indigo-600" />
                          </a>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Assigned Sites</span>
                          <div className="space-y-1.5">
                            {assignedSites.length > 0 ? assignedSites.map((v, i) => (
                              <div key={i} className="text-[10px] bg-white border border-slate-200 p-3 rounded-xl shadow-sm space-y-2">
                                <div className="flex gap-2">
                                  {v.photo && (
                                    <SitePhotoItem 
                                      visit={v} 
                                      onEnlarge={setSelectedImage}
                                      className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0 relative group/img cursor-zoom-in"
                                      imageClassName="w-full h-full object-cover"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <h5 className="font-bold text-slate-900 truncate">{v.clientName}</h5>
                                    <a href={`tel:${v.clientMobile}`} className="text-indigo-600 font-bold flex items-center gap-1 mt-0.5" onClick={(e)=>e.stopPropagation()}>
                                      <Phone size={10} />
                                      <span>{v.clientMobile}</span>
                                    </a>
                                  </div>
                                </div>
                                <p className="text-slate-600 leading-snug">📍 {v.address}</p>
                                {v.location && <p className="text-[9px] text-slate-400 font-medium">Area: {v.location}</p>}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                                  <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-100">{v.buildingStatus}</span>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      title="Share Location"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const mapUrl = v.latitude && v.longitude 
                                          ? `https://www.google.com/maps?q=${v.latitude},${v.longitude}`
                                          : `https://www.google.com/maps?q=${encodeURIComponent(v.address)}`;
                                        
                                        shareVisitDetails({
                                          title: 'Customer Location',
                                          text: `*Client Site Detail*\n\n*Client:* ${v.clientName}\n*Mobile:* ${v.clientMobile}\n*Address:* ${v.address}`,
                                          url: mapUrl,
                                          photo: v.photo
                                        });
                                      }}
                                      className="p-1 px-2 bg-slate-100/80 text-slate-600 rounded flex items-center gap-1 hover:bg-slate-200 transition font-extrabold cursor-pointer"
                                    >
                                      <Share2 size={10} />
                                      <span className="text-[9px]">Share</span>
                                    </button>
                                    <span className="text-[8px] text-slate-400 font-mono">{formatDateToDDMMYYYY(v.visitingDate)}</span>
                                  </div>
                                </div>
                              </div>
                            )) : <p className="text-[9px] text-slate-400 italic">No sites assigned yet</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interior Designers Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-mono border-b border-slate-100 pb-2">
                  <Paintbrush size={14} className="text-purple-600" />
                  <span>Interior Designers ({interiors.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {interiors.filter(i => 
                    i.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) || 
                    i.mobile.includes(dirSearchQuery)
                  ).map(partner => {
                    const assignedSites = visits.filter(v => v.contractorMobile === partner.mobile || v.interiorMobile === partner.mobile);
                    return (
                      <div key={partner.id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{partner.name}</h4>
                            <p className="text-[10px] font-mono text-slate-500">{partner.mobile}</p>
                          </div>
                          <a href={`tel:${partner.mobile}`} className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 transition">
                            <Phone size={12} className="text-indigo-600" />
                          </a>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Assigned Sites</span>
                          <div className="space-y-1.5">
                            {assignedSites.length > 0 ? assignedSites.map((v, i) => (
                              <div key={i} className="text-[10px] bg-white border border-slate-200 p-3 rounded-xl shadow-sm space-y-2">
                                <div className="flex gap-2">
                                  {v.photo && (
                                    <SitePhotoItem 
                                      visit={v} 
                                      onEnlarge={setSelectedImage}
                                      className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0 relative group/img cursor-zoom-in"
                                      imageClassName="w-full h-full object-cover"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <h5 className="font-bold text-slate-900 truncate">{v.clientName}</h5>
                                    <a href={`tel:${v.clientMobile}`} className="text-indigo-600 font-bold flex items-center gap-1 mt-0.5" onClick={(e)=>e.stopPropagation()}>
                                      <Phone size={10} />
                                      <span>{v.clientMobile}</span>
                                    </a>
                                  </div>
                                </div>
                                <p className="text-slate-600 leading-snug">📍 {v.address}</p>
                                {v.location && <p className="text-[9px] text-slate-400 font-medium">Area: {v.location}</p>}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                                  <span className="text-[8px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-100">{v.buildingStatus}</span>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      title="Share Location"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const mapUrl = v.latitude && v.longitude 
                                          ? `https://www.google.com/maps?q=${v.latitude},${v.longitude}`
                                          : `https://www.google.com/maps?q=${encodeURIComponent(v.address)}`;
                                        
                                        shareVisitDetails({
                                          title: 'Customer Location',
                                          text: `*Client Site Detail*\n\n*Client:* ${v.clientName}\n*Mobile:* ${v.clientMobile}\n*Address:* ${v.address}`,
                                          url: mapUrl,
                                          photo: v.photo
                                        });
                                      }}
                                      className="p-1 px-2 bg-slate-100/80 text-slate-600 rounded flex items-center gap-1 hover:bg-slate-200 transition font-extrabold cursor-pointer"
                                    >
                                      <Share2 size={10} />
                                      <span className="text-[9px]">Share</span>
                                    </button>
                                    <span className="text-[8px] text-slate-400 font-mono">{formatDateToDDMMYYYY(v.visitingDate)}</span>
                                  </div>
                                </div>
                              </div>
                            )) : <p className="text-[9px] text-slate-400 italic">No sites assigned yet</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Architects Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-mono border-b border-slate-100 pb-2">
                  <Building2 size={14} className="text-blue-600" />
                  <span>Architects ({architects.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {architects.filter(a => 
                    a.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) || 
                    a.mobile.includes(dirSearchQuery)
                  ).map(partner => {
                    const assignedSites = visits.filter(v => v.contractorMobile === partner.mobile || v.architectMobile === partner.mobile);
                    return (
                      <div key={partner.id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{partner.name}</h4>
                            <p className="text-[10px] font-mono text-slate-500">{partner.mobile}</p>
                          </div>
                          <a href={`tel:${partner.mobile}`} className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 transition">
                            <Phone size={12} className="text-indigo-600" />
                          </a>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Assigned Sites</span>
                          <div className="space-y-1.5">
                            {assignedSites.length > 0 ? assignedSites.map((v, i) => (
                              <div key={i} className="text-[10px] bg-white border border-slate-200 p-3 rounded-xl shadow-sm space-y-2">
                                <div className="flex gap-2">
                                  {v.photo && (
                                    <SitePhotoItem 
                                      visit={v} 
                                      onEnlarge={setSelectedImage}
                                      className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0 relative group/img cursor-zoom-in"
                                      imageClassName="w-full h-full object-cover"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <h5 className="font-bold text-slate-900 truncate">{v.clientName}</h5>
                                    <a href={`tel:${v.clientMobile}`} className="text-indigo-600 font-bold flex items-center gap-1 mt-0.5" onClick={(e)=>e.stopPropagation()}>
                                      <Phone size={10} />
                                      <span>{v.clientMobile}</span>
                                    </a>
                                  </div>
                                </div>
                                <p className="text-slate-600 leading-snug">📍 {v.address}</p>
                                {v.location && <p className="text-[9px] text-slate-400 font-medium">Area: {v.location}</p>}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                                  <span className="text-[8px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-100">{v.buildingStatus}</span>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      title="Share Location"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const mapUrl = v.latitude && v.longitude 
                                          ? `https://www.google.com/maps?q=${v.latitude},${v.longitude}`
                                          : `https://www.google.com/maps?q=${encodeURIComponent(v.address)}`;
                                        
                                        shareVisitDetails({
                                          title: 'Customer Location',
                                          text: `*Client Site Detail*\n\n*Client:* ${v.clientName}\n*Mobile:* ${v.clientMobile}\n*Address:* ${v.address}`,
                                          url: mapUrl,
                                          photo: v.photo
                                        });
                                      }}
                                      className="p-1 px-2 bg-slate-100/80 text-slate-600 rounded flex items-center gap-1 hover:bg-slate-200 transition font-extrabold cursor-pointer"
                                    >
                                      <Share2 size={10} />
                                      <span className="text-[9px]">Share</span>
                                    </button>
                                    <span className="text-[8px] text-slate-400 font-mono">{formatDateToDDMMYYYY(v.visitingDate)}</span>
                                  </div>
                                </div>
                              </div>
                            )) : <p className="text-[9px] text-slate-400 italic">No sites assigned yet</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Builders Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-mono border-b border-slate-100 pb-2">
                  <Briefcase size={14} className="text-amber-700" />
                  <span>Builders ({builders.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {builders.filter(b => 
                    b.name.toLowerCase().includes(dirSearchQuery.toLowerCase()) || 
                    b.mobile.includes(dirSearchQuery)
                  ).map(partner => {
                    const assignedSites = visits.filter(v => v.contractorMobile === partner.mobile || v.builderMobile === partner.mobile);
                    return (
                      <div key={partner.id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{partner.name}</h4>
                            <p className="text-[10px] font-mono text-slate-500">{partner.mobile}</p>
                          </div>
                          <a href={`tel:${partner.mobile}`} className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 transition">
                            <Phone size={12} className="text-indigo-600" />
                          </a>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Assigned Sites</span>
                          <div className="space-y-1.5">
                            {assignedSites.length > 0 ? assignedSites.map((v, i) => (
                              <div key={i} className="text-[10px] bg-white border border-slate-200 p-3 rounded-xl shadow-sm space-y-2">
                                <div className="flex gap-2">
                                  {v.photo && (
                                    <SitePhotoItem 
                                      visit={v} 
                                      onEnlarge={setSelectedImage}
                                      className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0 relative group/img cursor-zoom-in"
                                      imageClassName="w-full h-full object-cover"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <h5 className="font-bold text-slate-900 truncate">{v.clientName}</h5>
                                    <a href={`tel:${v.clientMobile}`} className="text-indigo-600 font-bold flex items-center gap-1 mt-0.5" onClick={(e)=>e.stopPropagation()}>
                                      <Phone size={10} />
                                      <span>{v.clientMobile}</span>
                                    </a>
                                  </div>
                                </div>
                                <p className="text-slate-600 leading-snug">📍 {v.address}</p>
                                {v.location && <p className="text-[9px] text-slate-400 font-medium">Area: {v.location}</p>}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                                  <span className="text-[8px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-100">{v.buildingStatus}</span>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      title="Share Location"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const mapUrl = v.latitude && v.longitude 
                                          ? `https://www.google.com/maps?q=${v.latitude},${v.longitude}`
                                          : `https://www.google.com/maps?q=${encodeURIComponent(v.address)}`;
                                        
                                        shareVisitDetails({
                                          title: 'Customer Location',
                                          text: `*Client Site Detail*\n\n*Client:* ${v.clientName}\n*Mobile:* ${v.clientMobile}\n*Address:* ${v.address}`,
                                          url: mapUrl,
                                          photo: v.photo
                                        });
                                      }}
                                      className="p-1 px-2 bg-slate-100/80 text-slate-600 rounded flex items-center gap-1 hover:bg-slate-200 transition font-extrabold cursor-pointer"
                                    >
                                      <Share2 size={10} />
                                      <span className="text-[9px]">Share</span>
                                    </button>
                                    <span className="text-[8px] text-slate-400 font-mono">{formatDateToDDMMYYYY(v.visitingDate)}</span>
                                  </div>
                                </div>
                              </div>
                            )) : <p className="text-[9px] text-slate-400 italic">No sites assigned yet</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeHomeTab === 'call' && (
        <CallManager />
      )}

      {activeHomeTab === 'completed' && (
        <div className="space-y-6 animate-fade-in" id="completed-sites-view">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-slate-950 font-sans tracking-tight flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 text-xs">✅</span>
                  <span>Completed Sites & Archives</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Browse finalized sites, view full archived record histories, or restore client accounts back to active tracking.
                </p>
              </div>
              
              {/* Search field for Completed Sites */}
              <div className="relative w-full md:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search completed sites..."
                  value={completedSearchQuery}
                  onChange={(e) => setCompletedSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-slate-850 font-sans"
                />
              </div>
            </div>

            {(() => {
              const query = completedSearchQuery.trim().toLowerCase();
              const filteredCompleted = completedCustomers.filter(c => {
                return (
                  c.name.toLowerCase().includes(query) ||
                  c.address.toLowerCase().includes(query) ||
                  c.mobile.includes(query)
                );
              });

              if (filteredCompleted.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-500 font-sans space-y-2">
                    <p className="text-xs md:text-sm font-semibold">No completed sites found.</p>
                    <p className="text-[11px] text-slate-400">Mark some customers as complete from their Client Details sheet to find them here.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                  {filteredCompleted.map((customer) => {
                    return (
                      <div 
                        key={customer.mobile} 
                        className="bg-white border border-slate-150 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-extrabold text-slate-900 text-sm font-sans tracking-tight block">
                              {customer.name}
                            </span>
                            <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-150 shrink-0">
                              Completed
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-slate-500 text-xs">
                            <p className="flex items-center gap-1.5 leading-none">
                              <span className="shrink-0 text-slate-405">📍</span>
                              <span className="truncate font-semibold">{customer.address}</span>
                            </p>
                            <p className="flex items-center gap-1.5 leading-none font-mono">
                              <span className="shrink-0 text-slate-405">📞</span>
                              <span>{customer.mobile}</span>
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                          {/* Details sheet button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDirItem({
                                type: 'customer',
                                data: customer
                              });
                            }}
                            title="Detailed Logs"
                            className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye size={11} className="text-slate-500" />
                            <span>Logs</span>
                          </button>

                          {/* Restore direct shortcut button */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (onToggleCompleteCustomer) {
                                await onToggleCompleteCustomer(customer.mobile, false);
                              }
                            }}
                            title="Restore Active"
                            className="py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <RefreshCw size={11} className="text-teal-650" />
                            <span>Restore</span>
                          </button>

                          {/* Permanently delete shortcut button */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (onDeleteCustomer) {
                                await onDeleteCustomer(customer.mobile);
                              }
                            }}
                            title="Permanently Delete"
                            className="py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={11} className="text-rose-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Zoomed Photo Modal for Client Absent Sites */}
      <AnimatePresence>
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setSelectedImage(null)}
            id="image-enlarge-modal-absent"
          >
            <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 p-2 bg-slate-800/80 hover:bg-slate-800 text-white rounded-full transition shadow cursor-pointer shadow-lg"
                id="btn-close-enlarge-absent"
              >
                <X size={20} />
              </button>
              <img
                src={selectedImage}
                alt="Enlarged site evidence"
                className="rounded-xl max-h-[80vh] w-full object-contain mx-auto shadow-2xl border border-slate-800 bg-slate-900"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOWS FOR QUICK ADD CUSTOMERS, CARPENTERS, INTERIORS */}
      {quickAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 w-full max-w-md overflow-hidden">
            {/* Modal Heading Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 px-5 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold tracking-tight uppercase">
                  Quick Register: {quickAddModal}
                </h3>
                <p className="text-[11px] text-indigo-150 mt-0.5">
                  Save direct communication coordinates & sync inside database
                </p>
              </div>
              <button 
                onClick={closeAndResetQuickAdd}
                className="text-white hover:text-indigo-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form inputs */}
            <form onSubmit={handleQuickSubmit} className="p-5 space-y-4">
              {qaError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
                  {qaError}
                </div>
              )}



              {/* Core Name */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 font-sans capitalize">
                  {quickAddModal} Name {(quickAddModal === 'customer' && qaCustomerNotAvailable) ? '(Optional - Client Absent)' : '*'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    required={!(quickAddModal === 'customer' && qaCustomerNotAvailable)}
                    placeholder={(quickAddModal === 'customer' && qaCustomerNotAvailable) ? "Optional" : `e.g. Suresh Kumar`}
                    value={qaName}
                    onChange={(e) => setQaName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                  />
                </div>
              </div>

              {/* Core Phone Contact */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 font-sans capitalize">
                  {quickAddModal} Contact Mobile {(quickAddModal === 'customer' && qaCustomerNotAvailable) ? '(Optional - Client Absent)' : '*'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Phone size={15} />
                  </span>
                  <input
                    type="text"
                    required={!(quickAddModal === 'customer' && qaCustomerNotAvailable)}
                    placeholder={(quickAddModal === 'customer' && qaCustomerNotAvailable) ? "Optional" : "e.g. 9845123456"}
                    value={qaMobile}
                    onChange={(e) => setQaMobile(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                  />
                </div>
              </div>

              {/* Suggestions overlay/panel */}
              {qaContractorSuggestions.length > 0 && (
                <div className="bg-indigo-50/50 border border-indigo-150 rounded-xl p-2.5 space-y-1.5 font-sans">
                  <span className="font-extrabold block text-[9.5px] uppercase tracking-wider text-indigo-900">
                    Existing {quickAddModal} profiles found ({qaContractorSuggestions.length}):
                  </span>
                  <div className="max-h-24 overflow-y-auto divide-y divide-indigo-100 bg-white rounded-lg border border-indigo-100 p-1">
                    {qaContractorSuggestions.map((item) => (
                      <div 
                        key={item.mobile} 
                        onClick={() => {
                          setQaName(item.name);
                          setQaMobile(item.mobile);
                          if (item.address) setQaAddress(item.address);
                          if (item.location) setQaLocation(item.location);
                          if (item.contractorRemarks) setQaContractorRemarks(item.contractorRemarks);
                        }}
                        className="p-1 px-2 text-[10.5px] flex justify-between items-center hover:bg-indigo-50/70 transition cursor-pointer rounded"
                        title="Click to auto-fill details"
                      >
                        <span className="font-bold text-slate-800">{item.name}</span>
                        <span className="font-mono text-slate-500 text-[9.5px]">📞 {item.mobile}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[9px] text-indigo-700 block italic leading-none">
                    💡 Click any profile above to instantly auto-fill registered partner details!
                  </span>
                </div>
              )}

              {/* Physical site description / address split */}
              <div className={quickAddModal === 'customer' ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"} id="quick-add-address-grid">
                <div className={quickAddModal === 'customer' ? "" : "col-span-1"}>
                  <p className="block text-xs font-bold text-slate-600 mb-1.5 font-sans">
                    {quickAddModal === 'customer' ? 'City / Village (Place) *' : `${quickAddModal.charAt(0).toUpperCase() + quickAddModal.slice(1)} Place`}
                  </p>
                  <div className="relative">
                    <span className="absolute top-2.5 left-0 flex items-start pl-3 text-slate-400">
                      <MapPin size={14} />
                    </span>
                    <input
                      required={quickAddModal === 'customer'}
                      placeholder={quickAddModal === 'customer' ? 'e.g. Tadepalligudem' : `e.g. ${quickAddModal === 'carpenter' ? 'Workshop Place' : quickAddModal === 'architect' ? 'Office / Main Studio Place' : 'Studio/Office Place'}...`}
                      value={qaAddress}
                      onChange={(e) => setQaAddress(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                      id="quick-add-address-input"
                    />
                  </div>
                </div>

                {quickAddModal === 'customer' && (
                  <div>
                    <p className="block text-xs font-bold text-slate-600 mb-1.5 font-sans">
                      Location / Area (Town / Ward) <span className="text-slate-400 font-normal italic lowercase">(Optional)</span>
                    </p>
                    <div className="relative">
                      <span className="absolute top-2.5 left-0 flex items-start pl-3 text-slate-400">
                        <Navigation size={14} className="rotate-45" />
                      </span>
                      <input
                        placeholder="e.g. Gachibowli, Madhapur"
                        value={qaLocation}
                        onChange={(e) => setQaLocation(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                        id="quick-add-location-input"
                      />
                    </div>
                  </div>
                )}
              </div>

              {quickAddModal !== 'customer' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 font-sans capitalize">
                    {quickAddModal} Remarks / Key Specialties
                  </label>
                  <textarea
                    rows={2}
                    placeholder={quickAddModal === 'architect' ? 'e.g. Specialized in residential elevation, interior detailing, zoning, and Vastu compliance...' : `e.g. Specialized in premium modular kitchen setups, customized veneer wardrobes, or detailed commercial interior designs...`}
                    value={qaContractorRemarks}
                    onChange={(e) => setQaContractorRemarks(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                    id="quick-add-contractor-remarks"
                  />
                </div>
              )}

              {quickAddModal === 'customer' && (
                <div className="space-y-4 pt-1">
                  {/* Landmark field - unconditional */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 font-sans flex justify-between">
                      <span>Nearest Landmark {qaCustomerNotAvailable && <span className="text-orange-600 font-bold">*</span>}</span>
                      {!qaCustomerNotAvailable && <span className="text-slate-400 font-normal italic lowercase">optional</span>}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                        <MapPin size={13} className="text-indigo-600" />
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. Near Big Banyan Tree"
                        value={qaNearestLandmark}
                        required={qaCustomerNotAvailable}
                        onChange={(e) => setQaNearestLandmark(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition font-sans font-medium"
                      />
                    </div>
                  </div>

                  {/* Absent Customer check */}
                  <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <div className="pr-2">
                      <span className="block text-[11px] font-bold text-slate-855">👤 Customer Not Available</span>
                      <span className="block text-[9px] text-slate-500 font-sans leading-tight">Check if the site owner is absent or unavailable.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={qaCustomerNotAvailable} 
                        onChange={(e) => setQaCustomerNotAvailable(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  {qaCustomerNotAvailable && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-orange-50/60 border border-orange-200/60 rounded-xl p-3 space-y-3"
                    >
                      {/* Photo Snap upload field */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 font-sans">
                          Snap Site Photo *
                        </label>
                        <div className="flex gap-2 items-center">
                          <label className="flex-1 border-2 border-dashed border-slate-200 hover:border-orange-400 bg-white hover:bg-orange-50/10 p-3 rounded-lg text-center cursor-pointer transition flex flex-col items-center justify-center">
                            <span className="text-xs text-orange-600 font-semibold flex items-center gap-1.5">
                              📷 Upload Photo
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5 font-sans leading-tight">Click/Tap to snap or upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const r = new FileReader();
                                  r.onloadend = async () => {
                                    const rawBase64 = r.result as string;
                                    const compressed = await compressImage(rawBase64);
                                    setQaPhoto(compressed);
                                  };
                                  r.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>

                          {qaPhoto && (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-55 flex-shrink-0 group">
                              <img src={qaPhoto} alt="Site" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setQaPhoto(null)}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] uppercase font-bold transition cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Duplicate Prevention inside Quick Add Modal */}
              {qaDuplicates.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 font-sans" id="container-qa-duplicates">
                  <div className="flex gap-2 items-start text-amber-900">
                    <span className="text-xs select-none">⚠️</span>
                    <div className="flex-1">
                      <span className="font-extrabold block text-[10px] uppercase tracking-wider text-amber-950 font-sans">
                        Similar Entry Warning ({qaDuplicates.length})
                      </span>
                      <span className="text-[9.5px] text-amber-800 block mt-0.5 leading-normal font-sans">
                        A registered record contains similar details. Please double-check to prevent logging duplicates by mistake:
                      </span>
                    </div>
                  </div>

                  <div className="max-h-24 overflow-y-auto divide-y divide-amber-100 bg-white/95 rounded-lg border border-amber-150">
                    {qaDuplicates.map(({ visit, reasons }) => (
                      <div key={visit.id} className="p-2 text-[10.5px] flex justify-between items-center gap-2 hover:bg-amber-55/10 transition">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-bold text-slate-800">
                              {quickAddModal === 'customer' ? visit.clientName : (quickAddModal === 'carpenter' ? visit.contractorName : visit.contractorName)}
                            </span>
                            {reasons.map(r => (
                              <span key={r} className="text-[7.5px] font-mono font-extrabold bg-amber-100/80 text-amber-800 px-1 rounded uppercase">
                                {r}
                              </span>
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-500 leading-none">
                            📍 {visit.address}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setQaName(quickAddModal === 'customer' ? visit.clientName : (quickAddModal === 'carpenter' ? visit.contractorName || '' : visit.contractorName || ''));
                            setQaMobile(quickAddModal === 'customer' ? visit.clientMobile : (quickAddModal === 'carpenter' ? visit.contractorMobile || '' : visit.contractorMobile || ''));
                            setQaAddress(visit.address);
                            setQaLocation(visit.location || '');
                            if (visit.nearestLandmark) {
                              setQaNearestLandmark(visit.nearestLandmark);
                            }
                            if (visit.photo) {
                              setQaPhoto(visit.photo);
                            }
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[8.5px] font-bold border border-indigo-150 transition cursor-pointer"
                        >
                          Use
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action submit buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeAndResetQuickAdd}
                  className="flex-1 py-2 text-xs font-semibold uppercase tracking-wide border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold uppercase tracking-wide bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition cursor-pointer"
                >
                  Register Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECTORY ITEM DETAIL SHEET MODAL */}
      {selectedDirItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col font-sans text-slate-800">
            {/* Modal Heading Header */}
            <div className="bg-slate-900 px-5 py-4 text-white flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-indigo-400 block font-mono">
                  Directory Metadata Sheet
                </span>
                <h3 className="text-sm font-extrabold tracking-tight uppercase flex items-center gap-1.5 mt-0.5">
                  {selectedDirItem.type === 'customer' ? '👤 Customer Profile' : selectedDirItem.type === 'carpenter' ? '🪚 Carpenter Specialist' : selectedDirItem.type === 'architect' ? '🏗️ Architect Specialist' : selectedDirItem.type === 'builder' ? '👷 Builder Partner' : '🎨 Interior Designer'}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedDirItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer transition animate-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable details body content */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              
              {/* Item Info Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 leading-tight">
                      {selectedDirItem.data.name}
                    </h4>
                    <p className="text-[10.5px] text-slate-450 font-mono mt-0.5">
                      Registered Profile Number
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <a 
                      href={`tel:${selectedDirItem.data.mobile}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-150 transition cursor-pointer"
                    >
                      <PhoneCall size={12} className="text-indigo-600" />
                      <span>Call Client</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        let cleanPh = selectedDirItem.data.mobile.replace(/\D/g, '');
                        if (cleanPh.length === 10) {
                          cleanPh = '91' + cleanPh;
                        } else if (cleanPh.length === 11 && cleanPh.startsWith('0')) {
                          cleanPh = '91' + cleanPh.substring(1);
                        }
                        
                        let customText = `hello ${selectedDirItem.data.name} garu,how are you.projects going well, Regards`;
                        if (selectedDirItem.type === 'customer') {
                          customText = `hello ${selectedDirItem.data.name} garu,i recently visited your site, work progress is good 👍.thank you sir.`;
                        } else if (selectedDirItem.type === 'carpenter') {
                          customText = `hello ${selectedDirItem.data.name} garu,how are you.projects going well, Regards`;
                        } else if (selectedDirItem.type === 'architect') {
                          customText = `hello ${selectedDirItem.data.name} garu,how are you.projects going well, Regards`;
                        } else if (selectedDirItem.type === 'interior') {
                          customText = `hello ${selectedDirItem.data.name} garu,how are you.projects going well, Regards`;
                        }

                        setWhatsappSelectModal({
                          phone: cleanPh,
                          text: customText,
                          name: selectedDirItem.data.name
                        });
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-150 transition cursor-pointer"
                    >
                      <MessageCircle size={12} className="text-emerald-600 fill-emerald-50/20" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Last Active / Contacted</span>
                    <span className="font-bold text-slate-700">{selectedDirItem.data.lastVisitDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Associated Address</span>
                    <span className="font-medium text-slate-600 line-clamp-2" title={selectedDirItem.data.address}>{selectedDirItem.data.address || 'N/A'}</span>
                  </div>
                </div>

                {selectedDirItem.data.contractorRemarks && (
                  <div className="pt-2.5 border-t border-slate-200 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">{selectedDirItem.type === 'carpenter' ? 'Carpenter' : selectedDirItem.type === 'architect' ? 'Architect' : selectedDirItem.type === 'builder' ? 'Builder' : 'Interior Designer'} Remarks / Specialty</span>
                    <p className="font-bold text-slate-700 leading-normal mt-0.5 whitespace-pre-wrap">{selectedDirItem.data.contractorRemarks}</p>
                  </div>
                )}
              </div>

              {/* Dynamic conditional list of logs / projects */}
              {selectedDirItem.type === 'customer' ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    📋 Site Visit Log History ({visits.filter(v => v.clientMobile === selectedDirItem.data.mobile).length})
                  </h4>
                  
                  {(() => {
                    const clientVisits = visits.filter(v => v.clientMobile === selectedDirItem.data.mobile);
                    if (clientVisits.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 text-center py-4 italic">No visits recorded for this client mobile number.</p>
                      );
                    }
                    
                    return (
                      <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
                        {clientVisits.map((v, idx) => (
                          <div key={v.id || idx} className="bg-white border border-slate-150 rounded-xl p-3 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900">{v.visitingDate}</span>
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase font-mono tracking-wider ${
                                v.leadStatus === 'hot' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-50 text-slate-600'
                              }`}>
                                {v.leadStatus} Lead
                              </span>
                            </div>
                            
                            <p className="text-[11px] text-slate-650 bg-slate-50/50 p-2 rounded border border-slate-100/50">
                              <span className="font-mono text-[9px] uppercase text-slate-400 block mb-0.5">Progress Notes</span>
                              {v.notes || 'No notes added.'}
                            </p>

                            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                              <div>
                                <span className="text-slate-400 font-sans block">Physical status:</span>
                                <strong className="text-slate-700">{v.buildingStatus}</strong>
                              </div>
                              {v.contractorName && (
                                <div>
                                  <span className="text-slate-400 font-sans block">Connected partner:</span>
                                  <strong className="text-slate-700">{v.contractorName} ({v.contractorType})</strong>
                                </div>
                              )}
                            </div>

                            {v.nearestLandmark && (
                              <p className="text-[10px] text-slate-500">
                                📍 <strong>Landmark:</strong> {v.nearestLandmark}
                              </p>
                            )}

                            {v.photo && (
                              <div className="pt-1 flex items-center gap-2">
                                <img 
                                  src={v.photo} 
                                  alt="Visit Thumbnail" 
                                  className="w-12 h-12 rounded object-cover cursor-pointer border border-slate-200"
                                  onClick={() => handleCopyImageToClipboard(v.photo || '', selectedDirItem.data.name)}
                                  title="Click to copy or download"
                                />
                                <span className="text-[9.5px] text-indigo-600 font-medium font-sans">📷 Click photo thumbnail to copy/save</span>
                              </div>
                            )}

                            {/* Added Google Maps GPS Navigation button */}
                            {v.address && (
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-slate-500 truncate inline-block max-w-[150px]" title={v.address}>
                                  📍 {v.address}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (v.latitude && v.longitude) {
                                      openExternalUrl(`https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`);
                                    } else {
                                      openExternalUrl(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.address)}`);
                                    }
                                  }}
                                  className="text-[10px] bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 px-2 py-1 rounded font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                                  title="Open Google Maps Directions for this visit"
                                >
                                  <Compass size={11} className="text-indigo-500 animate-spin-slow" />
                                  <span>Navigate GPS</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider font-bold">
                    💼 Active Site Assignments / Partner Projects ({visits.filter(v => v.contractorMobile === selectedDirItem.data.mobile && v.contractorType === selectedDirItem.type).length})
                  </h4>
                  
                  {(() => {
                    const assignedVisits = visits.filter(v => v.contractorMobile === selectedDirItem.data.mobile && v.contractorType === selectedDirItem.type);
                    if (assignedVisits.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 text-center py-4 italic">No sites assigned to this partner yet.</p>
                      );
                    }
                    
                    return (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {assignedVisits.map((v, idx) => (
                          <div key={v.id || idx} className="bg-white border border-slate-150 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 text-xs block">{v.clientName}</span>
                              <span className="text-[10px] text-slate-500 block">📍 {v.address}</span>
                              <span className="text-[9.5px] text-slate-400 font-mono block">Registered Site Date: {v.visitingDate}</span>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <span className="px-2 py-0.5 rounded bg-slate-150 text-slate-700 text-[10px] font-bold">
                                {v.buildingStatus}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (v.latitude && v.longitude) {
                                    openExternalUrl(`https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`);
                                  } else {
                                    openExternalUrl(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.address)}`);
                                  }
                                }}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded hover:border-indigo-250 transition cursor-pointer"
                                title="Navigate to this site address using Google Maps Directions"
                              >
                                <Compass size={12} className="text-indigo-500 animate-spin-slow" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>

            {/* Actions footer section */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const mob = selectedDirItem.data.mobile;
                  setSelectedDirItem(null);
                  if (selectedDirItem.type === 'customer') {
                    onDeleteCustomer?.(mob);
                  } else if (selectedDirItem.type === 'carpenter') {
                    onDeleteCarpenter?.(mob);
                  } else if (selectedDirItem.type === 'architect') {
                    onDeleteArchitect?.(mob);
                  } else if (selectedDirItem.type === 'builder') {
                    onDeleteBuilder?.(mob);
                  } else {
                    onDeleteInterior?.(mob);
                  }
                }}
                className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border border-rose-200"
              >
                <Trash2 size={13} />
                <span>Remove {selectedDirItem.type === 'customer' ? 'Customer Profile' : selectedDirItem.type === 'carpenter' ? 'Carpenter' : selectedDirItem.type === 'architect' ? 'Architect' : selectedDirItem.type === 'builder' ? 'Builder' : 'Interior Designer'}</span>
              </button>

              {selectedDirItem.type === 'customer' && (
                <button
                  type="button"
                  onClick={async () => {
                    const mob = selectedDirItem.data.mobile;
                    const nextState = !selectedDirItem.data.isCompleted;
                    setSelectedDirItem(null);
                    if (onToggleCompleteCustomer) {
                      await onToggleCompleteCustomer(mob, nextState);
                    }
                  }}
                  className={`py-2 px-3.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    selectedDirItem.data.isCompleted
                      ? 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200 shadow-sm'
                      : 'bg-emerald-600 hover:bg-emerald-750 text-white border-emerald-650 shadow-sm shadow-emerald-100'
                  }`}
                >
                  {selectedDirItem.data.isCompleted ? (
                    <>
                      <RefreshCw size={13} />
                      <span>Restore customer</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>Mark as Complete</span>
                    </>
                  )}
                </button>
              )}
              
              <button
                type="button"
                onClick={() => setSelectedDirItem(null)}
                className="py-2 px-4 bg-white hover:bg-slate-100 border border-slate-350 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP SELECT CLIENT CHOICE MODAL */}
      {whatsappSelectModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 w-full max-w-sm overflow-hidden flex flex-col font-sans text-slate-800">
            {/* Modal Header */}
            <div className="bg-emerald-600 px-5 py-4 text-white flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-100 block font-mono">
                  WhatsApp Hub
                </span>
                <h3 className="text-sm font-extrabold tracking-tight uppercase flex items-center gap-1.5 mt-0.5">
                  💬 Select WhatsApp Client
                </h3>
              </div>
              <button 
                onClick={() => setWhatsappSelectModal(null)}
                className="text-emerald-100 hover:text-white cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Choose the preferred WhatsApp client on your device to send follow-up message to <strong className="text-slate-800">{whatsappSelectModal.name}</strong> (<strong className="text-slate-700">+{whatsappSelectModal.phone}</strong>):
              </p>

              <div className="space-y-3 pt-2">
                {/* 1. Normal/Personal WhatsApp option */}
                <button
                  type="button"
                  onClick={() => {
                    const encodedText = encodeURIComponent(whatsappSelectModal.text);
                    const isCapacitor = (window as any).Capacitor !== undefined;
                    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                    let url = `https://api.whatsapp.com/send?phone=${whatsappSelectModal.phone}&text=${encodedText}`;
                    if (isCapacitor || isMobile) {
                      url = `whatsapp://send?phone=${whatsappSelectModal.phone}&text=${encodedText}`;
                    }
                    openExternalUrl(url);
                    setWhatsappSelectModal(null);
                  }}
                  className="w-full py-3.5 px-4 bg-emerald-50 hover:bg-emerald-150 border-2 border-emerald-250 text-emerald-950 rounded-xl font-bold text-xs flex items-center justify-between transition group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💬</span>
                    <div className="text-left">
                      <span className="block font-black text-emerald-900">Normal WhatsApp</span>
                      <span className="text-[10px] text-emerald-700 font-medium block">Personal account application</span>
                    </div>
                  </div>
                  <span className="text-emerald-500 group-hover:translate-x-0.5 transition-transform">➡️</span>
                </button>

                {/* 2. Business WhatsApp option */}
                <button
                  type="button"
                  onClick={() => {
                    const encodedText = encodeURIComponent(whatsappSelectModal.text);
                    const isCapacitor = (window as any).Capacitor !== undefined;
                    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                    let url = `https://api.whatsapp.com/send?phone=${whatsappSelectModal.phone}&text=${encodedText}`;
                    if (isCapacitor || isMobile) {
                      if (isIOS) {
                        url = `whatsapp-business://send?phone=${whatsappSelectModal.phone}&text=${encodedText}`;
                      } else {
                        // On Android, WhatsApp Business responds to standard whatsapp:// scheme and the system opens default or chooser
                        url = `whatsapp://send?phone=${whatsappSelectModal.phone}&text=${encodedText}`;
                      }
                    }
                    openExternalUrl(url);
                    setWhatsappSelectModal(null);
                  }}
                  className="w-full py-3.5 px-4 bg-indigo-50 hover:bg-indigo-150 border-2 border-indigo-250 text-indigo-950 rounded-xl font-bold text-xs flex items-center justify-between transition group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💼</span>
                    <div className="text-left">
                      <span className="block font-black text-indigo-900">WhatsApp Business</span>
                      <span className="text-[10px] text-indigo-700 font-medium block">Business / W4B messenger app</span>
                    </div>
                  </div>
                  <span className="text-indigo-500 group-hover:translate-x-0.5 transition-transform">➡️</span>
                </button>
              </div>

              {/* Web/Browser Universal Fallback Info */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider block font-sans">Universal Web Link (Web/PC)</span>
                <p className="text-[10px] text-slate-500 leading-normal font-medium">
                  If the apps fail to open directly, use the universal web link:
                </p>
                <a
                  href={`https://web.whatsapp.com/send?phone=${whatsappSelectModal.phone}&text=${encodeURIComponent(whatsappSelectModal.text)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setWhatsappSelectModal(null)}
                  className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline font-bold pt-1 cursor-pointer"
                >
                  💻 Open via Web Browser (web.whatsapp.com) ➔
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-150 px-5 py-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setWhatsappSelectModal(null)}
                className="py-1.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
