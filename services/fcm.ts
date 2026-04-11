import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { supabase } from './backend';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

// Firebase Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyBbfFwbszHY1GOr6nhEXiAgo4MuHMofvQs",
  authDomain: "familyhub-notification.firebaseapp.com",
  projectId: "familyhub-notification",
  storageBucket: "familyhub-notification.firebasestorage.app",
  messagingSenderId: "1034259995414",
  appId: "1:1034259995414:web:afa2188b190e2b389a8e37"
};

// Initialisierung (Web)
const app = initializeApp(firebaseConfig);

/**
 * Registriert das Gerät für Push-Benachrichtigungen und speichert den Token in Supabase
 */
export const requestFirebaseToken = async (userId: string) => {
  if (Capacitor.isNativePlatform()) {
    return requestNativeToken(userId);
  } else {
    return requestWebToken(userId);
  }
};

const requestNativeToken = async (userId: string) => {
  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Native Push-Berechtigung verweigert.');
      return null;
    }

    return new Promise<string | null>((resolve) => {
      console.log('[FCM] Initializing native listener...');
      // Add listeners before registration
      PushNotifications.addListener('registration', async ({ value }) => {
        console.log('[FCM] Native Token successfully received:', value);
        await saveTokenToSupabase(userId, value);
        resolve(value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[FCM] Native Registration Error:', JSON.stringify(error));
        resolve(null);
      });

      PushNotifications.register().then(() => {
        console.log('[FCM] PushNotifications.register call triggered');
      }).catch(e => {
        console.error('[FCM] Error during PushNotifications.register:', e);
        resolve(null);
      });
    });
  } catch (e) {
    console.error('[FCM] Fatal error in requestNativeToken:', e);
    return null;
  }
};

const requestWebToken = async (userId: string) => {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js', {
      scope: './'
    });

    const token = await getToken(messaging, {
      vapidKey: 'BC0NJwKk4sV6MN7rkHFXZD0mDdCuDPmnTEl_ecM0erwohcVesZKPOZQuiYhuEMtV_mvuGvrK-6jToJKUqbibR6k',
      serviceWorkerRegistration: registration
    });

    if (token) {
      await saveTokenToSupabase(userId, token);
      return token;
    }
  } catch (error) {
    console.error('Web FCM Fehler:', error);
  }
  return null;
};

const saveTokenToSupabase = async (userId: string, token: string) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('fcm_tokens')
    .upsert({ user_id: userId, token: token }, { onConflict: 'token' });
  
  if (error) console.error('Supabase Token Error:', error.message);
  else console.log('Token in DB registriert.');
};

/**
 * Listener für Nachrichten im Vordergrund
 */
export const onMessageListener = (callback: (payload: any) => void) => {
  if (Capacitor.isNativePlatform()) {
    const handler = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push empfangen (Native):', notification);
      callback({
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data
      });
    });
    return async () => (await handler).remove();
  } else {
    let unsubscribe = () => { };
    isSupported().then(supported => {
      if (supported) {
        const messaging = getMessaging(app);
        unsubscribe = onMessage(messaging, (payload) => {
          console.log('Push empfangen (Web):', payload);
          callback(payload);
        });
      }
    });
    return () => unsubscribe();
  }
};