import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Task, CalendarEvent } from '../types';

const REMINDER_PREFIX = 'fh_reminder_';

function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

export async function scheduleTaskReminder(task: Task) {
    if (!Capacitor.isNativePlatform() || !task.dueDate) return;

    const now = new Date();
    const due = new Date(task.dueDate);
    if (due <= now) return;

    const id = hashCode(REMINDER_PREFIX + task.id);
    const dueStr = due.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

    try {
        const existing = await LocalNotifications.getPending();
        const alreadyScheduled = existing.notifications?.some(n => n.id === id);
        if (alreadyScheduled) return;

        await LocalNotifications.schedule({
            notifications: [{
                id,
                title: task.done ? '✅ Aufgabe erledigt' : '📋 Fällige Aufgabe',
                body: task.done ? `"${task.title}" wurde erledigt.` : `"${task.title}" ist fällig (${dueStr})`,
                schedule: { at: due, allowWhileIdle: true },
                smallIcon: 'notification_icon',
                channelId: 'familyhub_notifications',
            }]
        });
    } catch (e) {
        console.warn('[Reminders] scheduleTaskReminder failed:', e);
    }
}

export async function cancelTaskReminder(taskId: string) {
    if (!Capacitor.isNativePlatform()) return;
    const id = hashCode(REMINDER_PREFIX + taskId);
    try {
        await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch { }
}

export async function scheduleEventReminder(event: CalendarEvent) {
    if (!Capacitor.isNativePlatform()) return;
    if (!event.date) return;

    const now = new Date();
    // Explizit als Lokalzeit parsen (ISO ohne Zeitzone = Local in den meisten Browsern)
    const eventStart = new Date(`${event.date}T${event.time || '09:00'}`);
    if (eventStart <= now) return;

    // Alte Einzel-Erinnerung löschen (vorher gab es nur eine mit Suffix 'event_')
    const oldId = hashCode(REMINDER_PREFIX + 'event_' + event.id);
    try { await LocalNotifications.cancel({ notifications: [{ id: oldId }] }); } catch { }

    const id60 = hashCode(REMINDER_PREFIX + 'event_' + event.id + '_60');
    const id15 = hashCode(REMINDER_PREFIX + 'event_' + event.id + '_15');
    const time60 = new Date(eventStart.getTime() - 60 * 60 * 1000);
    const time15 = new Date(eventStart.getTime() - 15 * 60 * 1000);
    const eventTimeStr = eventStart.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const locationStr = event.location ? ` (${event.location})` : '';

    try {
        const existing = await LocalNotifications.getPending();
        const existingIds = new Set(existing.notifications?.map(n => n.id) || []);

        const notifications = [];

        if (!existingIds.has(id60) && time60 > now) {
            notifications.push({
                id: id60,
                title: '📅 Termin in 60 Minuten',
                body: `"${event.title}" um ${eventTimeStr}${locationStr}`,
                schedule: { at: time60, allowWhileIdle: true },
                smallIcon: 'notification_icon',
                channelId: 'familyhub_notifications',
            });
        }

        if (!existingIds.has(id15) && time15 > now) {
            notifications.push({
                id: id15,
                title: '📅 Termin in 15 Minuten',
                body: `"${event.title}" um ${eventTimeStr}${locationStr}`,
                schedule: { at: time15, allowWhileIdle: true },
                smallIcon: 'notification_icon',
                channelId: 'familyhub_notifications',
            });
        }

        if (notifications.length > 0) {
            await LocalNotifications.schedule({ notifications });
        }
    } catch (e) {
        console.warn('[Reminders] scheduleEventReminder failed:', e);
    }
}

export async function cancelEventReminder(eventId: string) {
    if (!Capacitor.isNativePlatform()) return;
    const id60 = hashCode(REMINDER_PREFIX + 'event_' + eventId + '_60');
    const id15 = hashCode(REMINDER_PREFIX + 'event_' + eventId + '_15');
    const oldId = hashCode(REMINDER_PREFIX + 'event_' + eventId);
    try {
        await LocalNotifications.cancel({ notifications: [{ id: id60 }, { id: id15 }, { id: oldId }] });
    } catch { }
}

export async function scheduleAllReminders(tasks: Task[], events: CalendarEvent[]) {
    if (!Capacitor.isNativePlatform()) return;
    for (const task of tasks) {
        if (task.dueDate) await scheduleTaskReminder(task);
    }
    for (const event of events) {
        if (event.date) await scheduleEventReminder(event);
    }
}
