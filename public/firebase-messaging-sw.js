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

  const notificationOptions = {
    body: payload.notification?.body || 'New setup detected.',
    icon: icon,
    badge: badge,
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to open appropriate tab (Gold or Scalping-V2)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
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
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
