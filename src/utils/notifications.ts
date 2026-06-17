import { LocalNotifications } from '@capacitor/local-notifications';

// Helper to check if running inside Capacitor container or web PWA
export const isCapacitor = () => {
  return typeof (window as any).Capacitor !== 'undefined';
};

// Request notification permission from the system/device
export async function requestNotificationPermission(): Promise<boolean> {
  if (isCapacitor()) {
    try {
      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } catch (e) {
      console.warn('Capacitor requestPermissions failed, falling back to Web API:', e);
    }
  }

  // Standard Web Notification API
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Get the current notification permission status
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'default'> {
  if (isCapacitor()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      const displayStatus = status.display;
      if (displayStatus === 'prompt') {
        return 'default';
      }
      return displayStatus as 'granted' | 'denied' | 'default';
    } catch (e) {
      console.warn('Capacitor checkPermissions failed, falling back to Web API:', e);
    }
  }

  if ('Notification' in window) {
    return Notification.permission as 'granted' | 'denied' | 'default';
  }

  return 'denied';
}

// Trigger standard web or native local notification immediately or scheduled with an optional delay
export async function sendLocalNotification(title: string, body: string, delayMs = 0) {
  console.log(`[Offline Notification] Requesting trigger for: "${title}" - "${body}" in ${delayMs}ms`);

  if (isCapacitor()) {
    try {
      const permissions = await LocalNotifications.checkPermissions();
      if (permissions.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('Capacitor notification permissions denied; trying fallback methods');
        }
      }
      
      const trigger = delayMs > 0 ? { at: new Date(Date.now() + delayMs) } : undefined;
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 1000000) + 1,
            schedule: trigger,
            sound: 'default',
            smallIcon: 'ic_launcher_round',
            attachments: [],
            extra: null
          }
        ]
      });
      console.log('Capacitor native local notification scheduled successfully.');
      return;
    } catch (e) {
      console.warn('Capacitor LocalNotifications schedule failed, attempting web APIs:', e);
    }
  }

  // Web standards 1: Notification API (if permission is granted)
  if ('Notification' in window && Notification.permission === 'granted') {
    if (delayMs > 0) {
      setTimeout(() => {
        new Notification(title, {
          body,
          icon: '/icon.svg'
        });
      }, delayMs);
    } else {
      new Notification(title, {
        body,
        icon: '/icon.svg'
      });
    }
    return;
  }

  // Web standards 2: Service Worker registration notification (extremely reliable in background and offline mode)
  if ('serviceWorker' in navigator && 'Notification' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        if (delayMs > 0) {
          setTimeout(() => {
            registration.showNotification(title, {
              body,
              icon: '/icon.svg',
              badge: '/icon.svg',
              vibrate: [200, 100, 200]
            } as any);
          }, delayMs);
        } else {
          registration.showNotification(title, {
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            vibrate: [200, 100, 200]
          } as any);
        }
      }
    } catch (swError) {
      console.error('Service Worker fallback notification failed:', swError);
    }
  }
}
