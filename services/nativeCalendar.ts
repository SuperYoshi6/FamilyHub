import { Capacitor } from '@capacitor/core';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import { CalendarEvent, FamilyMember } from '../types';

const MAP_KEY = 'familyhub_native_calendar_map';
const SYNC_INIT_KEY = 'familyhub_native_calendar_synced';

/** Zwischengespeicherte Ziel-Kalender-IDs. */
let familyCalendarId: string | null | undefined;
const privateCalendarIds = new Map<string, string | null>(); // userId → calendarId

/** Gespeicherte Zuordnung: FamilyHub-Event-ID → native-Event-ID + Kalender-Typ */
interface NativeEventRef { id: string; type: 'family' | 'private'; }
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

function extractCalendarId(result: unknown): string | undefined {
    if (!result) return undefined;
    if (typeof result === 'string') return result;
    if (typeof result === 'object' && result !== null && 'id' in result) {
        const maybeId = (result as { id?: unknown }).id;
        return typeof maybeId === 'string' ? maybeId : undefined;
    }
    return undefined;
}

/**
 * Erstellt oder findet den FamilyHub-Familienkalender.
 * Fallback: Gerät-Standardkalender wenn createCalendar nicht unterstützt.
 */
async function getFamilyCalendarId(): Promise<string | undefined> {
    if (familyCalendarId !== undefined) return familyCalendarId || undefined;
    try {
        // Versuche eigenen Kalender zu erstellen
        const calName = 'FamilyHub - Familie';
        try {
            const { result } = await CapacitorCalendar.createCalendar({
                title: calName,
                color: '#3B82F6',
            });
            const createdId = extractCalendarId(result);
            if (createdId) {
                familyCalendarId = createdId;
                console.log(`[Calendar] Familienkalender erstellt: ${calName} (ID: ${createdId})`);
                return familyCalendarId;
            }
        } catch {
            console.log('[Calendar] createCalendar nicht verfügbar, nutze Standard');
        }
        // Fallback: Standardkalender
        const { result } = await CapacitorCalendar.getDefaultCalendar();
        familyCalendarId = extractCalendarId(result) ?? null;
    } catch (e) {
        console.warn('[Calendar] Familienkalender nicht ermittelbar:', e);
        familyCalendarId = null;
    }
    return familyCalendarId || undefined;
}

/**
 * Erstellt oder findet den privaten Kalender für ein Familienmitglied.
 * Name: "FamilyHub - {Name}"
 */
async function getPrivateCalendarId(userId: string, userName: string): Promise<string | undefined> {
    const cached = privateCalendarIds.get(userId);
    if (cached !== undefined) return cached || undefined;
    try {
        const calName = `FamilyHub - ${userName}`;
        try {
            const { result } = await CapacitorCalendar.createCalendar({
                title: calName,
                color: '#10B981',
            });
            const createdId = extractCalendarId(result);
            if (createdId) {
                privateCalendarIds.set(userId, createdId);
                console.log(`[Calendar] Privater Kalender erstellt: ${calName} (ID: ${createdId})`);
                return createdId;
            }
        } catch {
            console.log('[Calendar] createCalendar nicht verfügbar, nutze Standard');
        }
        const { result } = await CapacitorCalendar.getDefaultCalendar();
        privateCalendarIds.set(userId, extractCalendarId(result) ?? null);
    } catch (e) {
        console.warn(`[Calendar] Privater Kalender für ${userName} nicht ermittelbar:`, e);
        privateCalendarIds.set(userId, null);
    }
    return privateCalendarIds.get(userId) || undefined;
}

/**
 * Baut eine formatierte Notiz mit allen Event-Details für den nativen Kalender.
 */
