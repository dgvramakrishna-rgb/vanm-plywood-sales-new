import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Phone, ArrowRight } from 'lucide-react';
import { fetchUserFromFirestore, saveUserToFirestore } from '../db';

interface LoginProps {
  onLoginSuccess: (user: { id?: string; name: string; mobile: string; zone: string; companyName?: string; isNewUser?: boolean }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Promise Timeout helper to prevent Firestore from hanging on slow mobile networks
  const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(errorMessage));
      }, ms);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setError('Please enter exactly a 10-digit mobile number.');
      return;
    }

    setIsLoggingIn(true);

    try {
      // Try looking up in offline local cache first for robust offline support
      const cachedUserStr = localStorage.getItem(`fieldconnect_user_cache_${cleanMobile}`);
      let cachedUser = null;
      if (cachedUserStr) {
        try {
          cachedUser = JSON.parse(cachedUserStr);
        } catch (e) {}
      }

      // Step 1: Look up user in Firestore with a 10-second timeout
      let existingUser = null;
      try {
        existingUser = await withTimeout(
          fetchUserFromFirestore(cleanMobile),
          10000,
          "Connection timed out"
        );
      } catch (dbErr) {
        console.warn("Could not query Firestore, checking local cache fallback:", dbErr);
        if (cachedUser) {
          existingUser = cachedUser;
        } else {
          throw dbErr; // Rethrow to let catch block handle general fallback
        }
      }

      if (!existingUser && cachedUser) {
        existingUser = cachedUser;
      }

      if (existingUser) {
        // User exists! Complete login
        const userId = existingUser.id || 'usr_' + cleanMobile;
        const userWithId = {
          id: userId,
          name: existingUser.name || '',
          mobile: existingUser.mobile,
          zone: existingUser.zone || 'Central HQ',
          companyName: existingUser.companyName || ''
        };
        
        // Refresh/save to local cache
        localStorage.setItem(`fieldconnect_user_cache_${cleanMobile}`, JSON.stringify(userWithId));

        if (!existingUser.id) {
          await saveUserToFirestore(userWithId).catch(e => console.warn("Could not backfill user id", e));
        }
        onLoginSuccess(userWithId);
      } else {
        // User doesn't exist yet, auto-create skeleton user and immediately direct to profile
        const newUserPayload = {
          id: 'usr_' + cleanMobile,
          name: '',
          mobile: cleanMobile,
          zone: 'Central HQ',
          companyName: '',
          isNewUser: true
        };

        // Attempt registration/save with a 10-second timeout
        await withTimeout(
          saveUserToFirestore(newUserPayload),
          10000,
          "Registration connection timed out"
        );
        
        // Store in local cache
        localStorage.setItem(`fieldconnect_user_cache_${cleanMobile}`, JSON.stringify(newUserPayload));
        onLoginSuccess(newUserPayload);
      }
    } catch (err: any) {
      console.warn("Firestore authentication issue:", err);
      
      // Attempt local offline user cache recovery if possible
      const cachedUserStr = localStorage.getItem(`fieldconnect_user_cache_${cleanMobile}`);
      let cachedUser = null;
      if (cachedUserStr) {
        try {
          cachedUser = JSON.parse(cachedUserStr);
        } catch (e) {}
      }

      if (cachedUser) {
        setError('Database connection timed out. Logging in with your cached offline profile.');
        setTimeout(() => {
          onLoginSuccess(cachedUser);
        }, 1500);
      } else {
        // Create a temporary offline-mode skeleton user for seamless network fallback
        const offlinePayload = {
          id: 'usr_' + cleanMobile,
          name: '',
          mobile: cleanMobile,
          zone: 'Central HQ',
          companyName: '',
          isNewUser: true
        };
        localStorage.setItem(`fieldconnect_user_cache_${cleanMobile}`, JSON.stringify(offlinePayload));
        setError('Unstable network detected. Proceeding in Offline Mode. Please configure your profile details.');
        setTimeout(() => {
          onLoginSuccess(offlinePayload);
        }, 2000);
      }
    } finally {
      setTimeout(() => {
        setIsLoggingIn(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center py-6 sm:px-4 lg:px-8 font-sans transition-colors duration-150" id="login-container">
      <div className="sm:mx-auto sm:w-full sm:max-w-xs">
        {/* Brand identity */}
        <div className="flex flex-col items-center">
          <div className="relative mb-3.5 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-mono text-[10px] font-black rounded-lg shadow-sm">
            PRO EXECUTIVE WORKSPACE
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight text-center font-display">
            SALES <span className="text-orange-600 font-extrabold font-sans">TRACKER</span>
          </h2>
          <p className="mt-1.5 text-[9px] text-slate-500 dark:text-slate-400 font-extrabold uppercase font-mono tracking-widest text-center">
            CRM Cloud Sync & Executive Tracker
          </p>
        </div>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-xs">
        <div className="bg-white dark:bg-slate-900 py-5 px-4 shadow-sm border border-slate-200/80 dark:border-slate-800 rounded-xl">
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span>📲</span> Executive Cloud Sign-In
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your 10-digit mobile number. New users will be automatically registered and guided to configure their profile settings.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-5" id="form-login-credentials">
              
              {/* Mobile number field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase" htmlFor="login-mobile">
                  10-Digit Mobile Number
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Phone size={14} />
                  </div>
                  <input
                    id="login-mobile"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setMobile(val);
                    }}
                    className="block w-full pl-10 pr-4 py-2.5 text-xs border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition disabled:opacity-60"
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 rounded-xl text-[11px] font-medium text-rose-700 dark:text-rose-300 leading-relaxed font-sans" id="login-error">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                  id="btn-login-submit"
                >
                  <span className="text-white font-extrabold">
                    {isLoggingIn ? 'Checking Account...' : 'Verify & Continue'}
                  </span>
                  <ArrowRight size={13} className="text-white" />
                </button>
              </div>
            </form>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
