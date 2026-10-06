import { Capacitor } from '@capacitor/core';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import { CalendarEvent, FamilyMember } from '../types';

const MAP_KEY = 'familyhub_native_calendar_map';
const SYNC_INIT_KEY = 'familyhub_native_calendar_synced';

/** Zwischengespeicherte Ziel-Kalender-ID (über listCalendars + Auswahl). */
let targetCalendarId: string | null | undefined;

/** Gespeicherte Zuordnung: FamilyHub-Event-ID → native-Event-ID */
interface NativeEventRef { id: string; }
function getEventMap(): Record<string, NativeEventRef> {
    try {
        return JSON.parse(localStorage.getItem(MAP_KEY) || '{}');
    } catch {
        return {};
    }
}
function setEventMap(map: Record<string, NativeEventRef>) {
    localStorage.setItem(MAP_KEY, JSON.stringify(map));
}

/**
 * Listet alle Kalender auf Android und wählt den ersten beschreibbaren aus.
 * Samsung hat oft das Samsung-Konto als "primary" (read-only!) — daher
 * suchen wir stattdessen nach einem lokalen/beschreibbaren Kalender.
 */
async function findWritableCalendar(): Promise<string | undefined> {
    if (targetCalendarId !== undefined) return targetCalendarId || undefined;
    try {
        const { result: calendars } = await CapacitorCalendar.listCalendars();
        const list = calendars as unknown as Array<{ id: string; title: string; color?: string }>;
        if (!Array.isArray(list) || list.length === 0) {
            console.warn('[Calendar] Keine Kalender gefunden');
            targetCalendarId = null;
            return undefined;
        }

        // Bevorzuge lokale Kalender (kein "samsung", "exchange", "google" im Namen)
        const localFirst = list.find(c =>
            !/samsung|exchange|google|outlook/i.test(c.title) &&
            !c.title.startsWith('FamilyHub')
        );
        if (localFirst) {
            targetCalendarId = localFirst.id;
            console.log(`[Calendar] Nutze Kalender: ${localFirst.title} (${localFirst.id})`);
            return targetCalendarId;
        }

        // Fallback: erster nicht-FamilyHub-Kalender
        const other = list.find(c => !c.title.startsWith('FamilyHub'));
        if (other) {
            targetCalendarId = other.id;
            console.log(`[Calendar] Fallback-Kalender: ${other.title} (${other.id})`);
            return targetCalendarId;
        }

        // Letzter Fallback: überhaupt erster
        targetCalendarId = list[0].id;
        console.log(`[Calendar] Letzter Fallback-Kalender: ${list[0].title} (${list[0].id})`);
        return targetCalendarId;
    } catch (e) {
        console.warn('[Calendar] listCalendars fehlgeschlagen:', e);
        targetCalendarId = null;
        return undefined;
    }
}

/**
 * Baut eine formatierte Notiz mit allen Event-Details für den nativen Kalender.
 */
function buildEventNotes(event: CalendarEvent, family: FamilyMember[], authorName?: string): string {
    const lines: string[] = ['📌 FamilyHub'];
    if (event.description) lines.push(`\n📝 ${event.description}`);
    if (event.location) lines.push(`📍 ${event.location}`);
    if (authorName) lines.push(`👤 Erstellt von: ${authorName}`);
    if (event.assignedTo && event.assignedTo.length > 0) {
        const names = event.assignedTo
            .map(id => family.find(m => m.id === id)?.name)
            .filter(Boolean)
            .join(', ');
        lines.push(`🏷️ Zugewiesen an: ${names}`);
    }
    return lines.join('\n');
}

export class NativeCalendarService {

