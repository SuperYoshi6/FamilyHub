import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/** Muss mit FCM `channel_id` in `push-notify/index.ts` übereinstimmen. */
export const FAMILYHUB_NOTIF_CHANNEL_ID = 'familyhub_notifications';

export async function ensureFamilyHubAndroidNotificationChannel(): Promise<void> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    try {
        await LocalNotifications.createChannel({
            id: FAMILYHUB_NOTIF_CHANNEL_ID,
            name: 'FamilyHub',
            description: 'Mitteilungen von FamilyHub (Push & lokal)',
            importance: 4,
            visibility: 1,
            vibration: true,
        });
    } catch (e) {
        console.warn('[Notifications] createChannel:', e);
    }
}

/** Für `LocalNotifications.schedule` auf Android – gleicher Kanal wie FCM-Payload. */
export function androidNotificationChannelFields(): { channelId?: string } {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        return { channelId: FAMILYHUB_NOTIF_CHANNEL_ID };
    }
    return {};
}
