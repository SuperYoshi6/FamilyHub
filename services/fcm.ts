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
  if (!supabase) {
    console.warn('[FCM] saveTokenToSupabase: supabase not initialized');
    return;
  }

  // Insert or update: delete old entry for this (user, token) first, then insert fresh
  // Dadurch können mehrere Accounts auf einem Gerät je eigene Zeilen haben
  const { error: deleteError } = await supabase
    .from('fcm_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);

  if (deleteError) {
    console.warn('[FCM] Delete before insert failed:', deleteError.message);
  }

  const { error: insertError } = await supabase
    .from('fcm_tokens')
    .insert({ user_id: userId, token: token });

  if (insertError) {
    console.warn('[FCM] Token insert failed:', insertError.message);
  } else {
    console.log('[FCM] Token registriert (fcm_tokens).');
  }

  // Always update the family row as well (used as fallback by push-notify)
  const { error: familyError } = await supabase
    .from('family')
    .update({ fcm_token: token })
    .eq('id', userId);

  if (familyError) console.error('[FCM] Token update on family row failed:', familyError.message);
  else console.log('[FCM] Token updated on family row.');
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
    if (!PushNotifications) {
      console.warn('[FCM] PushNotifications plugin not available');
      return null;
    }

    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[FCM] Native Push-Berechtigung verweigert.');
      return null;
    }

    // Add listeners BEFORE getToken/register to avoid race conditions
    let registrationResolved = false;
    const tokenFromRegistration = await new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        if (!registrationResolved) {
          console.warn('[FCM] Native token registration timed out');
          resolve(null);
        }
      }, 15000);

      const regHandler = async (data: any) => {
        if (registrationResolved) return;
        registrationResolved = true;
        clearTimeout(timeout);
        const token = typeof data === 'string' ? data : data?.value || '';
        if (token) {
          console.log('[FCM] Native Token received via event:', token.substring(0, 20) + '...');
          await saveTokenToSupabase(userId, token);
          resolve(token);
        } else {
          resolve(null);
        }
      };

      const errHandler = (error: any) => {
        if (registrationResolved) return;
        registrationResolved = true;
        clearTimeout(timeout);
        console.error('[FCM] Native Registration Error:', JSON.stringify(error));
        resolve(null);
      };

      PushNotifications.addListener('registration', regHandler);
      PushNotifications.addListener('registrationError', errHandler);

      // Also try getToken immediately (may return cached token)
      (async () => {
        try {
          const existingToken = await PushNotifications.getToken();
          if (!registrationResolved && existingToken) {
            const token = typeof existingToken === 'string' ? existingToken : (existingToken as any)?.value || '';
            if (token) {
              registrationResolved = true;
              clearTimeout(timeout);
              console.log('[FCM] Using cached native token:', token.substring(0, 20) + '...');
              await saveTokenToSupabase(userId, token);
              resolve(token);
            }
          }
        } catch (e) {
          console.log('[FCM] getToken() returned no cached token, registering...');
        }
      })();

      PushNotifications.register().then(() => {
        console.log('[FCM] PushNotifications.register call triggered');
      }).catch((e: any) => {
        console.error('[FCM] Error during PushNotifications.register:', e);
        if (!registrationResolved) {
          registrationResolved = true;
          clearTimeout(timeout);
          resolve(null);
        }
      });
    });

    return tokenFromRegistration;
  } catch (e) {
    console.error('[FCM] Fatal error in requestNativeToken:', e);
    return null;
  }
};

const requestWebToken = async (userId: string): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Web notification permission denied');
      return null;
    }

    // Register service worker for background message handling
    try {
      const swUrl = new URL('./firebase-messaging-sw.js', window.location.href).href;
      await navigator.serviceWorker.register(swUrl, { scope: './' });
      await navigator.serviceWorker.ready;
    } catch (swErr) {
      console.warn('[FCM] Service worker registration error (non-fatal):', swErr);
      return null;
    }

    // Try Firebase getToken (requires SW at root scope — works on custom domain, not on GitHub Pages subpath)
    const ok = await initFirebase();
    if (ok && fcmSupported) {
      try {
        const { getToken } = await import('firebase/messaging');
        const vapidKey =
          (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_VAPID_KEY) ||
          'BFamja8NGJwmtzCNEA7i9JPX6CBC5DS-s1rA6USxv3QGorqRvkw6uPe5dBwXfyJmqa1iZYGU2POzvtWvBho_8H8';
        const token = await getToken(fcmMessaging, {
          vapidKey: String(vapidKey).trim(),
          serviceWorkerRegistration: undefined
        });
        if (token) {
          await saveTokenToSupabase(userId, token);
          return token;
        }
      } catch (fbErr) {
        console.warn('[FCM] Firebase getToken failed (expected on subdirectory deploys):', fbErr);
      }
    }

    console.warn('[FCM] Web push not available on this deployment (GitHub Pages subpath). Use native Android for push.');
    return null;
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
