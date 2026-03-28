// Scripts for firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyC51OaW48B5gx0k-nGYnMpaBMqc_tSfgy4",
  authDomain: "familyhub-notification.firebaseapp.com",
  projectId: "familyhub-notification",
  storageBucket: "familyhub-notification.firebasestorage.app",
  messagingSenderId: "1034259995414",
  appId: "1:1034259995414:web:afa2188b190e2b389a8e37"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
