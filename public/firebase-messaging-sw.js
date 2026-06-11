// Firebase Cloud Messaging Background Service Worker
// Imports compat SDKs from CDN since service workers run outside the main bundle context.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase App in service worker context
firebase.initializeApp({
  apiKey: "AIzaSyBl0sJ2w4LGVXcVBR-5fHaO-ZlE54zVuoc",
  authDomain: "amgtrading-bd5e4.firebaseapp.com",
  projectId: "amgtrading-bd5e4",
  storageBucket: "amgtrading-bd5e4.firebasestorage.app",
  messagingSenderId: "674882119827",
  appId: "1:674882119827:web:37e3d7f63bbeef6320c566"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'AMG Trading Signal';
  
  // Use custom icon/badge if supplied in the payload, otherwise default to favicon
  const icon = payload.notification?.icon || payload.data?.icon || '/favicon.ico';
  const badge = payload.notification?.badge || payload.data?.badge || '/favicon.ico';

  // Determine click action URL from the payload
  const clickAction = payload.data?.click_action || payload.fcmOptions?.link || '/';

  const notificationOptions = {
    body: payload.notification?.body || 'New setup detected.',
    icon: icon,
    badge: badge,
    // requireInteraction keeps notification visible until user dismisses it (critical for trading signals)
    requireInteraction: true,
    // Vibrate pattern for mobile devices (200ms on, 100ms pause, 200ms on)
    vibrate: [200, 100, 200],
    // Store the click action URL in data so the click handler can use it
    data: {
      ...payload.data,
      click_action: clickAction
    },
    // Tag prevents duplicate notifications for the same signal
    tag: payload.data?.id || 'amg-signal-' + Date.now(),
    // Renotify: even if tag matches, re-alert the user (vibrate/sound again)
    renotify: true,
    // Actions for quick interaction on supported platforms
    actions: [
      { action: 'view', title: '📊 View Signal' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to open appropriate tab (Gold or Scalping-V2)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle action button clicks
  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.click_action || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus if tab is already open, otherwise open a new window
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Try to find any AMG tab to navigate
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('navigate' in client && 'focus' in client) {
          return client.navigate(urlToOpen).then(() => client.focus());
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Keep service worker alive — listen for push events directly as a fallback
self.addEventListener('push', (event) => {
  // Firebase messaging SDK handles the push event via onBackgroundMessage.
  // This listener is a safety net for edge cases where the SDK might not catch it.
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[firebase-messaging-sw.js] Raw push event received:', payload);
    } catch (e) {
      console.log('[firebase-messaging-sw.js] Raw push (non-JSON):', event.data.text());
    }
  }
});
