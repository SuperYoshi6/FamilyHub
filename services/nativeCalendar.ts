import { Capacitor } from '@capacitor/core';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import { CalendarEvent } from '../types';

// We store the mapping of FamilyHub Event ID to Native Calendar Event ID
// Since native sync is device-dependent, we use localStorage.
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

    public static async requestPermissions(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const { result } = await CapacitorCalendar.requestFullCalendarAccess();
            return result === 'granted';
        } catch (e) {
            console.error('Failed to request native calendar permissions', e);
            return false;
        }
    }

    public static async checkPermissions(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const { result } = await CapacitorCalendar.checkAllPermissions();
            return result.readCalendar === 'granted' && result.writeCalendar === 'granted';
        } catch (e) {
            return false;
        }
    }

    public static async syncEvent(event: CalendarEvent, isDelete: boolean = false) {
        if (!Capacitor.isNativePlatform()) return;

        const map = this.getMap();
        const nativeId = map[event.id];

        // If a deleting occurs or we want to update, and we have a native ID, delete the native event first!
        // (Ebarooni allows updating but recreating is safer cross-platform)
        if (nativeId) {
            try {
                await CapacitorCalendar.deleteEvent({ id: nativeId });
            } catch (e) {
                console.warn('Could not delete old native calendar event, might already be deleted', e);
            }
            delete map[event.id];
            this.setMap(map);
        }

        if (isDelete) return;

        // Try creating the new event
        try {
            const startDateStr = event.date; // YYYY-MM-DD
            const startTimeStr = event.time; // HH:MM (if missing, it's all-day)
            
            let startDate: Date;
            let endDate: Date;
            let isAllDay = false;

            if (!startTimeStr) {
                // All Day Event
                isAllDay = true;
                startDate = new Date(`${startDateStr}T00:00:00`);
                endDate = event.endDate ? new Date(`${event.endDate}T23:59:59`) : new Date(`${startDateStr}T23:59:59`);
            } else {
                startDate = new Date(`${startDateStr}T${startTimeStr}:00`);
                if (event.endDate || event.endTime) {
                    endDate = new Date(`${event.endDate || event.date}T${event.endTime || event.time || '23:59'}:00`);
                } else {
                    // Default duration 1 hour
                    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
                }
            }

            const { id } = await CapacitorCalendar.createEvent({
                title: event.title,
                location: event.location || '',
                startDate: startDate.getTime(),
                endDate: endDate.getTime(),
                isAllDay: isAllDay
            });

            if (id) {
                map[event.id] = id;
                this.setMap(map);
            }
        } catch (e) {
            console.error('Error creating native calendar event', e);
        }
    }
}
