import { LocalNotifications } from '@capacitor/local-notifications';
import { fetchWeather } from './weather';
import { androidNotificationChannelFields } from './notificationsAndroid';

/**
 * Plant Wetter-Benachrichtigungen für die nächsten 24 Stunden.
 * Dies ist viel zuverlässiger als ein setInterval, da das System
 * die Termine verwaltet, auch wenn die App geschlossen ist.
 */
export const scheduleWeatherNotificationsBatch = async (lat: number, lng: number, location: string) => {
    try {
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== 'granted') {
            await LocalNotifications.requestPermissions();
        }

        // Zuerst alle alten Wetter-Benachrichtigungen löschen
        await stopWeatherNotificationLoop();

        const weather = await fetchWeather(lat, lng);
        if (!weather || !weather.hourly) return;

        // Wir planen Benachrichtigungen für die nächsten 12 Stunden
        const now = new Date();
        const notifications = [];

        for (let i = 1; i <= 12; i++) {
            const scheduledTime = new Date(now.getTime());
            scheduledTime.setHours(now.getHours() + i, 0, 0, 0);

            // Finde den passenden Index in den Wetterdaten
            const hourIso = scheduledTime.toISOString().slice(0, 13) + ":00";
            const dataIndex = weather.hourly.time.findIndex(t => t.startsWith(hourIso));

            if (dataIndex !== -1) {
                const temp = Math.round(weather.hourly.temperature_2m[dataIndex]);
                const code = weather.hourly.weather_code[dataIndex];

                let desc = 'Wetter-Update';
                if (code === 0) desc = '☀️ Sonnig';
                else if (code >= 1 && code <= 3) desc = '☁️ Bewölkt';
                else if (code >= 51 && code <= 67) desc = '🌧️ Regen';
                else if (code >= 71 && code <= 77) desc = '❄️ Schnee';
                else if (code >= 95) desc = '⛈️ Gewitter';

                notifications.push({
                    id: 987600 + scheduledTime.getHours(),
                    title: `${location} - ${temp}°C`,
                    body: desc,
                    schedule: {
                        at: scheduledTime,
                        allowWhileIdle: true,
                    },
                    smallIcon: 'notification_icon',
                    ...androidNotificationChannelFields(),
                });
            }
        }

        if (notifications.length > 0) {
            await LocalNotifications.schedule({ notifications });
            console.log(`✅ ${notifications.length} weather notifications scheduled.`);
        }
    } catch (error) {
        console.error('Error batch scheduling weather notifications:', error);
    }
};

export const startWeatherNotificationLoop = (lat: number, lng: number, location: string) => {
    // Einmalig Batch planen
    scheduleWeatherNotificationsBatch(lat, lng, location);

    // Den Batch alle 6 Stunden im Hintergrund erneuern (falls App offen)
    const interval = setInterval(() => {
        scheduleWeatherNotificationsBatch(lat, lng, location);
    }, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
};

export const stopWeatherNotificationLoop = async () => {
    const pending = await LocalNotifications.getPending();
    const weatherIds = pending.notifications
        .filter(n => n.id >= 987600 && n.id <= 987699)
        .map(n => ({ id: n.id }));

    if (weatherIds.length > 0) {
        await LocalNotifications.cancel({ notifications: weatherIds });
    }
};
