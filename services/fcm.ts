import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { supabase } from './backend';

// THIS WILL BE UPDATED ONCE USER PROVIDES THE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyC51OaW48B5gx0k-nGYnMpaBMqc_tSfgy4",
  authDomain: "familyhub-notification.firebaseapp.com",
  projectId: "familyhub-notification",
  storageBucket: "familyhub-notification.firebasestorage.app",
  messagingSenderId: "1034259995414",
  appId: "1:1034259995414:web:afa2188b190e2b389a8e37"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestFirebaseToken = async (userId: string) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Get registration token
      const token = await getToken(messaging, { 
        vapidKey: 'BIgEPoYf40tmS_NSHskx6uqp8zHP94xPK0xc2el5F0LdG_kXK0Sj9cC6oafFJSPIXMoze98NbXitRpIGTYbcOZs'
      });
      
      if (token) {
        console.log('FCM Token received:', token);
        // Save token to Supabase
        const { error } = await supabase
          .from('family')
          .update({ fcm_token: token })
          .eq('id', userId);
          
        if (error) console.error('Error saving FCM token:', error);
        return token;
      }
    }
  } catch (error) {
    console.error('An error occurred while retrieving token.', error);
  }
  return null;
};

export const onMessageListener = (callback: (payload: any) => void) => {
  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    callback(payload);
  });
};
