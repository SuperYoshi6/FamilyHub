import { FamilyMember, CalendarEvent, ShoppingItem, Task, MealPlan, MealRequest, SavedLocation, Recipe, NewsItem, FeedbackItem, Poll, AppNotification } from "../types";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- INITIAL DATA MOCKS (Fallback) ---
const INITIAL_FAMILY: FamilyMember[] = [
    {
        id: 'admin_user',
        name: 'Administrator',
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff',
        color: 'bg-gray-800 text-white',
        role: 'admin',
        password: 'admin' 
    }
];
const INITIAL_EVENTS: CalendarEvent[] = [];
const INITIAL_SHOPPING: ShoppingItem[] = [];
const INITIAL_TASKS: Task[] = [];

// --- INITIAL NEWS (Empty) ---
export const INITIAL_NEWS: NewsItem[] = [];

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://hjkmfodzhradtkeiyele.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqa21mb2R6aHJhZHRrZWl5ZWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0ODIwNjEsImV4cCI6MjA2ODA1ODA2MX0.2cfezsLcT6x3KI9VqzrHntP80O-cy0JQUb7UK3Mnai8';

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false }, 
            global: {
                headers: { 'x-my-custom-header': 'familienhub' },
            },
        });
        console.log("🔌 Connected to Supabase");
    } catch (e) {
        console.error("Supabase init failed:", e);
    }
} else {
    console.log("💾 Running in LocalStorage Mode (Keys not configured)");
}

// --- INTERFACE ---
interface ICollection<T> {
    getAll(): Promise<T[]>;
    add(item: T): Promise<T[]>;
    update(id: string, updates: Partial<T>): Promise<T[]>;
    delete(id: string): Promise<T[]>;
    setAll(items: T[]): Promise<T[]>;
}

// --- LOCAL STORAGE IMPLEMENTATION ---
class LocalStorageCollection<T extends { id: string }> implements ICollection<T> {
    constructor(private key: string, private defaultVal: T[]) {}

    private async delay(ms: number = 50) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private getStored(): T[] {
        try {
            const item = localStorage.getItem(this.key);
            const data = item ? JSON.parse(item) : this.defaultVal;
            return data;
        } catch {
            return this.defaultVal;
        }
    }

    private setStored(data: T[]) {
        try {
            localStorage.setItem(this.key, JSON.stringify(data));
        } catch (e) {
            console.error("Storage full or error", e);
        }
    }

    async getAll(): Promise<T[]> {
        await this.delay();
        return this.getStored();
    }

    async add(item: T): Promise<T[]> {
        await this.delay();
        const data = this.getStored();
        // Check for duplicates
        if (!data.find(d => d.id === item.id)) {
            const newData = [...data, item];
            this.setStored(newData);
            return newData;
        }
        return data;
    }

    async update(id: string, updates: Partial<T>): Promise<T[]> {
        await this.delay();
        const data = this.getStored();
        const newData = data.map(d => d.id === id ? { ...d, ...updates } : d);
        this.setStored(newData);
        return newData;
    }

    async delete(id: string): Promise<T[]> {
        await this.delay();
        const data = this.getStored();
        const newData = data.filter(d => d.id !== id);
        this.setStored(newData);
        return newData;
    }

    async setAll(items: T[]): Promise<T[]> {
        await this.delay();
        this.setStored(items);
        return items;
    }
}

// --- SUPABASE IMPLEMENTATION WITH ROBUST FALLBACK ---
class SupabaseCollection<T extends { id: string }> implements ICollection<T> {
    private localFallback: LocalStorageCollection<T>;

    constructor(private table: string, key: string, defaultVal: T[]) {
        this.localFallback = new LocalStorageCollection<T>(key, defaultVal);
    }

    private sanitize(item: Partial<T> | T): any {
        const payload: any = { ...item };
        if (this.table === 'news' && 'readBy' in payload) {
            delete payload.readBy;
        }
        return payload;
    }

    async getAll(): Promise<T[]> {
        // Try Supabase first, fallback to local on ANY error
        if (supabase) {
            try {
                const { data, error } = await supabase.from(this.table).select('*');
                
                if (!error && data) {
                    // Success: Update local cache and return fresh data
                    await this.localFallback.setAll(data as T[]);
                    return data as T[];
                } else if (error) {
                    console.warn(`[Supabase] Load warning (${this.table}): ${error.message}. Using fallback.`);
                }
            } catch (err) {
                console.warn(`[Supabase] Network error (${this.table}). Using fallback.`, err);
            }
        }
        
        // Fallback
        return this.localFallback.getAll();
    }

    async add(item: T): Promise<T[]> {
        // Optimistic: Update local immediately
        await this.localFallback.add(item);

        if (supabase) {
            try {
                const payload = this.sanitize(item);
                const { error } = await supabase.from(this.table).insert(payload);
                if (error) console.error(`[Supabase] Add sync error (${this.table}):`, error.message);
            } catch (err) {
                console.error(`[Supabase] Add network error (${this.table}):`, err);
            }
        }
        return this.localFallback.getAll();
    }

