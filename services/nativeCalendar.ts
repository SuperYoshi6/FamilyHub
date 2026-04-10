import { Capacitor } from '@capacitor/core';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import { CalendarEvent } from '../types';

const MAP_KEY = 'familyhub_native_calendar_map';

export class NativeCalendarService {
    private static getMap(): Record<string, string> {
        try {
            return JSON.parse(localStorage.getItem(MAP_KEY) || '{}');
        } catch {
            return {};
        }
    }

    private static setMap(map: Record<string, string>) {
        localStorage.setItem(MAP_KEY, JSON.stringify(map));
    }

    // Fordert Berechtigungen an
    public static async requestPermissions(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const status = await CapacitorCalendar.requestFullCalendarAccess();
            return status.result === 'granted';
        } catch (e) {
            console.error('Berechtigungsfehler Kalender:', e);
            return false;
        }
    }

    // Synchronisiert einen neuen Termin zum Handy-Kalender
    public static async syncEventToNative(event: CalendarEvent): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        try {
            const map = this.getMap();
            const startDateStr = event.date;
            const startTimeStr = event.time;

            let startDate: Date;
            let endDate: Date;
            let isAllDay = false;

            if (!startTimeStr) {
                isAllDay = true;
                startDate = new Date(`${startDateStr}T00:00:00`);
                endDate = new Date(`${startDateStr}T23:59:59`);
            } else {
                startDate = new Date(`${startDateStr}T${startTimeStr}:00`);
                endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 Std
            }

            // KORREKTUR: 'result' statt 'id' extrahieren
            const { result } = await CapacitorCalendar.createEvent({
                title: event.title,
                location: event.location || '',
                startDate: startDate.getTime(),
                endDate: endDate.getTime(),
                isAllDay: isAllDay,
                // KORREKTUR: Sicherer Zugriff auf createdBy
                notes: `Erstellt via FamilyHub`
            });

            if (result) {
                map[event.id] = result;
                this.setMap(map);
                console.log('Erfolgreich synchronisiert mit ID:', result);
            }
        } catch (e) {
            console.error('Fehler bei nativer Synchronisation:', e);
        }
    }

    public static async deleteEventFromNative(eventId: string): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        try {
            const map = this.getMap();
            const nativeId = map[eventId];
            if (nativeId) {
                await CapacitorCalendar.deleteEventsById({ ids: [nativeId] });
                delete map[eventId];
                this.setMap(map);
                console.log('Erfolgreich aus nativen Kalender gelöscht:', nativeId);
            }
        } catch (e) {
            console.error('Fehler beim Löschen aus nativem Kalender:', e);
        }
    }

    public static async updateEventInNative(event: CalendarEvent): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        try {
            // CapacitorCalendar doesn't support direct update via ID, so we delete and recreate
            await this.deleteEventFromNative(event.id);
            await this.syncEventToNative(event);
        } catch (e) {
            console.error('Fehler beim Update des nativen Kalenders:', e);
        }
    }
}