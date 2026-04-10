import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { supabase } from './backend'; // Stelle sicher, dass 'supabase' in backend.ts exportiert wird

// Firebase Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyBbfFwbszHY1GOr6nhEXiAgo4MuHMofvQs",
  authDomain: "familyhub-notification.firebaseapp.com",
  projectId: "familyhub-notification",
  storageBucket: "familyhub-notification.firebasestorage.app",
  messagingSenderId: "1034259995414",
  appId: "1:1034259995414:web:afa2188b190e2b389a8e37"
};

// Initialisierung
const app = initializeApp(firebaseConfig);

/**
 * Registriert das Gerät für Push-Benachrichtigungen und speichert den Token in Supabase
 */
export const requestFirebaseToken = async (userId: string) => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('FCM wird von diesem Browser nicht unterstützt.');
      return null;
    }

    const messaging = getMessaging(app);

    // 1. Berechtigung abfragen
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Benachrichtigungs-Berechtigung verweigert.');
      return null;
    }

    // 2. Service Worker registrieren (Wichtig für Pfade auf GitHub Pages)
    const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js', {
      scope: './'
    });

    // 3. Token abrufen
    const token = await getToken(messaging, {
      vapidKey: 'BC0NJwKk4sV6MN7rkHFXZD0mDdCuDPmnTEl_ecM0erwohcVesZKPOZQuiYhuEMtV_mvuGvrK-6jToJKUqbibR6k',
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('FCM Token generiert:', token);

      // 4. In Supabase speichern (Tabelle: fcm_token)
      if (!supabase) {
        console.error("Supabase Client nicht gefunden. Prüfe den Export in backend.ts");
        return token;
      }

      const { error } = await supabase
        .from('fcm_tokens')
        .upsert(
          {
            user_id: userId,
            token: token
          },
          { onConflict: 'token' }
        );

      if (error) {
        console.error('Supabase Fehler beim Speichern des Tokens:', error.message || error);
      } else {
        console.log('Token erfolgreich in DB registriert.');
      }

      return token;
    }
  } catch (error) {
    console.error('Fehler in requestFirebaseToken:', error);
  }
  return null;
};

/**
 * Listener für Nachrichten im Vordergrund. 
 * Gibt eine Unsubscribe-Funktion zurück, um TS-Fehler in useEffect zu vermeiden.
 */
export const onMessageListener = (callback: (payload: any) => void) => {
  let unsubscribe = () => { };

  isSupported().then(supported => {
    if (supported) {
      const messaging = getMessaging(app);
      const unsub = onMessage(messaging, (payload) => {
        console.log('Nachricht empfangen:', payload);
        callback(payload);
      });
      unsubscribe = unsub;
    }
  });

  return () => unsubscribe();
};