    async update(id: string, updates: Partial<T>): Promise<T[]> {
        await this.localFallback.update(id, updates);

        if (supabase) {
            try {
                const payload = this.sanitize(updates);
                if (Object.keys(payload).length > 0) {
                    const { error } = await supabase.from(this.table).update(payload).eq('id', id);
                    if (error) console.error(`[Supabase] Update sync error (${this.table}):`, error.message);
                }
            } catch (err) {
                console.error(`[Supabase] Update network error (${this.table}):`, err);
            }
        }
        return this.localFallback.getAll();
    }

    async delete(id: string): Promise<T[]> {
        await this.localFallback.delete(id);

        if (supabase) {
            try {
                const { error } = await supabase.from(this.table).delete().eq('id', id);
                if (error) console.error(`[Supabase] Delete sync error (${this.table}):`, error.message);
            } catch (err) {
                console.error(`[Supabase] Delete network error (${this.table}):`, err);
            }
        }
        return this.localFallback.getAll();
    }

    async setAll(items: T[]): Promise<T[]> {
        // 1. Update Local Fallback immediately (Optimistic)
        await this.localFallback.setAll(items);

        if (supabase) {
            try {
                if (items.length === 0) {
                    // Case 1: Empty list -> Delete ALL items in the table
                    // We use neq '0' to match all string IDs (assuming no ID is exactly "0")
                    const { error: deleteError } = await supabase.from(this.table).delete().neq('id', '0');
                    if (deleteError) console.error(`[Supabase] Clear error (${this.table}):`, deleteError.message);
                    else console.log(`[Supabase] Cleared table ${this.table}`);
                } else {
                    // Case 2: Items exist -> Sync
                    const ids = items.map(i => i.id).filter(id => id); // Ensure no undefined IDs
                    
                    if (ids.length > 0) {
                        // 1. Delete items that are NOT in the new list
                        // FIX: Explicitly format list for PostgREST syntax if standard array fails
                        const idList = `(${ids.map(id => `"${id}"`).join(',')})`;
                        const { error: deleteError } = await supabase.from(this.table).delete().filter('id', 'not.in', idList);
                        
                        if (deleteError) {
                             console.warn(`[Supabase] Bulk delete failed (${this.table}):`, deleteError.message);
                        }
                    }

                    // 2. Upsert (Insert or Update) the items
                    const sanitizedItems = items.map(i => this.sanitize(i));
                    const { error: upsertError } = await supabase.from(this.table).upsert(sanitizedItems);
                    if (upsertError) console.error(`[Supabase] Sync/Upsert error (${this.table}):`, upsertError.message);
                }
            } catch (err) {
                console.error(`[Supabase] setAll exception`, err);
            }
        }
        
        return this.localFallback.getAll();
    }
}

// --- FACTORY ---
const TABLE_MAPPING: Record<string, string> = {
    'fh_family': 'family',
    'fh_events': 'events',
    'fh_news': 'news',
    'fh_polls': 'polls',
    'fh_shopping': 'shopping',
    'fh_household': 'household_tasks',
    'fh_personal': 'personal_tasks',
    'fh_mealPlan': 'meal_plans',
    'fh_mealRequests': 'meal_requests',
    'fh_recipes': 'recipes',
    'fh_weather_favs': 'weather_favs',
    'fh_feedback': 'feedback',
    'fh_notifications': 'notifications'
};

const createCollection = <T extends { id: string }>(key: string, defaultVal: T[]) => {
    if (supabase) {
        const tableName = TABLE_MAPPING[key];
        if (tableName) {
            return new SupabaseCollection<T>(tableName, key, defaultVal);
        }
    }
    return new LocalStorageCollection<T>(key, defaultVal);
}

// --- EXPORT ---
export const Backend = {
    family: createCollection<FamilyMember>('fh_family', INITIAL_FAMILY),
    events: createCollection<CalendarEvent>('fh_events', INITIAL_EVENTS),
    news: createCollection<NewsItem>('fh_news', INITIAL_NEWS),
    polls: createCollection<Poll>('fh_polls', []),
    shopping: createCollection<ShoppingItem>('fh_shopping', INITIAL_SHOPPING),
    householdTasks: createCollection<Task>('fh_household', INITIAL_TASKS),
    personalTasks: createCollection<Task>('fh_personal', []),
    mealPlan: createCollection<MealPlan>('fh_mealPlan', []),
    mealRequests: createCollection<MealRequest>('fh_mealRequests', []),
    recipes: createCollection<Recipe>('fh_recipes', []),
    weatherFavorites: createCollection<SavedLocation>('fh_weather_favs', []),
    feedback: createCollection<FeedbackItem>('fh_feedback', []),
    notifications: createCollection<AppNotification>('fh_notifications', []),
};