function buildEventNotes(event: CalendarEvent, authorName?: string): string {
    const lines: string[] = ['📌 FamilyHub'];
    if (event.description) lines.push(`\n📝 ${event.description}`);
    if (event.location) lines.push(`📍 ${event.location}`);
    if (authorName) lines.push(`👤 Erstellt von: ${authorName}`);
    if (event.assignedTo && event.assignedTo.length > 0) {
        lines.push(`🏷️ Zugewiesen an: ${event.assignedTo.length} Person(en)`);
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
                familyCalendarId = undefined;
                privateCalendarIds.clear();
            }
            return ok;
        } catch (e) {
            console.error('Berechtigungsfehler Kalender:', e);
            return false;
        }
    }

    /**
     * Ermittelt den passenden Kalender für ein Event:
     * - Privat (nur 1 Person zugewiesen) → privater Kalender "FamilyHub - {Name}"
     * - Familie (mehrere oder alle) → Familienkalender "FamilyHub - Familie"
     */
    private static async resolveCalendarId(
        event: CalendarEvent,
        family: FamilyMember[],
    ): Promise<string | undefined> {
        const assigned = event.assignedTo?.filter(Boolean) || [];

        // Privat: genau eine Person
        if (assigned.length === 1) {
            const member = family.find(m => m.id === assigned[0]);
            if (member) {
                return getPrivateCalendarId(member.id, member.name);
            }
        }

        // Familie: mehrere Personen oder keiner zugewiesen
        return getFamilyCalendarId();
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

            const calendarId = await this.resolveCalendarId(event, family);
            const isIos = Capacitor.getPlatform() === 'ios';
            const authorName = event.authorId ? family.find(m => m.id === event.authorId)?.name : undefined;
            const notes = buildEventNotes(event, authorName);

            const { result } = await CapacitorCalendar.createEvent({
                title: event.title,
                ...(calendarId ? { calendarId } : {}),
                location: event.location || '',
                startDate: startDate.getTime(),
                endDate: endDate.getTime(),
                isAllDay: isAllDay,
                notes,
                // 24h before (1440 min) + at event time (0 min) for both platforms
                alertOffsetInMinutes: [1440, 0],
            });

            const map = getEventMap();
            const assigned = event.assignedTo?.filter(Boolean) || [];
            if (result) {
                map[event.id] = { id: result, type: assigned.length === 1 ? 'private' : 'family' };
                console.log(`[Calendar] Synchronisiert (${assigned.length === 1 ? 'Privat' : 'Familie'}) mit ID: ${result}`);
            } else {
                map[event.id] = { id: 'skipped', type: assigned.length === 1 ? 'private' : 'family' };
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
     * Synchronisiert alle Events in einer Schleife (nur beim ersten Start).
     * Spätere Änderungen werden einzeln über syncEventToNative/updateEventInNative/deleteEventFromNative
     * synchronisiert, damit der Samsung-Kalender nicht bei jedem Daten-Load alle Events neu anlegt
     * und dadurch mehrfache Benachrichtigungen auslöst.
     */
    public static async syncAllToNative(
        events: CalendarEvent[],
        family: FamilyMember[] = [],
    ): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        // Nur beim ersten Mal wirklich alles löschen und neu anlegen (max. 1× pro Tag)
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
        familyCalendarId = undefined;
        privateCalendarIds.clear();

        // Alte native Einträge löschen, bevor neu synchronisiert wird
        const oldMap = getEventMap();
        const nativeIds = Object.values(oldMap).map(ref => ref.id).filter(Boolean) as string[];
        if (nativeIds.length > 0) {
            console.log(`[Calendar] Lösche ${nativeIds.length} alte native Einträge...`);
            try {
                await CapacitorCalendar.deleteEventsById({ ids: nativeIds });
            } catch (e) {
                console.warn('[Calendar] Löschen alter Einträge fehlgeschlagen:', e);
            }
        }
        localStorage.removeItem(MAP_KEY);

        console.log(`[Calendar] Starte Batch-Synchronisation von ${events.length} Terminen...`);
        for (const ev of events) {
            await this.syncEventToNative(ev, family);
        }
        localStorage.setItem(SYNC_INIT_KEY, String(Date.now()));
        console.log('[Calendar] Batch-Synchronisation abgeschlossen.');
    }
}
