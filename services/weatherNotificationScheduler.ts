import { LocalNotifications } from '@capacitor/local-notifications';
import { fetchWeather } from './weather';
import { androidNotificationChannelFields } from './notificationsAndroid';

export const scheduleHourlyWeatherNotification = async (lat: number, lng: number, location: string) => {
    try {
        // 1. Prüfe ob Berechtigung vorhanden
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== 'granted') {
            const result = await LocalNotifications.requestPermissions();
            if (result.display !== 'granted') {
                console.warn('Weather notifications permission denied');
                return;
            }
        }

        // 2. Hole aktuelle Wetter
        const weather = await fetchWeather(lat, lng);
        if (!weather || !weather.current) return;

        const currentTemp = Math.round(weather.current.temperature_2m);
        const weatherCode = weather.current.weather_code;
        const isDay = weather.current.is_day;

        // 3. Bestimme Wetter-Beschreibung
        let description = 'Wetter-Update';
        if (weatherCode === 0) description = isDay ? '☀️ Sonnig' : '🌙 Klare Nacht';
        else if (weatherCode >= 1 && weatherCode <= 3) description = '☁️ Bewölkt';
        else if (weatherCode >= 51 && weatherCode <= 67) description = '🌧️ Regen';
        else if (weatherCode >= 71 && weatherCode <= 77) description = '❄️ Schnee';
        else if (weatherCode >= 95) description = '⛈️ Gewitter';

        // 4. Schedule nächste Notification (in 1 Stunde)
        const nextTime = new Date();
        nextTime.setHours(nextTime.getHours() + 1);

        await LocalNotifications.schedule({
            notifications: [
                {
                    id: Math.floor(Math.random() * 10000),
                    title: `${location} - ${currentTemp}°C`,
                    body: description,
                    schedule: {
                        at: nextTime,
                        allowWhileIdle: true, // Android: auch bei gesperrtem Bildschirm
                    },
                    smallIcon: 'ic_notification',
                    largeBody: `${description} in ${location}\nTemperatur: ${currentTemp}°C`,
                    actionTypeId: 'weather',
                    ...androidNotificationChannelFields(),
                },
            ],
        });

        console.log(`✅ Weather notification scheduled for ${nextTime.toLocaleTimeString()}`);
    } catch (error) {
        console.error('Error scheduling weather notification:', error);
    }
};

// Automatische Wiederholung alle 60 Minuten
export const startWeatherNotificationLoop = (lat: number, lng: number, location: string, intervalMinutes: number = 60) => {
    // Erste Benachrichtigung sofort + in Intervallen
    scheduleHourlyWeatherNotification(lat, lng, location);

    const interval = setInterval(() => {
        scheduleHourlyWeatherNotification(lat, lng, location);
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval); // Return cleanup function
};

// Stoppe die Benachrichtigungen
export const stopWeatherNotificationLoop = () => {
    // Alle geplanten Notifications löschen
    LocalNotifications.getPending().then((result) => {
        result.notifications.forEach(n => {
            if (n.title && n.title.includes('°C')) {
                LocalNotifications.cancel({ notifications: [{ id: n.id }] });
            }
        });
    });
};
