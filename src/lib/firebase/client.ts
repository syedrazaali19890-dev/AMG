import { initializeApp, getApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase client
const app = typeof window !== 'undefined' && getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : typeof window !== 'undefined' ? getApp() : null;

/**
 * Ask for notification permissions and return the FCM registration token.
 * Registers token with the server endpoint.
 * Also sets up the foreground onMessage listener so notifications
 * are shown even when the app tab is in the foreground.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    // Check if browser supports messaging
    const supported = await isSupported();
    if (!supported) {
      console.warn('⚠️ Push notifications are not supported in this browser.');
      return null;
    }

    const messaging = getMessaging(app || undefined);
    
    // Request permission from browser
    console.log('Requesting permission...');
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('🚫 Notification permission denied.');
      return null;
    }

    console.log('Notification permission granted.');

    // Register service worker manually to ensure path is resolved correctly in Next.js
    console.log('Registering service worker...');
    let registration: ServiceWorkerRegistration;

    // Try to get existing registration first to avoid duplicate registrations
    const existingReg = await navigator.serviceWorker.getRegistration('/');
    if (existingReg && existingReg.active) {
      registration = existingReg;
      // Force update the service worker to pick up any changes
      registration.update().catch(() => {});
      console.log('Using existing service worker registration');
    } else {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      // Wait for service worker to become active to avoid PushManager subscription issues
      console.log('Waiting for service worker to become active...');
      if (registration.installing) {
        await new Promise<void>((resolve) => {
          registration.installing?.addEventListener('statechange', (e) => {
            if ((e.target as ServiceWorker).state === 'activated') {
              resolve();
            }
          });
        });
      }
    }

    await navigator.serviceWorker.ready;
    console.log('Service worker registered and ready:', registration);

    // Get FCM registration token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('✅ FCM Registration Token obtained:', token.substring(0, 10) + '...');
      
      // Register token with Next.js backend API
      const response = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          origin: window.location.origin 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register token with server');
      }

      console.log('✅ Token registered with server successfully.');

      // ===== FOREGROUND MESSAGE HANDLER =====
      // FCM only shows notifications automatically when the app is in the background.
      // When the app is in the foreground (tab visible), we must manually show them.
      setupForegroundMessageHandler(messaging);

      return token;
    } else {
      console.warn('⚠️ No FCM registration token returned.');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting push notification token:', error);
    return null;
  }
}

/**
 * Track whether foreground handler is already set up to avoid duplicates
 */
let foregroundHandlerSetup = false;

/**
 * Set up foreground message handler.
 * When the app is in the foreground, FCM does NOT auto-show notifications.
 * We must listen via onMessage() and show them manually.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupForegroundMessageHandler(messaging: any): void {
  if (foregroundHandlerSetup) return;
  foregroundHandlerSetup = true;

  onMessage(messaging, (payload) => {
    console.log('[FCM Foreground] Message received:', payload);

    const title = payload.notification?.title || 'AMG Trading Signal';
    const body = payload.notification?.body || 'New setup detected.';
    const icon = payload.notification?.icon || payload.data?.icon || '/favicon.ico';
    const clickAction = payload.data?.click_action || '/';

    // Show notification using the Notification API (foreground)
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon,
          tag: payload.data?.id || `fcm-fg-${Date.now()}`,
          requireInteraction: true,
        });

        notif.onclick = () => {
          window.focus();
          window.location.href = clickAction;
          notif.close();
        };
      } catch (err) {
        console.warn('Could not show foreground notification:', err);
      }
    }
  });

  console.log('✅ FCM foreground message handler registered.');
}