    // Fordert Berechtigungen an
    public static async requestPermissions(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const status = await CapacitorCalendar.requestFullCalendarAccess();
            const ok = status.result === 'granted';
            if (ok) {
                targetCalendarId = undefined;
            }
            return ok;
        } catch (e) {
            console.error('[Calendar] Berechtigungsfehler:', e);
            return false;
        }
    }

    /**
     * Ermittelt den passenden Kalender für ein Event in einem Schritt.
     * Samsung: kein createCalendar (nicht implementiert), stattdessen listCalendars + Auswahl.
     */
    private static async resolveCalendarId(): Promise<string | undefined> {
        return findWritableCalendar();
    }

    // Synchronisiert einen neuen Termin zum Handy-Kalender
    public static async syncEventToNative(
        event: CalendarEvent,
        family: FamilyMember[] = [],
    ): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        // Verhindere doppelte Synchronisation des gleichen Events
        const map = getEventMap();
        if (map[event.id]) {
            console.log(`[Calendar] Event ${event.id} bereits synchronisiert, überspringe`);
            return;
        }

        try {
            const startDateStr = event.date;
            const startTimeStr = event.time?.trim();

            let startDate: Date;
            let endDate: Date;
            let isAllDay = false;

            const parseLocalDate = (dateStr: string) => {
                const [y, m, d] = dateStr.split('-').map(Number);
                return new Date(y, m - 1, d);
            };

            if (!startTimeStr) {
                isAllDay = true;
                startDate = parseLocalDate(startDateStr);
                const endParts = startDateStr.split('-').map(Number);
                endDate = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59);
            } else {
                const [h, mi] = startTimeStr.split(':').map(Number);
                const startParts = startDateStr.split('-').map(Number);
                startDate = new Date(startParts[0], startParts[1] - 1, startParts[2], h, mi);
                if (event.endDate && event.endTime?.trim()) {
                    const [eh, em] = event.endTime.trim().split(':').map(Number);
                    const eParts = event.endDate.split('-').map(Number);
                    endDate = new Date(eParts[0], eParts[1] - 1, eParts[2], eh, em);
                } else if (event.endDate) {
                    const eParts = event.endDate.split('-').map(Number);
                    endDate = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59);
                } else {
                    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
                }
                if (endDate.getTime() <= startDate.getTime()) {
                    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
                }
            }

            const calendarId = await this.resolveCalendarId();
            const authorName = event.authorId ? family.find(m => m.id === event.authorId)?.name : undefined;
            const notes = buildEventNotes(event, family, authorName);

            const { result } = await CapacitorCalendar.createEvent({
                title: event.title,
                ...(calendarId ? { calendarId } : {}),
                location: event.location || '',
                startDate: startDate.getTime(),
                endDate: endDate.getTime(),
                isAllDay: isAllDay,
                notes,
                alertOffsetInMinutes: [1440, 0],
            });

            const map = getEventMap();
            if (result) {
                const nativeId = typeof result === 'string' ? result : Array.isArray(result) ? result[0] : String(result);
                map[event.id] = { id: nativeId };
                console.log(`[Calendar] Synchronisiert (native ID: ${nativeId})`);
            } else {
                map[event.id] = { id: 'skipped' };
                console.log(`[Calendar] Event ${event.id} als synchronisiert markiert (keine native ID)`);
            }
            setEventMap(map);
        } catch (e) {
            console.error('[Calendar] Fehler bei nativer Synchronisation:', e);
        }
    }

    public static async deleteEventFromNative(eventId: string): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        try {
            const map = getEventMap();
            const ref = map[eventId];
            if (ref?.id && ref.id !== 'skipped') {
                await CapacitorCalendar.deleteEventsById({ ids: [ref.id] });
                delete map[eventId];
                setEventMap(map);
                console.log(`[Calendar] Gelöscht aus nativem Kalender: ${ref.id}`);
            } else if (ref) {
                delete map[eventId];
                setEventMap(map);
            }
        } catch (e) {
            console.error('[Calendar] Fehler beim Löschen aus nativem Kalender:', e);
        }
    }

    public static async updateEventInNative(
        event: CalendarEvent,
        family: FamilyMember[] = [],
    ): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await this.deleteEventFromNative(event.id);
            await this.syncEventToNative(event, family);
        } catch (e) {
            console.error('[Calendar] Fehler beim Update des nativen Kalenders:', e);
        }
    }

    /**
     * Synchronisiert alle Events (nur beim ersten Start oder nach 24h).
     * Spätere Änderungen werden einzeln über syncEventToNative/updateEventInNative/deleteEventFromNative
     * synchronisiert.
     */
    public static async syncAllToNative(
        events: CalendarEvent[],
        family: FamilyMember[] = [],
    ): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        const lastSync = localStorage.getItem(SYNC_INIT_KEY);
        if (lastSync) {
            const lastSyncTime = parseInt(lastSync, 10);
            if (!isNaN(lastSyncTime) && Date.now() - lastSyncTime < 24 * 60 * 60 * 1000) {
                console.log('[Calendar] Initial-Sync bereits erfolgt — überspringe Batch-Sync');
                return;
            }
            console.log('[Calendar] Letzter Sync >24h her — führe erneuten Komplett-Sync durch');
        }

        const access = await CapacitorCalendar.requestFullCalendarAccess();
        if (access.result !== 'granted') {
            console.warn('[Calendar] Keine Kalender-Berechtigung — Batch-Sync abgebrochen.');
            return;
        }
        targetCalendarId = undefined;

        // Alte native Einträge löschen
        const oldMap = getEventMap();
        const nativeIds = Object.values(oldMap).map(ref => ref.id).filter(Boolean) as string[];
        if (nativeIds.length > 0) {
            console.log(`[Calendar] Lösche ${nativeIds.length} alte native Einträge...`);
            try {
                const { result } = await CapacitorCalendar.deleteEventsById({ ids: nativeIds });
                const deleted = result?.deleted as string[] | undefined;
                const failed = result?.failed as string[] | undefined;
                if (failed && failed.length > 0) {
                    console.warn(`[Calendar] ${failed.length} Einträge konnten nicht gelöscht werden:`, failed);
                }
                if (deleted) {
                    console.log(`[Calendar] ${deleted.length} Einträge erfolgreich gelöscht`);
                }
            } catch (e) {
                console.warn('[Calendar] Löschen alter Einträge fehlgeschlagen:', e);
                // Nicht abbrechen — Map bleibt erhalten und wird nicht gelöscht,
                // damit keine Duplikate entstehen
                return;
            }
        }
        localStorage.removeItem(MAP_KEY);

        console.log(`[Calendar] Starte Batch-Synchronisation von ${events.length} Terminen...`);
        let synced = 0;
        let failed = 0;
        for (const ev of events) {
            try {
                await this.syncEventToNative(ev, family);
                synced++;
            } catch (e) {
                failed++;
                console.warn(`[Calendar] Fehler beim Sync von Event ${ev.id}:`, e);
            }
        }
        localStorage.setItem(SYNC_INIT_KEY, String(Date.now()));
        console.log(`[Calendar] Batch-Synchronisation abgeschlossen: ${synced} ok, ${failed} fehlgeschlagen`);
    }
}
