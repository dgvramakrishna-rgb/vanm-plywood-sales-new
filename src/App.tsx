import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getAllVisits, 
  saveVisit, 
  deleteVisit,
  testFirebaseConnection,
  deleteCustomerFromFirestore,
  deleteCarpenterFromFirestore,
  deleteInteriorFromFirestore,
  deleteArchitectFromFirestore,
  deleteBuilderFromFirestore,
  getLocalVisits,
  getAllDealers,
  saveDealerToFirestore,
  deleteDealerFromFirestore
} from './db';
import { SiteVisit, Dealer } from './types';
import { useBackgroundSync } from './syncService';
import Dashboard from './components/Dashboard';
import VisitForm from './components/VisitForm';
import VisitList from './components/VisitList';
import Login from './components/Login';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface LocationServicePluginType {
  startService(options: { clients: string }): Promise<{ status: string }>;
  stopService(): Promise<{ status: string }>;
}

const LocationServicePlugin = registerPlugin<LocationServicePluginType>('LocationServicePlugin');
import { 
  Building2, 
  Briefcase, 
  User, 
  CheckCircle2, 
  X,
  Plus,
  History,
  LayoutDashboard,
  LogOut,
  Trash2,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Download
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ name: string; mobile: string; zone: string; companyName?: string } | null>(() => {
    const saved = localStorage.getItem('fieldconnect_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn("Corrupted user data in localStorage:", e);
      return null;
    }
  });
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'visits' | 'new-visit'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [editingVisit, setEditingVisit] = useState<SiteVisit | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Listen for native beforeinstallprompt PWA trigger
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      triggerToast('PWA Visit Tracker is ready to install for offline use!', 'info');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // Check if already installed
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      triggerToast('Thank you! Visit Tracker has been successfully installed.', 'success');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install status: ${outcome}`);
    setDeferredPrompt(null);
  };

  // Reload visits function for quick real-time synchronization updates
  const reloadVisits = async () => {
    try {
      const records = await getAllVisits();
      setVisits(records);
      const dlrs = await getAllDealers();
      setDealers(dlrs);
    } catch (err) {
      console.error('Failed to reload database records', err);
    }
  };

  // Synchronize visits with Android Location Service in Capacitor/Android
  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      const activeClients = visits
        .filter(v => !v.isCompleted && v.latitude !== null && v.longitude !== null)
        .map(v => ({
          clientName: v.clientName,
          clientMobile: v.clientMobile,
          address: v.address || v.location || '',
          latitude: v.latitude,
          longitude: v.longitude,
          isCompleted: !!v.isCompleted
        }));

      LocationServicePlugin.startService({ clients: JSON.stringify(activeClients) })
        .then(() => console.log('[LocationService] Synchronized active clients successfully'))
        .catch(err => console.error('[LocationService] Failed to sync active clients:', err));
    }
  }, [visits]);

  // Instantiate the background synchronization hook
  const { isOnline, isSyncing, unsyncedCount, triggerSync } = useBackgroundSync(async () => {
    await reloadVisits();
    triggerToast('Background Sync completed! All offline records pushed to Firestore.', 'success');
  });

  // Custom toast notification system
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info'>('success');

  // Trigger temporary floating confirmation toast
  const triggerToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Theme state & persistence
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('fieldconnect_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('fieldconnect_theme', theme);
  }, [theme]);

  // Top header Profile settings dropdown states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profName, setProfName] = useState(currentUser?.name || '');
  const [profCompany, setProfCompany] = useState(currentUser?.companyName || 'Sales Pro');
  const [profMobile, setProfMobile] = useState(currentUser?.mobile || '');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Sync profile details if currentUser updates
  useEffect(() => {
    if (currentUser) {
      setProfName(currentUser.name);
      setProfCompany(currentUser.companyName || 'Sales Pro');
      setProfMobile(currentUser.mobile);
    }
  }, [currentUser]);

  // State for offline-safe custom visual confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: 'visit' | 'customer' | 'carpenter' | 'interior';
    title: string;
    message: string;
    action: () => Promise<void> | void;
  } | null>(null);

  // Profile update handler
  const handleUpdateProfile = (updated: { name: string; mobile: string; zone: string; companyName?: string }) => {
    setCurrentUser(updated);
    localStorage.setItem('fieldconnect_user', JSON.stringify(updated));
    triggerToast('Profile updated successfully.');
  };

  const handleSaveProfile = () => {
    if (!profName.trim()) {
      setProfileMessage('❌ Employee Name is required');
      return;
    }
    const cleanNumber = profMobile.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      setProfileMessage('❌ 10-digit mobile required');
      return;
    }

    const updated = {
      ...currentUser,
      name: profName.trim(),
      mobile: cleanNumber,
      zone: currentUser?.zone || 'Central HQ',
      companyName: profCompany.trim()
    };
    handleUpdateProfile(updated as any);
    setProfileMessage('✅ Profile updated!');
    setTimeout(() => {
      setProfileMessage(null);
      setIsProfileOpen(false);
    }, 1500);
  };

  const handleBackupData = () => {
    try {
      const dataStr = JSON.stringify(visits, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `fieldconnect_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      triggerToast('Backup JSON downloaded successfully!', 'success');
    } catch (err) {
      console.error('Backup failed:', err);
      triggerToast('Failed to generate backup file.', 'info');
    }
  };

  // Load visits on startup
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Instantly load local/cached visits to make the app interactive immediately
        const cached = await getLocalVisits();
        setVisits(cached || []);
        setIsLoading(false); // Set to false immediately so the app is instantly interactive!

        const cachedD = localStorage.getItem('fieldconnect_dealers_cache');
        if (cachedD) {
          try {
            setDealers(JSON.parse(cachedD));
          } catch (e) {}
        }

        // 2. Run Firebase connection check in the background without blocking the UI
        testFirebaseConnection().catch(err => {
          console.warn("Background firebase connection verification warn:", err);
        });

        // 3. Keep loading state up-to-date with remote server changes in the background
        const records = await getAllVisits();
        // Automatically purge any previously seeded records matching 'seed-visit' to ensure a perfectly clean user DB
        const seedVisits = records.filter(v => v.id.startsWith('seed-visit'));
        if (seedVisits.length > 0) {
          for (const sV of seedVisits) {
            await deleteVisit(sV.id);
          }
          const cleanRecords = await getAllVisits();
          setVisits(cleanRecords);
          triggerToast('Sample visits successfully removed for clean slate.', 'info');
        } else {
          setVisits(records);
        }

        // Load remote dealers
        const dlrs = await getAllDealers();
        setDealers(dlrs);
      } catch (err) {
        console.error('Failed to load database records', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Form submit handler
  const handleSaveVisit = async (visitInput: Omit<SiteVisit, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => {
    const isEdit = !!visitInput.id;
    const finalVisit: SiteVisit = {
      ...visitInput,
      id: visitInput.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'idx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)),
      createdAt: visitInput.createdAt || new Date().toISOString()
    };

    try {
      await saveVisit(finalVisit);
      // Reload visits
      const records = await getAllVisits();
      setVisits(records);
      setActiveTab('dashboard'); // take back to summary dashboard post successful entry
      setEditingVisit(null);
      triggerToast(isEdit ? `Visit updated successfully for ${visitInput.clientName}!` : `Visit logged successfully for ${visitInput.clientName}!`);
    } catch (err) {
      console.error(err);
      triggerToast('Could not save record to DB. Please review storage capabilities.', 'info');
    }
  };

  // Toggle client completion status handler
  const handleToggleCompleteCustomer = async (mobile: string, isCompleted: boolean) => {
    try {
      const associatedVisits = visits.filter(v => v.clientMobile === mobile);
      if (associatedVisits.length === 0) {
        triggerToast("No visits found for this client.", "info");
        return;
      }
      for (const v of associatedVisits) {
        await saveVisit({
          ...v,
          isCompleted
        });
      }
      const records = await getAllVisits();
      setVisits(records);
      triggerToast(`Site marked as ${isCompleted ? 'completed/closed' : 'active'} successfully for ${associatedVisits[0].clientName || 'customer'}!`);
    } catch (err) {
      console.error("Failed to toggle completion for customer:", err);
      triggerToast("Failed to update status. Please try again.", "info");
    }
  };

  // Dealer save and delete handlers
  const handleSaveDealer = async (dealerInput: Omit<Dealer, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => {
    const finalDealer: Dealer = {
      ...dealerInput,
      id: dealerInput.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'dlr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)),
      createdAt: dealerInput.createdAt || new Date().toISOString()
    };
    try {
      await saveDealerToFirestore(finalDealer);
      const dlrs = await getAllDealers();
      setDealers(dlrs);
      triggerToast(`Dealer "${dealerInput.dealerPointName}" saved successfully.`);
    } catch (err) {
      console.error('Failed to save dealer:', err);
      triggerToast('Could not save dealer to DB.', 'info');
    }
  };

  const handleDeleteDealer = async (mobile: string) => {
    const toDelete = dealers.find(d => d.mobile === mobile);
    const dPointName = toDelete ? toDelete.dealerPointName : 'this dealer';
    setDeleteConfirm({
      id: mobile,
      type: 'dealer' as any,
      title: 'Delete Dealer Profile',
      message: `Are you sure you want to permanently delete the dealer profile for "${dPointName}"?`,
      action: async () => {
        try {
          await deleteDealerFromFirestore(mobile);
          const dlrs = await getAllDealers();
          setDealers(dlrs);
          triggerToast('Dealer profile successfully deleted.');
        } catch (err) {
          console.error('Failed to delete dealer:', err);
          triggerToast('Could not delete dealer.', 'info');
        }
      }
    });
  };

  // Deletion handler
  const handleDeleteVisit = async (id: string) => {
    const visitToClean = visits.find(v => v.id === id);
    const clientName = visitToClean ? visitToClean.clientName : 'this visit';
    setDeleteConfirm({
      id,
      type: 'visit',
      title: 'Delete Visit Record',
      message: `Are you sure you want to permanently delete the logged visit record for "${clientName}"? This action will remove the visit from database.`,
      action: async () => {
        try {
          await deleteVisit(id);
          if (visitToClean) {
            if (visitToClean.clientMobile && visitToClean.clientMobile !== '0000000000') {
              try {
                await deleteCustomerFromFirestore(visitToClean.clientMobile);
              } catch (err) {
                console.error("Failed to delete associated customer profile:", err);
              }
            }
            if (visitToClean.contractorMobile && visitToClean.contractorMobile !== '0000000000') {
              if (visitToClean.contractorType === 'carpenter') {
                try {
                  await deleteCarpenterFromFirestore(visitToClean.contractorMobile);
                } catch (err) {
                  console.error("Failed to delete associated carpenter profile:", err);
                }
              } else if (visitToClean.contractorType === 'interior') {
                try {
                  await deleteInteriorFromFirestore(visitToClean.contractorMobile);
                } catch (err) {
                  console.error("Failed to delete associated interior profile:", err);
                }
              } else if (visitToClean.contractorType === 'architect') {
                try {
                  await deleteArchitectFromFirestore(visitToClean.contractorMobile);
                } catch (err) {
                  console.error("Failed to delete associated architect profile:", err);
                }
              }
            }
          }
          const records = await getAllVisits();
          setVisits(records);
          triggerToast('Site visit and associated partner records safely deleted.');
        } catch (err) {
          console.error(err);
          triggerToast('Could not delete visit.', 'info');
        }
      }
    });
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('fieldconnect_user');
    setCurrentUser(null);
    triggerToast('Logged out successfully.');
  };

  // Get user name initials helper
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .filter(Boolean)
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'FC';
  };

  // Custom redirection if no session matches
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        <Login 
          onLoginSuccess={(userData) => {
            setCurrentUser(userData);
            localStorage.setItem('fieldconnect_user', JSON.stringify(userData));
            triggerToast(`Welcome back, ${userData.name}!`);
          }} 
        />
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center justify-between gap-4 max-w-sm ${
                toastType === 'success'
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-indigo-900 border-indigo-800 text-white'
              }`}
              id="toast-notification"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <p className="text-xs font-semibold leading-normal">{toastMessage}</p>
              </div>
              <button 
                onClick={() => setToastMessage(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-150" id="main-sales-app">
      
      {/* Top Header Navigation bar in executive indigo-700 */}
      <header className="sticky top-0 z-30 bg-indigo-700 dark:bg-slate-900 text-white shadow-md border-b dark:border-slate-800/80 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left side: branding/humble logo matching Professional Polish mockup */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div>
                <span className="font-display font-black text-lg leading-none tracking-tight text-white block flex items-center gap-1">
                  SALES <span className="text-orange-400 font-black">TRACKER</span> <span className="font-mono text-[9px] font-bold opacity-80 bg-white/10 px-1.5 py-0.5 rounded ml-1 tracking-wider uppercase">PRO</span>
                </span>
                <span className="text-[8px] uppercase tracking-widest font-black text-indigo-200/90 font-mono hidden sm:block mt-0.5">
                  CRM Field Sync Active
                </span>
              </div>
            </div>

            {/* Middle: Tab items and navigation */}
            <nav className="hidden md:flex gap-2">
              <button
                onClick={() => {
                  setEditingVisit(null);
                  setActiveTab('dashboard');
                }}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold tracking-wide transition flex items-center gap-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-sm border border-indigo-500'
                    : 'text-indigo-100 hover:bg-indigo-800 hover:text-white'
                }`}
                id="tab-dashboard"
              >
                <LayoutDashboard size={14} />
                <span className="hidden sm:inline">Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setEditingVisit(null);
                  setActiveTab('visits');
                }}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold tracking-wide transition flex items-center gap-1.5 ${
                  activeTab === 'visits'
                    ? 'bg-indigo-600 text-white shadow-sm border border-indigo-500'
                    : 'text-indigo-100 hover:bg-indigo-800 hover:text-white'
                }`}
                id="tab-history"
              >
                <History size={14} />
                <span>Visit Logs</span>
              </button>

              <button
                onClick={() => {
                  setEditingVisit(null);
                  setActiveTab('new-visit');
                }}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold tracking-wide transition flex items-center gap-1.5 ${
                  activeTab === 'new-visit'
                    ? 'bg-indigo-600 text-white shadow-sm border border-indigo-500'
                    : 'text-indigo-100 hover:bg-indigo-800 hover:text-white'
                }`}
                id="tab-new"
              >
                <Plus size={14} />
                <span>New Visit</span>
              </button>
            </nav>

            {/* Right side: Sync Connection widget & Profile Icon */}
            <div className="flex items-center gap-4 relative">
              {/* Sync and Connection Status Widget */}
              <div className="flex items-center gap-2" id="sync-connection-widget">
                {/* PWA Install Button when installable */}
                {deferredPrompt && (
                  <button
                    onClick={installApp}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm border border-emerald-500 transition cursor-pointer animate-pulse"
                    title="Install reference tracker onto your device screen for full offline-first functionality!"
                    id="pwa-install-button"
                  >
                    <Download size={12} />
                    <span>Install App</span>
                  </button>
                )}

                {/* Online/Offline Status Badge */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                    isOnline 
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' 
                      : 'bg-amber-500/10 border-amber-500/25 text-amber-300 font-bold'
                  }`}
                  title={isOnline ? 'Internet connection active' : 'Offline Mode active'}
                  id="network-status-badge"
                >
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></div>
                  <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
                </div>

                {/* Sync Actions Badge */}
                {unsyncedCount > 0 ? (
                  <button
                    onClick={() => triggerSync()}
                    disabled={isSyncing || !isOnline}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border transition ${
                      isSyncing 
                        ? 'bg-indigo-500/30 border-indigo-400/30 text-indigo-200 cursor-not-allowed'
                        : isOnline 
                          ? 'bg-amber-500/25 border-amber-500/40 text-amber-200 hover:bg-amber-500/35 cursor-pointer hover:border-amber-400'
                          : 'bg-slate-500/20 border-slate-500/30 text-slate-300 cursor-not-allowed'
                    }`}
                    title={`${unsyncedCount} unsynced visit record(s). Click to manually sync.`}
                    id="manual-sync-trigger"
                  >
                    <RefreshCw size={12} className={`${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{unsyncedCount} Unsynced</span>
                  </button>
                ) : (
                  <div 
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border bg-indigo-500/10 border-indigo-500/20 text-indigo-300 select-none"
                    title="All local records synced to Cloud Firestore."
                    id="all-synced-badge"
                  >
                    <CheckCircle2 size={12} className="text-indigo-300" />
                    <span className="hidden sm:inline">Synced</span>
                  </div>
                )}
              </div>

              {/* Profile Icon with custom dropdown/popover option */}
              <div className="flex items-center gap-3 relative" id="header-profile-wrapper">
              
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-indigo-850 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 transition border border-indigo-550/30 dark:border-slate-700 text-left select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20"
                id="header-profile-trigger"
                title="Manage Employee Profile"
              >
                <div className="hidden md:flex flex-col items-end text-right">
                  <span className="text-white text-xs font-extrabold leading-none">{currentUser.name}</span>
                  <span className="text-[9px] text-indigo-200 dark:text-slate-400 uppercase font-bold tracking-wider mt-0.5 opacity-90">
                    {currentUser.companyName || 'FieldConnect Pro'}
                  </span>
                </div>
                
                <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 font-black text-xs flex items-center justify-center shadow-md select-none border border-indigo-100 dark:border-slate-700 shrink-0">
                  {getInitials(currentUser.name)}
                </div>
                
                <span className="text-[10px] text-indigo-300 dark:text-slate-400 select-none">▼</span>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-14 w-80 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-5 z-50 mt-1 space-y-4 font-sans"
                    id="header-profile-dropdown"
                  >
                    {/* Popover Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase font-mono text-indigo-600 dark:text-indigo-400 tracking-wider">
                          Executive Workspace
                        </span>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Your Profile</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsProfileOpen(false)}
                        className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 p-1 rounded-md transition hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Form Controls */}
                    <div className="space-y-3 mr-0.5">
                      
                      {/* Employee Name */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          Employee Name *
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                            👤
                          </span>
                          <input
                            type="text"
                            required
                            value={profName}
                            onChange={(e) => setProfName(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-850 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-950/40 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold transition"
                            placeholder="e.g. Ramakrishna"
                          />
                        </div>
                      </div>

                      {/* Company Name */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          Company Name
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                            🏢
                          </span>
                          <input
                            type="text"
                            value={profCompany}
                            onChange={(e) => setProfCompany(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-850 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-950/40 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold transition"
                            placeholder="e.g. Welspun Industries"
                          />
                        </div>
                      </div>

                      {/* Mobile Number */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          Mobile Number *
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                            📞
                          </span>
                          <input
                            type="tel"
                            required
                            value={profMobile}
                            onChange={(e) => setProfMobile(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-850 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-950/40 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold transition"
                            placeholder="10 digit number"
                          />
                        </div>
                      </div>

                      {/* Theme Mode Toggle */}
                      <div className="space-y-1.5 pt-1" id="theme-toggle-form-group">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          Theme Mode
                        </label>
                        <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/40 dark:border-slate-800/80 gap-0.5">
                          <button
                            type="button"
                            onClick={() => setTheme('light')}
                            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                              theme === 'light'
                                ? 'bg-white text-indigo-750 font-black shadow-xs'
                                : 'text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-300'
                            }`}
                            id="theme-toggle-light"
                          >
                            <span>☀️ Light</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTheme('dark')}
                            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                              theme === 'dark'
                                ? 'bg-slate-855 dark:bg-slate-800 text-indigo-400 font-black shadow-xs'
                                : 'text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-300'
                            }`}
                            id="theme-toggle-dark"
                          >
                            <span>🌙 Dark</span>
                          </button>
                        </div>
                      </div>

                      {/* Backup Data Action */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleBackupData}
                          className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-indigo-100 dark:border-slate-800 rounded-xl transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg shadow-sm text-indigo-600 dark:text-indigo-400">
                              <Download size={14} />
                            </div>
                            <div className="text-left">
                              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Backup Data</span>
                              <span className="block text-[9px] text-slate-500 font-medium leading-none mt-0.5">Export all records as JSON</span>
                            </div>
                          </div>
                          <span className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">➔</span>
                        </button>
                      </div>

                    </div>

                    {profileMessage && (
                      <p className="text-[11px] font-semibold text-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 animate-pulse">
                        {profileMessage}
                      </p>
                    )}

                    {/* Popover Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-[11px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-100 hover:border-rose-600 dark:border-rose-950 px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                      >
                        <LogOut size={11} />
                        <span>Sign Out</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-lg shadow-sm hover:shadow transition whitespace-nowrap cursor-pointer"
                      >
                        Save Settings
                      </button>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>

          </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pt-4 pb-20 md:py-4">
        
        {isLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 border-4 border-slate-250 border-t-slate-800 rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-mono">Initializing database...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Dashboard 
                  visits={visits} 
                  dealers={dealers}
                  onSaveDealer={handleSaveDealer}
                  onDeleteDealer={handleDeleteDealer}
                  onAddNewVisit={() => setActiveTab('new-visit')} 
                  onQuickSave={handleSaveVisit}
                  onToggleCompleteCustomer={handleToggleCompleteCustomer}
                  currentUser={currentUser}
                  onUpdateProfile={handleUpdateProfile}
                  onSignOut={handleLogout}
                  onEditVisit={(visit) => {
                    setEditingVisit(visit);
                    setActiveTab('new-visit');
                  }}
                  onTriggerToast={(msg, type) => triggerToast(msg, type)}
                  onDeleteCustomer={async (mobile) => {
                    const toDelete = visits.filter(v => v.clientMobile === mobile);
                    setDeleteConfirm({
                      id: mobile,
                      type: 'customer',
                      title: 'Delete Customer Profile',
                      message: `Are you sure you want to delete this customer? This will remove all associated site visits and records.`,
                      action: async () => {
                        for (const v of toDelete) {
                          await deleteVisit(v.id);
                        }
                        try {
                          await deleteCustomerFromFirestore(mobile);
                        } catch (err) {
                          console.error("Failed to delete customer profile:", err);
                        }
                        const records = await getAllVisits();
                        setVisits(records);
                        triggerToast(`Customer and all associated visits deleted successfully.`);
                      }
                    });
                  }}
                  onDeleteCarpenter={async (mobile) => {
                    setDeleteConfirm({
                      id: mobile,
                      type: 'carpenter',
                      title: 'Remove Carpenter Partner',
                      message: `Are you sure you want to remove this carpenter from the directory? Associated visit assignments will be unlinked.`,
                      action: async () => {
                        for (const v of visits) {
                          if (v.contractorType === 'carpenter' && v.contractorMobile === mobile) {
                            if (v.clientMobile === '0000000000') {
                              await deleteVisit(v.id);
                            } else {
                              await saveVisit({
                                ...v,
                                contractorType: 'none',
                                contractorName: '',
                                contractorMobile: ''
                              });
                            }
                          }
                        }
                        try {
                          await deleteCarpenterFromFirestore(mobile);
                        } catch (err) {
                          console.error("Failed to delete carpenter profile:", err);
                        }
                        const records = await getAllVisits();
                        setVisits(records);
                        triggerToast(`Carpenter removed successfully.`);
                      }
                    });
                  }}
                  onDeleteInterior={async (mobile) => {
                    setDeleteConfirm({
                      id: mobile,
                      type: 'interior',
                      title: 'Remove Interior Designer',
                      message: `Are you sure you want to remove this interior designer? Associated visit assignments will be unlinked.`,
                      action: async () => {
                        for (const v of visits) {
                          if (v.contractorType === 'interior' && v.contractorMobile === mobile) {
                            if (v.clientMobile === '0000000000') {
                              await deleteVisit(v.id);
                            } else {
                              await saveVisit({
                                ...v,
                                contractorType: 'none',
                                contractorName: '',
                                contractorMobile: ''
                              });
                            }
                          }
                        }
                        try {
                          await deleteInteriorFromFirestore(mobile);
                        } catch (err) {
                          console.error("Failed to delete interior profile:", err);
                        }
                        const records = await getAllVisits();
                        setVisits(records);
                        triggerToast(`Interior Designer removed successfully.`);
                      }
                    });
                  }}
                  onDeleteArchitect={async (mobile) => {
                    setDeleteConfirm({
                      id: mobile,
                      type: 'architect',
                      title: 'Remove Architect Partner',
                      message: `Are you sure you want to remove this architect? Associated visit assignments will be unlinked.`,
                      action: async () => {
                        for (const v of visits) {
                          if (v.contractorType === 'architect' && v.contractorMobile === mobile) {
                            if (v.clientMobile === '0000000000') {
                              await deleteVisit(v.id);
                            } else {
                              await saveVisit({
                                ...v,
                                contractorType: 'none',
                                contractorName: '',
                                contractorMobile: ''
                              });
                            }
                          }
                        }
                        try {
                          await deleteArchitectFromFirestore(mobile);
                        } catch (err) {
                          console.error("Failed to delete architect profile:", err);
                        }
                        const records = await getAllVisits();
                        setVisits(records);
                        triggerToast(`Architect removed successfully.`);
                      }
                    });
                  }}
                  onDeleteBuilder={async (mobile) => {
                    setDeleteConfirm({
                      id: mobile,
                      type: 'builder',
                      title: 'Remove Builder Partner',
                      message: `Are you sure you want to remove this builder? Associated visit assignments will be unlinked.`,
                      action: async () => {
                        for (const v of visits) {
                          if (v.contractorType === 'builder' && v.contractorMobile === mobile) {
                            if (v.clientMobile === '0000000000') {
                              await deleteVisit(v.id);
                            } else {
                              await saveVisit({
                                ...v,
                                contractorType: 'none',
                                contractorName: '',
                                contractorMobile: ''
                              });
                            }
                          }
                        }
                        try {
                          await deleteBuilderFromFirestore(mobile);
                        } catch (err) {
                          console.error("Failed to delete builder profile:", err);
                        }
                        const records = await getAllVisits();
                        setVisits(records);
                        triggerToast(`Builder removed successfully.`);
                      }
                    });
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'visits' && (
              <motion.div
                key="visits-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <VisitList 
                  visits={visits} 
                  onDelete={handleDeleteVisit} 
                  onEdit={(visit) => {
                    setEditingVisit(visit);
                    setActiveTab('new-visit');
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'new-visit' && (
              <motion.div
                key="new-visit-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <VisitForm 
                  onSave={handleSaveVisit} 
                  initialData={editingVisit}
                  visits={visits}
                  onCancel={() => {
                    setEditingVisit(null);
                    setActiveTab('visits');
                  }}
                />
              </motion.div>
            )}

          </AnimatePresence>
        )}

      </main>

      {/* Mobile Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden">
        <div className="grid grid-cols-3 h-16">
          <button
            onClick={() => {
              setEditingVisit(null);
              setActiveTab('dashboard');
            }}
            className={`flex flex-col items-center justify-center text-[10px] font-extrabold tracking-wider transition duration-150 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="mobile-tab-dashboard"
          >
            <LayoutDashboard size={18} className="mb-1" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setEditingVisit(null);
              setActiveTab('visits');
            }}
            className={`flex flex-col items-center justify-center text-[10px] font-extrabold tracking-wider transition duration-150 cursor-pointer ${
              activeTab === 'visits'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="mobile-tab-history"
          >
            <History size={18} className="mb-1" />
            <span>Visit Logs</span>
          </button>

          <button
            onClick={() => {
              setEditingVisit(null);
              setActiveTab('new-visit');
            }}
            className={`flex flex-col items-center justify-center text-[10px] font-extrabold tracking-wider transition duration-150 cursor-pointer ${
              activeTab === 'new-visit'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="mobile-tab-new"
          >
            <Plus size={18} className="mb-1" />
            <span>New Visit</span>
          </button>
        </div>
      </div>

      {/* Visual, secure, offline/iframe-safe confirm modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-250 p-6 w-full max-w-md relative z-10 space-y-4"
              id="custom-delete-modal"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {deleteConfirm.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    {deleteConfirm.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  No, Keep It
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const runAction = deleteConfirm.action;
                    setDeleteConfirm(null);
                    await runAction();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Yes, Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Status Toast feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center justify-between gap-4 max-w-sm ${
              toastType === 'success'
              ? 'bg-slate-900 border-slate-800 text-white'
              : 'bg-indigo-900 border-indigo-800 text-white'
            }`}
            id="toast-notification"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              <p className="text-xs font-semibold leading-normal">{toastMessage}</p>
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern, humble footer in fine print */}
      <footer className="border-t border-slate-200 mt-16 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-1">
          <p className="text-xs text-slate-500 font-sans">
            Secure offline-first applet. All visitor records, images, and coordinates are stored strictly on your local device.
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            IDB STORE ACTIVE • SEED V2 • © 2026 FIELD FORCE APPLET
          </p>
        </div>
      </footer>

    </div>
  );
}
