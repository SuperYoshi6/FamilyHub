import { Capacitor } from '@capacitor/core';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import { CalendarEvent, FamilyMember } from '../types';

const MAP_KEY = 'familyhub_native_calendar_map';

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
            if (result?.id) {
                familyCalendarId = result.id;
                console.log(`[Calendar] Familienkalender erstellt: ${calName} (ID: ${result.id})`);
                return familyCalendarId;
            }
        } catch {
            console.log('[Calendar] createCalendar nicht verfügbar, nutze Standard');
        }
        // Fallback: Standardkalender
        const { result } = await CapacitorCalendar.getDefaultCalendar();
        familyCalendarId = result?.id ?? null;
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
            if (result?.id) {
                privateCalendarIds.set(userId, result.id);
                console.log(`[Calendar] Privater Kalender erstellt: ${calName} (ID: ${result.id})`);
                return result.id;
            }
        } catch {
            console.log('[Calendar] createCalendar nicht verfügbar, nutze Standard');
        }
        const { result } = await CapacitorCalendar.getDefaultCalendar();
        privateCalendarIds.set(userId, result?.id ?? null);
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
                ...(isIos ? { alertOffsetInMinutes: [30] } : {}),
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
     * Synchronisiert alle Events in einer Schleife (für Ersteinrichtung oder Refresh)
     */
    public static async syncAllToNative(
        events: CalendarEvent[],
        family: FamilyMember[] = [],
    ): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        const access = await CapacitorCalendar.requestFullCalendarAccess();
        if (access.result !== 'granted') {
            console.warn('[Calendar] Keine Kalender-Berechtigung — Batch-Sync abgebrochen.');
            return;
        }
        familyCalendarId = undefined;
        privateCalendarIds.clear();
        console.log(`[Calendar] Starte Batch-Synchronisation von ${events.length} Terminen...`);
        for (const ev of events) {
            await this.syncEventToNative(ev, family);
        }
        console.log('[Calendar] Batch-Synchronisation abgeschlossen.');
    }
}
