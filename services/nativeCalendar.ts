import { Capacitor } from '@capacitor/core';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import { CalendarEvent } from '../types';

const MAP_KEY = 'familyhub_native_calendar_map';

/** Zwischengespeicherte Ziel-Kalender-ID (Geräte-Standard, z. B. Samsung-Kalender). */
let resolvedCalendarId: string | null | undefined;

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

    private static async getTargetCalendarId(): Promise<string | undefined> {
        if (resolvedCalendarId !== undefined) {
            return resolvedCalendarId || undefined;
        }
        try {
            const { result } = await CapacitorCalendar.getDefaultCalendar();
            resolvedCalendarId = result?.id ?? null;
        } catch (e) {
            console.warn('[Calendar] Kein Standard-Kalender ermittelt:', e);
            resolvedCalendarId = null;
        }
        return resolvedCalendarId || undefined;
    }

    // Fordert Berechtigungen an
    public static async requestPermissions(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const status = await CapacitorCalendar.requestFullCalendarAccess();
            const ok = status.result === 'granted';
            if (ok) {
                resolvedCalendarId = undefined;
                await this.getTargetCalendarId();
            }
            return ok;
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
            const startTimeStr = event.time?.trim();

            let startDate: Date;
            let endDate: Date;
            let isAllDay = false;

            if (!startTimeStr) {
                isAllDay = true;
                startDate = new Date(`${startDateStr}T00:00:00`);
                endDate = new Date(`${startDateStr}T23:59:59`);
            } else {
                startDate = new Date(`${startDateStr}T${startTimeStr}:00`);
                if (event.endDate && event.endTime?.trim()) {
                    endDate = new Date(`${event.endDate}T${event.endTime.trim()}:00`);
                } else if (event.endDate) {
                    endDate = new Date(`${event.endDate}T23:59:59`);
                } else {
                    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
                }
                if (endDate.getTime() <= startDate.getTime()) {
                    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
                }
            }

            const calendarId = await this.getTargetCalendarId();
            const isIos = Capacitor.getPlatform() === 'ios';

            const { result } = await CapacitorCalendar.createEvent({
                title: event.title,
                ...(calendarId ? { calendarId } : {}),
                location: event.location || '',
                startDate: startDate.getTime(),
                endDate: endDate.getTime(),
                isAllDay: isAllDay,
                notes: `Erstellt via FamilyHub`,
                ...(isIos ? { alertOffsetInMinutes: [30] } : {}),
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

    /**
     * Synchronisiert alle Events in einer Schleife (für Ersteinrichtung oder Refresh)
     */
    public static async syncAllToNative(events: CalendarEvent[]): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        const access = await CapacitorCalendar.requestFullCalendarAccess();
        if (access.result !== 'granted') {
            console.warn('[Calendar] Keine Kalender-Berechtigung — Batch-Sync abgebrochen.');
            return;
        }
        resolvedCalendarId = undefined;
        await this.getTargetCalendarId();
        console.log(`[Calendar] Starte Batch-Synchronisation von ${events.length} Terminen...`);
        for (const ev of events) {
            await this.updateEventInNative(ev);
        }
        console.log('[Calendar] Batch-Synchronisation abgeschlossen.');
    }
}
