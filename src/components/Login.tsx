import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Phone, ArrowRight, User, Compass, Sparkles } from 'lucide-react';
import { fetchUserFromFirestore, saveUserToFirestore } from '../db';

interface LoginProps {
  onLoginSuccess: (user: { name: string; mobile: string; zone: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Registration step states
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [fullName, setFullName] = useState('');
  const [zone, setZone] = useState('Central HQ');

  // Multi-step handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoggingIn(true);

    try {
      if (!needsRegistration) {
        // Step 1: Look up user in Firestore
        const existingUser = await fetchUserFromFirestore(cleanMobile);
        if (existingUser) {
          // User exists! Auto login
          onLoginSuccess({
            name: existingUser.name,
            mobile: existingUser.mobile,
            zone: existingUser.zone
          });
        } else {
          // User doesn't exist yet, show registration inputs
          setNeedsRegistration(true);
          setFullName(`Executive (${cleanMobile.slice(-4)})`);
        }
      } else {
        // Step 2: Register user and then complete login
        if (!fullName.trim()) {
          setError('Please enter your full name for registration.');
          setIsLoggingIn(false);
          return;
        }

        const newUserPayload = {
          name: fullName.trim(),
          mobile: cleanMobile,
          zone: zone
        };

        await saveUserToFirestore(newUserPayload);
        onLoginSuccess(newUserPayload);
      }
    } catch (err: any) {
      console.error(err);
      setError('Connection to Firestore failed. Falling back to local profile session.');
      // Offline fallback
      onLoginSuccess({
        name: fullName || `Executive (${cleanMobile.slice(-4)})`,
        mobile: cleanMobile,
        zone: zone || 'Local Field HQ'
      });
    } finally {
      setIsLoggingIn(false);
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
                <span>📲</span> 
                {needsRegistration ? 'Register Executive Profile' : 'Executive Cloud Sign-In'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {needsRegistration 
                  ? "This mobile number is not registered. Create your cloud profile below to get started."
                  : "Enter your registered 10-digit mobile number to access site verification logging tools."
                }
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
                    disabled={needsRegistration}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 text-xs border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition disabled:opacity-60"
                    placeholder="e.g. 9876543210"
                    maxLength={15}
                  />
                </div>
              </div>

              {/* Collapsible registration field contents */}
              {needsRegistration && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-1 border-t border-slate-100 dark:border-slate-800"
                >
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-650 dark:text-indigo-400 block font-mono flex items-center gap-1">
                    <Sparkles size={11} /> First-time Registration Details
                  </span>

                  {/* Full Name input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase" htmlFor="register-name">
                      Executive Full Name
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <User size={14} />
                      </div>
                      <input
                        id="register-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="block w-full pl-10 pr-4 py-2.5 text-xs border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  {/* Management Zone selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase" htmlFor="register-zone">
                      Sales Management Zone
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <Compass size={14} />
                      </div>
                      <select
                        id="register-zone"
                        required
                        value={zone}
                        onChange={(e) => setZone(e.target.value)}
                        className="block w-full pl-10 pr-4 py-2.5 text-xs border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition cursor-pointer"
                      >
                        <option value="Central HQ">Central HQ</option>
                        <option value="North Division">North Division</option>
                        <option value="South Division">South Division</option>
                        <option value="East Division">East Division</option>
                        <option value="West Division">West Division</option>
                        <option value="Metro Star Zone">Metro Star Zone</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 rounded-xl text-[11px] font-medium text-rose-700 dark:text-rose-300 leading-relaxed font-sans" id="login-error">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex gap-2">
                {needsRegistration && (
                  <button
                    type="button"
                    onClick={() => setNeedsRegistration(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase transition text-center cursor-pointer"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex-[2] py-3 px-4 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                  id="btn-login-submit"
                >
                  <span>
                    {isLoggingIn 
                      ? (needsRegistration ? 'Creating Account...' : 'Checking...') 
                      : (needsRegistration ? 'Confirm & Register' : 'Verify & Continue')
                    }
                  </span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
