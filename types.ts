
export interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: 'parent' | 'child' | 'admin';
  password?: string;
  darkMode?: boolean;
  mustChangePassword?: boolean;
  fcmToken?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  endDate?: string; // YYYY-MM-DD
  endTime?: string; // HH:MM
  location?: string;
  description?: string;
  assignedTo: string[]; // IDs of family members
  authorId?: string; // New: Track who created the event
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  image?: string; // Base64 or URL
  tag?: string; // e.g. #Urlaub or PRIVATE:userid
  createdAt: string;
  authorId: string;
  readBy?: string[]; // Array of UserIDs who marked this as read
}

// --- POLLS ---
export interface PollOption {
  id: string;
  text: string;
  description?: string;
  votes: string[]; // Array of User IDs who voted for this
}

export interface Poll {
  id: string;
  question: string;
  description?: string;
  options: PollOption[];
  createdAt: string;
  startsAt?: string; // ISO String - Scheduled start (optional)
  expiresAt?: string; // ISO String (optional)
  authorId: string;
  closed?: boolean;
  allowMultipleSelection?: boolean;
}

// --- NOTIFICATIONS ---
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  timestamp: string;
  read: boolean;
  authorId?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  category?: string;
  note?: string;
}

export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  assignedTo?: string; // ID of family member (for household)
  type: 'household' | 'personal';
  priority?: TaskPriority;
  note?: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  image?: string; // Base64 or URL
  description?: string;
}

export interface MealPlan {
  id: string;
  day: string;
  mealName: string; // Used as "Dinner" / Main Dish
  breakfast?: string;
  lunch?: string;
  ingredients: string[];
  recipeHint: string;
  instructions?: string; // New field for detailed cooking instructions
}

export interface MealRequest {
  id: string;
  dishName: string;
  requestedBy: string; // FamilyMember ID
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  text: string;
  rating: number;
  createdAt: string;
  read?: boolean; 
}

export enum AppRoute {
  LANDING = 'install',
  APP = 'app',
  DASHBOARD = 'dashboard',
  CALENDAR = 'calendar',
  NEWS = 'news', // New Route for direct access to Pinnwand
  LISTS = 'lists',
  MEALS = 'meals',
  ACTIVITIES = 'activities',
  SETTINGS = 'settings',
  WEATHER = 'weather'
}

export interface PlaceRecommendation {
  title: string;
  description?: string;
  address?: string;
  rating?: string;
  uri?: string;
  reviewsSummary?: string; // New: Summary of reviews
}

export interface WeatherMetric {
  id: string;
  label: string;
  value: string;
  icon: 'wind' | 'droplets' | 'sun' | 'thermometer' | 'eye' | 'gauge' | 'sunrise' | 'sunset' | 'humidity';
  colorClass?: string;
}

export interface SavedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  userId?: string; // Added to separate favorites
}

export interface HourlyForecast {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
}

export interface WeatherData {
  current: {
    temperature_2m: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    surface_pressure: number;
    visibility: number;
  };
  daily: {
    time: string[];
    uv_index_max: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    weather_code: number[];
    precipitation_probability_max?: number[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  }
}

// --- VOICE ASSISTANT TYPES ---
export type VoiceActionType = 'ADD_SHOPPING' | 'ADD_TASK' | 'ADD_EVENT' | 'ADD_MEAL' | 'UNKNOWN';

export interface VoiceAction {
  type: VoiceActionType;
  data: any; // Flexible payload depending on action
  originalText: string;
}