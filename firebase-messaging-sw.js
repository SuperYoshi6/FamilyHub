importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.resolve());
  self.skipWaiting();
});

firebase.initializeApp({
  apiKey: "AIzaSyBbfFwbszHY1GOr6nhEXiAgo4MuHMofvQs",
  authDomain: "familyhub-notification.firebaseapp.com",
  projectId: "familyhub-notification",
  storageBucket: "familyhub-notification.firebasestorage.app",
  messagingSenderId: "1034259995414",
  appId: "1:1034259995414:web:afa2188b190e2b389a8e37"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
