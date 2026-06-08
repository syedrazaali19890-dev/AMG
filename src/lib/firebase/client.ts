import { initializeApp, getApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

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

    // Get FCM registration token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (token) {
      console.log('✅ FCM Registration Token obtained:', token.substring(0, 10) + '...');
      
      // Register token with Next.js backend API
      const response = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to register token with server');
      }

      console.log('✅ Token registered with server successfully.');
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
