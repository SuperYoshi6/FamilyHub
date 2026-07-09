try {
  importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');
} catch (e) {
  console.error('[SW] Firebase import failed:', e);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  return self.clients.claim();
});

let messaging = null;
try {
  firebase.initializeApp({
    apiKey: "AIzaSyBbfFwbszHY1GOr6nhEXiAgo4MuHMofvQs",
    authDomain: "familyhub-notification.firebaseapp.com",
    projectId: "familyhub-notification",
    storageBucket: "familyhub-notification.firebasestorage.app",
    messagingSenderId: "1034259995414",
    appId: "1:1034259995414:web:afa2188b190e2b389a8e37"
  });
  messaging = firebase.messaging();
} catch (e) {
  console.error('[SW] Firebase init failed:', e);
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    // System zeigt die Notification bereits via FCM-notification-Feld an.
    // Hier nur loggen, keine zweite showNotification.
    console.log('[SW] Background push received:', payload.notification?.title);
  });
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FCM_PING') {
    event.ports?.[0]?.postMessage({ type: 'FCM_PONG' });
  }
});
