import { Capacitor, registerPlugin } from '@capacitor/core';

interface WidgetBridgePlugin {
    setShoppingData(options: { items: string; count: string }): Promise<void>;
    setCalendarData(options: { events: string; count: string }): Promise<void>;
    setTasksData(options: { tasks: string; count: string }): Promise<void>;
    setMealPlanData(options: { meals: string; count: string }): Promise<void>;
    setMealRequestsData(options: { requests: string; count: string }): Promise<void>;
    notifyUpdate(): Promise<void>;
}

// registerPlugin creates a proxy that connects to the native plugin registered in MainActivity.java
const WidgetBridge = Capacitor.isNativePlatform()
    ? registerPlugin<WidgetBridgePlugin>('WidgetBridge')
    : null;

export async function updateShoppingWidget(items: string[], uncheckedCount: number) {
    if (!WidgetBridge) return;
    const text = items.length > 0
        ? items.slice(0, 8).map(i => `• ${i}`).join('\n')
        : 'Keine Einträge';
    const count = `${uncheckedCount}/${items.length}`;
    try {
        await WidgetBridge.setShoppingData({ items: text, count });
        await WidgetBridge.notifyUpdate();
    } catch (e) {
        console.warn('[WidgetBridge] setShoppingData failed:', e);
    }
}

export async function updateCalendarWidget(events: string[]) {
    if (!WidgetBridge) return;
    const text = events.length > 0
        ? events.slice(0, 5).map(e => `• ${e}`).join('\n')
        : 'Keine Termine';
    const count = `${events.length} Termin${events.length !== 1 ? 'e' : ''}`;
    try {
        await WidgetBridge.setCalendarData({ events: text, count });
        await WidgetBridge.notifyUpdate();
    } catch (e) {
        console.warn('[WidgetBridge] setCalendarData failed:', e);
    }
}

export async function updateTasksWidget(tasks: string[]) {
    if (!WidgetBridge) return;
    const text = tasks.length > 0
        ? tasks.slice(0, 5).map(t => `• ${t}`).join('\n')
        : 'Keine Aufgaben';
    const count = `${tasks.length} offen`;
    try {
        await WidgetBridge.setTasksData({ tasks: text, count });
        await WidgetBridge.notifyUpdate();
    } catch (e) {
        console.warn('[WidgetBridge] setTasksData failed:', e);
    }
}

export async function updateMealPlanWidget(meals: string[]) {
    if (!WidgetBridge) return;
    const text = meals.length > 0
        ? meals.map(m => `• ${m}`).join('\n')
        : 'Keine Mahlzeiten';
    const count = `${meals.length} Mahlzeit${meals.length !== 1 ? 'en' : ''}`;
    try {
        await WidgetBridge.setMealPlanData({ meals: text, count });
        await WidgetBridge.notifyUpdate();
    } catch (e) {
        console.warn('[WidgetBridge] setMealPlanData failed:', e);
    }
}

export async function updateMealRequestsWidget(requests: string[]) {
    if (!WidgetBridge) return;
    const text = requests.length > 0
        ? requests.slice(0, 5).map(r => `• ${r}`).join('\n')
        : 'Keine Wünsche';
    const count = `${requests.length} Wunsch${requests.length !== 1 ? 'ünsche' : ''}`;
    try {
        await WidgetBridge.setMealRequestsData({ requests: text, count });
        await WidgetBridge.notifyUpdate();
    } catch (e) {
        console.warn('[WidgetBridge] setMealRequestsData failed:', e);
    }
}
