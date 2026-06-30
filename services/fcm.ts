import { Capacitor } from '@capacitor/core';
import { supabase } from './backend';

// --- Lazy / Safe Firebase & Capacitor Push Imports ---
// All native/remote SDK calls are deferred into functions so that a
// missing plugin or blocked network does NOT crash the module at load time
// (which would produce a white screen on mobile).

let fcmApp: any = null;
let fcmMessaging: any = null;
let fcmSupported: boolean = false;

const initFirebase = async (): Promise<boolean> => {
  if (fcmApp) return true;
  try {
    const { initializeApp } = await import('firebase/app');
    const { getMessaging, isSupported: msgIsSupported } = await import('firebase/messaging');

    const firebaseConfig = {
      apiKey: "AIzaSyBbfFwbszHY1GOr6nhEXiAgo4MuHMofvQs",
      authDomain: "familyhub-notification.firebaseapp.com",
      projectId: "familyhub-notification",
      storageBucket: "familyhub-notification.firebasestorage.app",
      messagingSenderId: "1034259995414",
      appId: "1:1034259995414:web:afa2188b190e2b389a8e37"
    };

    fcmApp = initializeApp(firebaseConfig);
    fcmMessaging = getMessaging(fcmApp);
    fcmSupported = await msgIsSupported();
    return true;
  } catch (e) {
    console.warn('[FCM] Firebase init failed, push disabled:', e);
    return false;
  }
};

const getPushNotifications = async (): Promise<any> => {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    return PushNotifications;
  } catch (e) {
    console.warn('[FCM] Capacitor PushNotifications plugin not available:', e);
    return null;
  }
};

const saveTokenToSupabase = async (userId: string, token: string) => {
  if (!supabase) return;

  // Strategy 1: Try upsert with onConflict (requires unique constraint on token column)
  const { error: tokenError } = await supabase
    .from('fcm_tokens')
    .upsert({ user_id: userId, token: token }, { onConflict: 'token' });

  if (tokenError) {
    console.warn('Supabase Token upsert failed (fcm_tokens):', tokenError.message);
    console.log('Falling back to delete+insert for fcm_tokens...');

    // Strategy 2: Delete existing token for this user, then insert fresh
    const { error: delError } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId);
    if (delError) {
      console.warn('Token delete failed:', delError.message);
    }

    const { error: insertError } = await supabase
      .from('fcm_tokens')
      .insert({ user_id: userId, token: token });
    if (insertError) {
      console.error('Token insert failed:', insertError.message);
    } else {
      console.log('Token saved via delete+insert (fcm_tokens).');
    }
  } else {
    console.log('Token in DB registriert (fcm_tokens).');
  }

  // Always update the family row as well (used as fallback by push-notify)
  const { error: familyError } = await supabase
    .from('family')
    .update({ fcm_token: token })
    .eq('id', userId);

  if (familyError) console.error('Supabase Token Error (family):', familyError.message);
  else console.log('Token updated on family row.');
};

/**
 * Registriert das Gerät für Push-Benachrichtigungen und speichert den Token in Supabase
 */
export const requestFirebaseToken = async (userId: string): Promise<string | null> => {
  try {
    console.log(`[FCM] requestFirebaseToken called for user: ${userId} (native=${Capacitor.isNativePlatform()})`);
    if (Capacitor.isNativePlatform()) {
      return requestNativeToken(userId);
    } else {
      console.log('[FC] Skipping native token request — running on web');
      return requestWebToken(userId);
    }
  } catch (e) {
    console.warn('[FCM] requestFirebaseToken failed:', e);
    return null;
  }
};

const requestNativeToken = async (userId: string): Promise<string | null> => {
  try {
    const PushNotifications = await getPushNotifications();
    if (!PushNotifications) return null;

    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Native Push-Berechtigung verweigert.');
      return null;
    }

    // First: try to get existing cached token (device is already registered)
    try {
      const existingToken = await PushNotifications.getToken();
      if (existingToken && (existingToken as any).value) {
        const token = (existingToken as any).value as string;
        console.log('[FCM] Using cached native token:', token.substring(0, 20) + '...');
        await saveTokenToSupabase(userId, token);
        return token;
      }
    } catch (e) {
      console.warn('[FCM] getToken failed, falling back to registration:', e);
    }

    // Fallback: listen for registration event (first-time registration)
    return new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[FCM] Native token registration timed out');
        resolve(null);
      }, 15000);

      console.log('[FCM] Initializing native listener...');
      const regHandler = async ({ value }: { value: string }) => {
        clearTimeout(timeout);
        console.log('[FCM] Native Token successfully received:', value);
        await saveTokenToSupabase(userId, value);
        resolve(value);
      };

      const errHandler = (error: any) => {
        clearTimeout(timeout);
        console.error('[FCM] Native Registration Error:', JSON.stringify(error));
        resolve(null);
      };

      PushNotifications.addListener('registration', regHandler);
      PushNotifications.addListener('registrationError', errHandler);

      PushNotifications.register().then(() => {
        console.log('[FCM] PushNotifications.register call triggered');
      }).catch((e: any) => {
        console.error('[FCM] Error during PushNotifications.register:', e);
        resolve(null);
      });
    });
  } catch (e) {
    console.error('[FCM] Fatal error in requestNativeToken:', e);
    return null;
  }
};

const requestWebToken = async (userId: string): Promise<string | null> => {
  try {
    const ok = await initFirebase();
    if (!ok || !fcmSupported) return null;

    const { getToken } = await import('firebase/messaging');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Service worker registration — skip silently on localhost (Vite dev server
    // doesn't serve firebase-messaging-sw.js, 404.html redirects it to index.html)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      await navigator.serviceWorker.register('./firebase-messaging-sw.js', {
        scope: './'
      });
    }

    const vapidKey =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_VAPID_KEY) ||
      'BFamja8NGJwmtzCNEA7i9JPX6CBC5DS-s1rA6USxv3QGorqRvkw6uPe5dBwXfyJmqa1iZYGU2POzvtWvBho_8H8';

    const token = await getToken(fcmMessaging, {
      vapidKey: String(vapidKey).trim(),
      serviceWorkerRegistration: undefined  // service worker registered above
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

/**
 * Listener für Nachrichten im Vordergrund
 */
export const onMessageListener = (callback: (payload: any) => void): (() => void) => {
  if (Capacitor.isNativePlatform()) {
    let removeFn: (() => void) | null = null;
    getPushNotifications().then((PushNotifications) => {
      if (!PushNotifications) return;
      const handler = PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('Push empfangen (Native):', notification);
        callback({
          notification: {
            title: notification.title,
            body: notification.body
          },
          data: notification.data
        });
      });
      // store the async remove result
      removeFn = async () => (await handler).remove();
    }).catch(() => {});
    return removeFn ?? (() => {});
  } else {
    let unsubscribe = () => { };
    initFirebase().then((ok) => {
      if (!ok || !fcmSupported) return;
      import('firebase/messaging').then(({ onMessage }) => {
        unsubscribe = onMessage(fcmMessaging, (payload) => {
          console.log('Push empfangen (Web):', payload);
          callback(payload);
        });
      }).catch(() => {});
    }).catch(() => {});
    return () => unsubscribe();
  }
};
