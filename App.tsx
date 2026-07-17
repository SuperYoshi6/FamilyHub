import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AppRoute, FamilyMember, CalendarEvent, ShoppingItem, MealPlan, Task, MealRequest, SavedLocation, Recipe, NewsItem, TaskPriority, FeedbackItem, Poll, AppNotification, VoiceAction } from './types';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import ListsPage from './pages/ListsPage';
import MealsPage from './pages/MealsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import SettingsPage from './pages/SettingsPage';
import WeatherPage from './pages/WeatherPage';
import LandingPage from './pages/LandingPage';
import Logo from './components/Logo';
import NotificationModal from './components/NotificationModal';
import Onboarding from './components/Onboarding';
import { requestFirebaseToken, onMessageListener } from './services/fcm';
import { Lock, X, Loader2, ArrowRight, UserPlus, Eye, EyeOff, ShieldAlert, AlertTriangle } from 'lucide-react';
import { t, Language } from './services/translations';
import { Backend, processMutationQueue, hasPendingMutations, getPendingMutationCount } from './services/backend';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './services/backend';
import { ensureFamilyHubAndroidNotificationChannel, androidNotificationChannelFields } from './services/notificationsAndroid';
import { updateShoppingWidget, updateCalendarWidget, updateTasksWidget, updateMealPlanWidget, updateMealRequestsWidget } from './services/widgetBridge';
import { scheduleAllReminders, scheduleTaskReminder, cancelTaskReminder, cancelEventReminder } from './services/reminders';
import { startWeatherNotificationLoop, stopWeatherNotificationLoop } from './services/weatherNotificationScheduler';

// Unterdrückt bekannten Chromium SW-Kanal-Fehler (Firebase compat SDK)
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('listener indicated an asynchronous response')) {
    e.preventDefault();
  }
});

// Helper for local settings
const useLocalSetting = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};

// Helper: Convert String ID to Integer ID for LocalNotifications
const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// --- APP VERSION CONFIGURATION ---
const CURRENT_APP_VERSION = "1.0.0";
const APK_DOWNLOAD_LINK: string = "https://hjkmfodzhradtkeiyele.supabase.co/storage/v1/object/public/apps/FamilyHub.apk";
const EXE_DOWNLOAD_LINK: string = "https://superyoshi6.github.io/FamilyHub/install";
const SWIFT_DOWNLOAD_LINK: string = "https://apps.apple.com/de/app/swift-playground/id908519492";
const POLLING_INTERVAL = 30000;
const DEFAULT_APP_SETTINGS = {
  id: 'global',
  maintenance_mode: false,
  maintenance_start: null,
  maintenance_end: null,
  disabled_tabs: {},
  global_liquid_glass_enabled: true,
  global_summer_enabled: true,
  push_test_at: null,
  push_test_title: null,
  push_test_message: null,
};

const formatForDateTimeLocal = (isoString: string | null) => {
  if (!isoString) return '';
  // Strip timezone and any sub-second precision: datetime-local wants "yyyy-MM-ddThh:mm" or "yyyy-MM-ddThh:mm:ss"
  const clean = isoString.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '');
  return clean.slice(0, 16);
};

const App: React.FC = () => {
  // --- 1. Global State Hooks ---
  const [loadingData, setLoadingData] = useState(true);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [householdTasks, setHouseholdTasks] = useState<Task[]>([]);
  const [personalTasks, setPersonalTasks] = useState<Task[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  const [mealRequests, setMealRequests] = useState<MealRequest[]>([]);
  const [weatherFavorites, setWeatherFavorites] = useState<SavedLocation[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);

  // --- Offline State ---
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // --- 2. Settings & Session State ---
  const [darkMode, setDarkMode] = useState(false);
  const [enableSwipe, setEnableSwipe] = useLocalSetting<boolean>('fh_enableswipe', false);
  const [liquidGlass, setLiquidGlass] = useLocalSetting<boolean>('fh_liquidglass', true);
  const [globalLiquidGlassEnabled, setGlobalLiquidGlassEnabled] = useLocalSetting<boolean>('fh_global_liquidglass_enabled', true);
  const [summerMode, setSummerMode] = useLocalSetting<boolean>('fh_summermode', false);
  const [globalSummerEnabled, setGlobalSummerEnabled] = useLocalSetting<boolean>('fh_global_summer_enabled', true);
  const [maintenanceMode, setMaintenanceMode] = useLocalSetting<boolean>('fh_maintenance_mode', false);
  const [maintenanceStart, setMaintenanceStart] = useLocalSetting<string>('fh_maintenance_start', '');
  const [maintenanceEnd, setMaintenanceEnd] = useLocalSetting<string>('fh_maintenance_end', '');
  const [nowTs, setNowTs] = useState(Date.now());
  const [disabledTabs, setDisabledTabs] = useLocalSetting<Record<string, boolean>>('fh_disabled_tabs', {
    [AppRoute.WEATHER]: false,
    [AppRoute.CALENDAR]: false,
    [AppRoute.MEALS]: false,
    [AppRoute.LISTS]: false,
    [AppRoute.ACTIVITIES]: false,
  });
  const language: Language = 'de';
  // --- Pull-to-Refresh State ---
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<FamilyMember | null>(null);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    // 1) Check if we came from 404.html redirect: /FamilyHub/?/app or /FamilyHub/?/install
    const search = window.location.search;
    if (search.startsWith('?/')) {
      const routePath = search.slice(2).split('&')[0].toLowerCase();
      if (routePath === 'install' || routePath.startsWith('install')) return AppRoute.LANDING;
      return AppRoute.APP;
    }

    // 2) Direct path check
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/install')) return AppRoute.LANDING;
    if (path.includes('/app')) return AppRoute.APP;

    // 3) Fallback to saved route
    const savedRoute = localStorage.getItem('fh_last_route');
    const hasBooted = localStorage.getItem('fh_has_booted');
    if (hasBooted && savedRoute && Object.values(AppRoute).includes(savedRoute as AppRoute)) {
      return savedRoute as AppRoute;
    }
    return AppRoute.DASHBOARD;
  });

  // Sync route state to browser URL (so reloads & deep links work on GitHub Pages)
  useEffect(() => {
    const routeSuffix = currentRoute === AppRoute.LANDING ? 'install' : 'app';

    // Determine the base path from the current URL (e.g. /FamilyHub/)
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const basePath = pathParts.length > 0 ? '/' + pathParts[0] + '/' : '/';

    const targetPath = basePath + routeSuffix;
    const currentPath = window.location.pathname.toLowerCase();

    // Clean up 404.html redirect format (/?/app) or fix wrong suffix
    const has404Redirect = window.location.search.startsWith('?/');
    if (has404Redirect || !currentPath.endsWith(routeSuffix)) {
      window.history.replaceState({ route: currentRoute }, '', targetPath);
    }
    localStorage.setItem('fh_last_route', currentRoute);
    localStorage.setItem('fh_has_booted', 'true');
  }, [currentRoute]);

  const [currentWeatherLocation, setCurrentWeatherLocation] = useState<{ lat: number, lng: number, name: string } | null>(null);

  // Login State
  const [loginStep, setLoginStep] = useState<'select' | 'enter-pass' | 'set-pass'>('select');
  const [loginUser, setLoginUser] = useState<FamilyMember | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showSecurityScreen, setShowSecurityScreen] = useState(false);
  const [showPasswordResetScreen, setShowPasswordResetScreen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  // --- 3. Refs ---
  const processedNotificationsRef = useRef<Set<string>>(new Set());
  const lastPollTimeRef = useRef<number>(Date.now());
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const pullStartY = useRef<number | null>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const lastSentPayloadRef = useRef<string>('');
  const maintenanceEndNotifiedRef = useRef(false);

  // --- 4. Helper Logic (Non-Conditional) ---
  const regularFamily = family.filter(f => f.role !== 'admin');
  const myOpenTaskCount = householdTasks.filter(t => t.assignedTo?.includes(currentUser?.id ?? '') && !t.done).length + personalTasks.filter(t => !t.done).length;
  const userWeatherFavorites = (currentUser && weatherFavorites) ? weatherFavorites.filter(f => f.userId === currentUser.id) : [];
  const allowLiquidGlassForUser = currentUser ? (currentUser.role === 'admin' || globalLiquidGlassEnabled) : globalLiquidGlassEnabled;
  const allowSummerForUser = currentUser ? (currentUser.role === 'admin' || globalSummerEnabled) : globalSummerEnabled;

  const effectiveSummerMode = allowSummerForUser ? summerMode : false;

  const effectiveLiquidGlass = allowLiquidGlassForUser ? liquidGlass : false;
  const tabOrder: AppRoute[] = [AppRoute.DASHBOARD, AppRoute.WEATHER, AppRoute.CALENDAR, AppRoute.MEALS, AppRoute.LISTS];
  const isTabClosedForUser = (route: AppRoute) => {
    if (!currentUser || currentUser.role === 'admin') return false;
    return !!disabledTabs[route];
  };
  const formatCountdown = (target: string) => {
    if (!target) return null;
    const ms = new Date(target).getTime() - nowTs;
    if (Number.isNaN(ms) || ms <= 0) return null;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}h ${m}m ${s}s`;
  };
  const maintenanceActive = () => {
    if (!maintenanceMode) return false;

    const now = nowTs;

    // If start time is set, we must be after it
    if (maintenanceStart && maintenanceStart.trim() !== '') {
      const startTs = new Date(maintenanceStart).getTime();
      if (!isNaN(startTs) && now < startTs) return false;
    }

    // If end time is set, we must be before it
    if (maintenanceEnd && maintenanceEnd.trim() !== '') {
      const endTs = new Date(maintenanceEnd).getTime();
      if (!isNaN(endTs) && now > endTs) return false;
    }

    return true;
  };

  const shouldFireNotification = (title: string, message: string) => {
    const key = `${title}:${message}`;
    if (processedNotificationsRef.current.has(key)) return false;
    processedNotificationsRef.current.add(key);
    setTimeout(() => { processedNotificationsRef.current.delete(key); }, 120000);
    return true;
  };

  const addNotification = async (title: string, message: string, route?: AppRoute, entityId?: string) => {
    if (!shouldFireNotification(title, message)) return;
    const notif: AppNotification = { id: Date.now().toString() + Math.random(), title, message, type: 'info', timestamp: new Date().toISOString(), read: false, authorId: currentUser?.id };
    await Backend.notifications.add(notif);
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.schedule({
        notifications: [{
          id: hashCode(title + message),
          title,
          body: message,
          smallIcon: 'notification_icon',
          schedule: { at: new Date(Date.now() + 100) },
          sound: 'default',
          ...androidNotificationChannelFields(),
          ...(route ? { data: { route, entityId } } : {}),
        }],
      });
    }
  };

  const requestAppPermissions = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const geoPerm = await Geolocation.checkPermissions();
        if (geoPerm.location !== 'granted') await Geolocation.requestPermissions();

        // Notification Permission (Android 13+) — vor dem Channel-Erstellen
        try {
          const notifPerm = await LocalNotifications.checkPermissions();
          if (notifPerm.display === 'prompt') {
            await LocalNotifications.requestPermissions();
          }
        } catch (e) { }

        // Request Calendar Permissions
        try {
          const { NativeCalendarService } = await import('./services/nativeCalendar');
          await NativeCalendarService.requestPermissions();
        } catch (e) { }
      } catch (e) { }
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { resolveLocationName } = await import('./services/weather');
        const name = await resolveLocationName(pos.coords.latitude, pos.coords.longitude);
        setCurrentWeatherLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, name });
      }, null, { enableHighAccuracy: false, timeout: 5000 });
    }
  };

  // --- 5. Effect Hooks (Unconditional) ---

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => { });
      StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => { });
      LocalNotifications.requestPermissions().catch(() => { });
      void ensureFamilyHubAndroidNotificationChannel();
    }
  }, []);

  useEffect(() => {
    if (currentRoute !== AppRoute.LANDING) localStorage.setItem('fh_has_booted', 'true');
    if (currentRoute !== AppRoute.SETTINGS && currentRoute !== AppRoute.LANDING) localStorage.setItem('fh_last_route', currentRoute);
  }, [currentRoute]);

  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (currentRoute === AppRoute.LANDING) {
      if (!path.includes('/install')) {
        window.history.replaceState(null, '', '/install');
      }
      return;
    }
    if (!path.includes('/app')) {
      window.history.replaceState(null, '', '/app');
    }
  }, [currentRoute]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Mode data attributes for CSS theming
  // Ensure attributes are set correctly on mount AND whenever modes change
  useEffect(() => {
    const el = document.documentElement;
    el.removeAttribute('data-summer');
    if (effectiveSummerMode) el.setAttribute('data-summer', '');
  }, [effectiveSummerMode]);

  useEffect(() => {
    if (!loadingData && family.length > 0 && !currentUser) {
      const storedUserId = localStorage.getItem('fh_session_user');
      const foundUser = family.find(f => f.id === storedUserId);
      if (foundUser) {
        setCurrentUser(foundUser);
        setDarkMode(foundUser.darkMode || false);
      }
    }
  }, [loadingData, family, currentUser]);

  // FCM-Push-Token Registrierung (nur einmal pro User-Session)
  const pushRegisteredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!currentUser || !Capacitor.isNativePlatform()) return;
    if (currentUser.role === 'admin') return;
    if (pushRegisteredFor.current === currentUser.id) return;
    pushRegisteredFor.current = currentUser.id;

    const registerPush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') {
          console.warn('[Push] Permission not granted');
          return;
        }
        await PushNotifications.register();
      } catch (e) {
        console.warn('[Push] Registration init failed:', e);
      }
    };
    registerPush();

    const regListener = PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] FCM token erhalten:', token.value?.substring(0, 20) + '...');
      if (!token.value || !currentUser || !supabase) return;
      try {
        // Alte Tokens dieses Users löschen, dann neuen speichern
        await supabase.from('fcm_tokens').delete().eq('user_id', currentUser.id);
        const { error } = await supabase.from('fcm_tokens').insert(
          { token: token.value, user_id: currentUser.id }
        );
        if (error) console.warn('[Push] Token speichern fehlgeschlagen:', error);
      } catch (e) {
        console.warn('[Push] Token save error:', e);
      }
    });

    const errorListener = PushNotifications.addListener('registrationError', (err) => {
      console.warn('[Push] FCM registration error:', err.error);
    });

    return () => {
      regListener.then(l => l.remove());
      errorListener.then(l => l.remove());
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentWeatherLocation) return;
    if (typeof currentUser.weatherLat !== 'number' || typeof currentUser.weatherLng !== 'number') return;
    setCurrentWeatherLocation({
      lat: currentUser.weatherLat,
      lng: currentUser.weatherLng,
      name: currentUser.weatherLocationName || 'Standort',
    });
  }, [currentUser, currentWeatherLocation]);

  // Stündliche Wetterbenachrichtigung (nur nativer Build)
  const weatherLoopCleanup = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (weatherLoopCleanup.current) { weatherLoopCleanup.current(); weatherLoopCleanup.current = null; }
    stopWeatherNotificationLoop();
    if (!currentWeatherLocation) return;
    weatherLoopCleanup.current = startWeatherNotificationLoop(
      currentWeatherLocation.lat, currentWeatherLocation.lng, currentWeatherLocation.name
    );
    return () => { if (weatherLoopCleanup.current) weatherLoopCleanup.current(); };
  }, [currentWeatherLocation]);

  // --- CENTRAL DATA LOADER (reusable for initial load + resume) ---
  const loadAllData = useCallback(async () => {
    try {
      const [fam, ev, newsData, shop, house, pers, meals, reqs, weath, rec, fbs, pollsData, appSettings] = await Promise.all([
        Backend.family.getAll(), Backend.events.getAll(), Backend.news.getAll(), Backend.shopping.getAll(),
        Backend.householdTasks.getAll(), Backend.personalTasks.getAll(), Backend.mealPlan.getAll(),
        Backend.mealRequests.getAll(), Backend.weatherFavorites.getAll(), Backend.recipes.getAll(),
        Backend.feedback.getAll(), Backend.polls.getAll(), Backend.appSettings.getAll()
      ]);
      setFamily(fam); setEvents(ev); setNews(newsData); setShoppingList(shop);
      const today = new Date();
      const diffToMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
      const currentMonday = new Date(today);
      currentMonday.setDate(today.getDate() - diffToMonday);
      const currentMondayStr = currentMonday.toISOString().split('T')[0];

      let currentMealPlan = meals;
      const storedMondayStr = localStorage.getItem('fh_meal_plan_week');
      if (storedMondayStr !== currentMondayStr) {
          currentMealPlan = [];
          await Backend.mealPlan.setAll([]);
          localStorage.setItem('fh_meal_plan_week', currentMondayStr);
      }

      setHouseholdTasks(house); setPersonalTasks(pers); setMealPlan(currentMealPlan);
      setMealRequests(reqs); setWeatherFavorites(weath); setRecipes(rec);
      setFeedbacks(fbs); setPolls(pollsData);
      const settingsRow = appSettings && appSettings.length > 0 ? appSettings[0] : null;
      if (settingsRow) {
        setMaintenanceMode(!!settingsRow.maintenance_mode);
        setMaintenanceStart(settingsRow.maintenance_start || '');
        setMaintenanceEnd(settingsRow.maintenance_end || '');
        setDisabledTabs(settingsRow.disabled_tabs || {});
        if (typeof settingsRow.global_liquid_glass_enabled === 'boolean') setGlobalLiquidGlassEnabled(settingsRow.global_liquid_glass_enabled);
        if (typeof settingsRow.global_summer_enabled === 'boolean') setGlobalSummerEnabled(settingsRow.global_summer_enabled);
      } else {
        await Backend.appSettings.add(DEFAULT_APP_SETTINGS as any);
      }

      // --- AUTOMATIC CALENDAR SYNC (bei jedem Daten-Load) ---
      if (Capacitor.isNativePlatform() && ev.length > 0) {
        try {
          const { NativeCalendarService } = await import('./services/nativeCalendar');
          await NativeCalendarService.syncAllToNative(ev, family);
        } catch (e) {
          console.error('Auto Calendar Sync fail:', e);
        }
      }

      // --- WIDGET UPDATES ---
      if (Capacitor.isNativePlatform()) {
        const shoppingNames = shop.map((s: ShoppingItem) => s.name);
        const uncheckedCount = shop.filter((s: ShoppingItem) => !s.checked).length;
        updateShoppingWidget(shoppingNames, uncheckedCount);

        const todayEvents = ev
          .filter((e: CalendarEvent) => e.date === new Date().toISOString().split('T')[0])
          .map((e: CalendarEvent) => `${e.time?.slice(0, 5) || ''} ${e.title}`);
        updateCalendarWidget(todayEvents);

        const openTasks = [...house.filter((t: Task) => !t.done), ...pers.filter((t: Task) => !t.done)]
          .map((t: Task) => t.title);
        updateTasksWidget(openTasks);

        const todayName = new Date().toLocaleDateString('de-DE', { weekday: 'long' });
        const todayMeals = currentMealPlan
          .filter((m: MealPlan) => m.day === todayName)
          .flatMap((m: MealPlan) => {
            const parts: string[] = [];
            if (m.breakfast) parts.push(m.breakfast);
            if (m.lunch) parts.push(m.lunch);
            if (m.mealName) parts.push(m.mealName);
            return parts;
          });
        updateMealPlanWidget(todayMeals);

        const requestNames = (reqs || []).map((r: MealRequest) => {
          const author = fam.find((f: FamilyMember) => f.id === r.requestedBy)?.name || '';
          const lines: string[] = [];
          lines.push(`${r.dishName}`);
          if (r.note) lines.push(`${r.note}`);
          if (author) lines.push(`von ${author}`);
          return lines.join('\n');
        });
        updateMealRequestsWidget(requestNames);
      }

      // --- SCHEDULE REMINDERS ---
      if (Capacitor.isNativePlatform()) {
        scheduleAllReminders([...house, ...pers], ev);
      }
      

    } finally { setLoadingData(false); }
  }, []);

  // Initial data load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Widgets bei jeder Änderung der relevanten Daten live aktualisieren
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const shoppingNames = shoppingList.map(s => s.name);
    const uncheckedCount = shoppingList.filter(s => !s.checked).length;
    updateShoppingWidget(shoppingNames, uncheckedCount);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEvents = events
      .filter(e => e.date === todayStr)
      .map(e => `${e.time?.slice(0,5) || ''} ${e.title}`);
    updateCalendarWidget(todayEvents);
    const openTasks = [...householdTasks.filter(t => !t.done), ...personalTasks.filter(t => !t.done)]
      .map(t => t.title);
    updateTasksWidget(openTasks);
    const todayName = new Date().toLocaleDateString('de-DE', { weekday: 'long' });
    const todayMeals = mealPlan
      .filter(m => m.day === todayName)
      .flatMap(m => [m.breakfast, m.lunch, m.mealName].filter(Boolean)) as string[];
    updateMealPlanWidget(todayMeals);
    const requestNames = mealRequests.map(r => {
      const author = family.find((f: FamilyMember) => f.id === r.requestedBy)?.name || '';
      const lines: string[] = [];
      lines.push(`${r.dishName}`);
      if (r.note) lines.push(`${r.note}`);
      if (author) lines.push(`von ${author}`);
      return lines.join('\n');
    });
    updateMealRequestsWidget(requestNames);
  }, [shoppingList, events, householdTasks, personalTasks, mealPlan, mealRequests, family]);

  // Notification-Tap → zur richtigen Seite navigieren
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const tapListener = LocalNotifications.addListener('tap', (notification) => {
      const data = notification?.data as Record<string, string> | undefined;
      if (!data?.route) return;
      const route = data.route as AppRoute;
      if (Object.values(AppRoute).includes(route)) setCurrentRoute(route);
    });
    const pushTapListener = PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const data = event?.notification?.data as Record<string, string> | undefined;
      if (!data?.route) return;
      const route = data.route as AppRoute;
      if (Object.values(AppRoute).includes(route)) setCurrentRoute(route);
    });
    return () => {
      tapListener.then(l => l.remove());
      pushTapListener.then(l => l.remove());
    };
  }, []);

  // Reload data when app returns from background (mobile) or window gets focus (web)
  useEffect(() => {
    // Native: listen for appStateChange (background -> foreground)
    let nativeUnsubscribe: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          console.log('📱 App returned to foreground, reloading data from Supabase...');
          loadAllData();
        }
      }).then(listener => { nativeUnsubscribe = listener.remove.bind(listener); });
    }

    // Web: listen for window focus to catch up on data changes
    const onFocus = () => {
      if (!Capacitor.isNativePlatform()) {
        console.log('🌐 Window focused, reloading data from Supabase...');
        loadAllData();
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      nativeUnsubscribe?.();
      window.removeEventListener('focus', onFocus);
    };
  }, [loadAllData]);

  // Online/Offline detection + sync
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      const count = getPendingMutationCount();
      if (count > 0) {
        console.log(`🌐 Online — syncing ${count} pending mutation(s)...`);
        const synced = await processMutationQueue();
        if (synced > 0) {
          loadAllData();
        }
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      console.log('📡 Offline — changes will be queued and synced later.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic sync every 2 minutes (processes queued mutations)
    const syncInterval = setInterval(async () => {
      if (!isOffline && getPendingMutationCount() > 0) {
        const synced = await processMutationQueue();
        if (synced > 0) loadAllData();
      }
    }, 120000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [loadAllData, isOffline]);

  // Supabase Realtime subscription for live sync (news, events, shopping, tasks)
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('fh-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'news' },
        () => { loadAllData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        async (payload: any) => {
          await loadAllData();
          // Native calendar sync für Änderungen von anderen Familienmitgliedern
          // Nutzt payload.new direkt (snake_case → camelCase), da events-State im Closure stale sein kann
          if (Capacitor.isNativePlatform() && family.length > 0) {
            try {
              const { NativeCalendarService } = await import('./services/nativeCalendar');
              const eventType = payload.eventType as string;
              if (eventType === 'DELETE' && payload.old?.id) {
                await NativeCalendarService.deleteEventFromNative(payload.old.id);
              } else if (eventType === 'INSERT' && payload.new) {
                const ev: CalendarEvent = {
                  id: payload.new.id,
                  title: payload.new.title || '',
                  date: payload.new.date || '',
                  time: payload.new.time || undefined,
                  endDate: payload.new.end_date || undefined,
                  endTime: payload.new.end_time || undefined,
                  location: payload.new.location || undefined,
                  description: payload.new.description || undefined,
                  assignedTo: payload.new.assigned_to || [],
                  authorId: payload.new.author_id || undefined,
                };
                await NativeCalendarService.syncEventToNative(ev, family);
              } else if (eventType === 'UPDATE' && payload.new) {
                const ev: CalendarEvent = {
                  id: payload.new.id,
                  title: payload.new.title || '',
                  date: payload.new.date || '',
                  time: payload.new.time || undefined,
                  endDate: payload.new.end_date || undefined,
                  endTime: payload.new.end_time || undefined,
                  location: payload.new.location || undefined,
                  description: payload.new.description || undefined,
                  assignedTo: payload.new.assigned_to || [],
                  authorId: payload.new.author_id || undefined,
                };
                await NativeCalendarService.updateEventInNative(ev, family);
              }
            } catch (e) {
              console.warn('[Realtime] Native calendar sync failed:', e);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping' },
        () => { loadAllData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'household_tasks' },
        () => { loadAllData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'family' },
        () => { loadAllData(); }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🔔 Supabase Realtime connected for live sync');
        }
      });

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [loadAllData]);

  useEffect(() => {
    if (!currentUser) return;
    requestAppPermissions();
    let cancelled = false;
    let unsubscribeFCM: (() => void) | undefined;
    const setupFCM = async () => {
      // Notification-Permission vor Channel-Erstellung (Android 13+)
      try {
        const notifPerm = await LocalNotifications.checkPermissions();
        if (notifPerm.display === 'prompt') {
          await LocalNotifications.requestPermissions();
        }
      } catch (e) { }
      await ensureFamilyHubAndroidNotificationChannel();
      // Admin bekommt keine Push-Benachrichtigungen
      if (currentUser.role === 'admin') {
        console.log('[FCM] Admin user — skipping push registration');
        return;
      }
      const token = await requestFirebaseToken(currentUser.id);
      if (token && !cancelled) {
        unsubscribeFCM = onMessageListener((payload: any) => {
          if (payload.notification) {
            const title = payload.notification.title || 'Mitteilung';
            const message = payload.notification.body || '';
            if (!shouldFireNotification(title, message)) return;
            // Auf Web (PWA) selbst anzeigen, da dort kein System-Notification kommt
            if (!Capacitor.isNativePlatform()) {
              LocalNotifications.schedule({
                notifications: [{
                  id: hashCode(title + message),
                  title,
                  body: message,
                  smallIcon: 'notification_icon',
                  schedule: { at: new Date(Date.now() + 100) },
                  sound: 'default',
                  ...androidNotificationChannelFields(),
                }],
              });
            }
          }
        });
      }
    };
    setupFCM();
    return () => {
      cancelled = true;
      if (unsubscribeFCM) unsubscribeFCM();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !currentWeatherLocation) return;
    const weatherProfile = {
      weatherLat: currentWeatherLocation.lat,
      weatherLng: currentWeatherLocation.lng,
      weatherLocationName: currentWeatherLocation.name,
    };

    setFamily(prev => prev.map(member => member.id === currentUser.id ? { ...member, ...weatherProfile } : member));
    Backend.family.update(currentUser.id, weatherProfile).catch((err) => {
      console.warn('[Weather] Standort konnte nicht gespeichert werden:', err);
    });
  }, [currentUser, currentWeatherLocation]);

  useEffect(() => {
    if (currentUser?.mustShowSecurityScreen) {
      setShowSecurityScreen(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.mustChangePassword) {
      setShowPasswordResetScreen(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!maintenanceMode) return;
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [maintenanceMode]);

  useEffect(() => {
    if (!maintenanceMode || !maintenanceEnd) return;
    const endMs = new Date(maintenanceEnd).getTime();
    if (!Number.isNaN(endMs) && nowTs > endMs) {
      setMaintenanceMode(false);
      if (!maintenanceEndNotifiedRef.current) {
        maintenanceEndNotifiedRef.current = true;
        addNotification('✅ Wartung beendet', 'Die geplante Wartung ist abgeschlossen. FamilyHub ist wieder voll verfügbar.', AppRoute.DASHBOARD);
      }
    }
  }, [maintenanceMode, maintenanceEnd, nowTs]);


  useEffect(() => {
    if (loadingData) return;

    if (currentUser?.role !== 'admin') {
      return;
    }

    const payload = {
      id: 'global',
      maintenance_mode: maintenanceMode,
      maintenance_start: maintenanceStart ? new Date(maintenanceStart).toISOString() : null,
      maintenance_end: maintenanceEnd ? new Date(maintenanceEnd).toISOString() : null,
      disabled_tabs: disabledTabs || {},
      global_liquid_glass_enabled: globalLiquidGlassEnabled,
      global_summer_enabled: globalSummerEnabled,
    };

    const payloadStr = JSON.stringify(payload);
    if (payloadStr === lastSentPayloadRef.current) return;
    lastSentPayloadRef.current = payloadStr;

    // Use a small timeout to debounce and ensure we don't fire too many requests
    const timeout = setTimeout(() => {
      Backend.appSettings.update('global', payload as any);
    }, 500);

    return () => clearTimeout(timeout);
  }, [loadingData, currentUser, maintenanceMode, maintenanceStart, maintenanceEnd, disabledTabs, globalLiquidGlassEnabled, globalSummerEnabled]);

  const applyAppSettings = (settingsRow: any) => {
    if (!settingsRow) return;
    setMaintenanceMode(!!settingsRow.maintenance_mode);
    setMaintenanceStart(formatForDateTimeLocal(settingsRow.maintenance_start));
    setMaintenanceEnd(formatForDateTimeLocal(settingsRow.maintenance_end));
    setDisabledTabs(prev => {
      const next = settingsRow.disabled_tabs || {};
      if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
      return next;
    });
    if (typeof settingsRow.global_liquid_glass_enabled === 'boolean') setGlobalLiquidGlassEnabled(settingsRow.global_liquid_glass_enabled);
    if (typeof settingsRow.global_summer_enabled === 'boolean') setGlobalSummerEnabled(settingsRow.global_summer_enabled);
  };

  useEffect(() => {
    if (loadingData) return;

    const fetchAndApply = async () => {
      const all = await Backend.appSettings.getAll();
      if (all && all.length > 0) applyAppSettings(all[0]);
    };

    const interval = setInterval(fetchAndApply, POLLING_INTERVAL);

    let realtimeChannel: any = null;
    if (supabase) {
      realtimeChannel = supabase
        .channel('app_settings_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload: any) => {
          const row = (payload.new && payload.new.id) ? payload.new : ((payload.old && payload.old.id) ? payload.old : null);
          if (row) applyAppSettings(row);
        })
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (realtimeChannel) supabase?.removeChannel(realtimeChannel);
    };
  }, [loadingData]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', () => {
        if (currentRoute !== AppRoute.DASHBOARD && currentUser) setCurrentRoute(AppRoute.DASHBOARD);
        else if (!currentUser && (loginStep === 'enter-pass' || loginStep === 'set-pass')) { setLoginStep('select'); setLoginUser(null); }
        else CapacitorApp.exitApp();
      });
    }
  }, [currentRoute, currentUser, loginStep]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: (currentRoute === AppRoute.WEATHER || darkMode) ? Style.Dark : Style.Light }).catch(() => { });
    }
  }, [currentRoute, darkMode]);

  const updateMealPlan = async (newPlan: MealPlan[]) => { setMealPlan(newPlan); await Backend.mealPlan.setAll(newPlan); await addNotification('🍽️ Speiseplan', 'Speiseplan wurde aktualisiert', AppRoute.MEALS); };
  const addMealRequest = async (dishName: string, note?: string) => {
    if (!currentUser) return;
    const request: MealRequest = {
      id: Date.now().toString(),
      dishName,
      note,
      requestedBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    setMealRequests(p => [...p, request]);
    await Backend.mealRequests.add(request);
    await addNotification('🍽️ Essenswunsch', `${dishName} wurde gewünscht`, AppRoute.MEALS);
  };
  const deleteMealRequest = async (id: string) => {
    const req = mealRequests.find(x => x.id === id);
    setMealRequests(p => p.filter(x => x.id !== id));
    await Backend.mealRequests.delete(id);
    if (req?.dishName) await addNotification('🍽️ Essenswunsch entfernt', `${req.dishName} wurde entfernt`, AppRoute.MEALS);
  };
  const addMealToPlan = async (day: string, mealName: string, ingredients: string[], slot: 'breakfast' | 'lunch' | 'main' = 'main') => {
    const existing = mealPlan.find(x => x.day === day);
    const updatedDay: MealPlan = existing
      ? {
        ...existing,
        [slot === 'main' ? 'mealName' : slot]: mealName,
        ingredients: [...new Set([...(existing.ingredients || []), ...ingredients])]
      }
      : {
        id: Math.random().toString(),
        day,
        mealName: slot === 'main' ? mealName : '',
        breakfast: slot === 'breakfast' ? mealName : '',
        lunch: slot === 'lunch' ? mealName : '',
        ingredients,
        recipeHint: ''
      };
    const nextPlan = [...mealPlan.filter(x => x.day !== day), updatedDay];
    setMealPlan(nextPlan);
    await Backend.mealPlan.setAll(nextPlan);
    await addNotification('Essen', `${mealName} zum Plan hinzugefügt`, AppRoute.MEALS);
  };
  const addIngredientsToShopping = async (ings: string[]) => {
    const items = ings.map(n => ({ id: Math.random().toString(), name: n, checked: false }));
    setShoppingList(p => [...p, ...items]);
    await Promise.all(items.map(item => Backend.shopping.add(item)));
    await addNotification('Einkauf', 'Zutaten hinzugefügt', AppRoute.LISTS);
  };
  const addRecipe = async (r: Recipe) => { setRecipes(p => [...p, r]); await Backend.recipes.add(r); };
  const handlePlanGenerated = async (newPlan: MealPlan[]) => { setMealPlan(newPlan); await Backend.mealPlan.setAll(newPlan); await addNotification('🤖 Speiseplan', 'Neuer KI-Speiseplan wurde erstellt', AppRoute.MEALS); };
  const updateFamilyMember = async (id: string, u: Partial<FamilyMember>) => { setFamily(p => p.map(m => m.id === id ? { ...m, ...u } : m)); await Backend.family.update(id, u); };
  const addFeedback = async (f: FeedbackItem) => { setFeedbacks(p => [...p, f]); await Backend.feedback.add(f); };
  const markFeedbacksRead = async (ids: string[]) => { setFeedbacks(p => p.map(f => ids.includes(f.id) ? { ...f, read: true } : f)); for (const id of ids) await Backend.feedback.update(id, { read: true }); };
  const addNews = async (n: NewsItem) => { setNews(p => [n, ...p]); await Backend.news.add(n); };
  const addFamilyMember = async (name: string, role: 'parent' | 'child', mustChangePassword?: boolean, password?: string): Promise<FamilyMember | null> => {
    const colorOptions = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-green-100 text-green-700', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700', 'bg-indigo-100 text-indigo-700'];
    const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name,
      avatar,
      color,
      role,
      password: password || undefined,
      mustChangePassword: mustChangePassword || false,
    };
    setFamily(p => [...p, newMember]);
    await Backend.family.add(newMember);
    return newMember;
  };
  const deleteUser = async (id: string) => { setFamily(p => p.filter(x => x.id !== id)); await Backend.family.delete(id); };
  const deleteNews = async (id: string) => { setNews(p => p.filter(x => x.id !== id)); await Backend.news.delete(id); };
  const resetMemberPassword = async (member: FamilyMember) => {
    await Backend.family.update(member.id, { mustChangePassword: true });
    setFamily(p => p.map(m => m.id === member.id ? { ...m, mustChangePassword: true } : m));
    if (currentUser?.role === 'admin') {
      const logItem: NewsItem = {
        id: Date.now().toString(),
        title: 'Passwort-Reset aktiviert',
        description: `Reset für ${member.name} wurde aktiviert.`,
        tag: `PRIVATE:${currentUser.id}`,
        createdAt: new Date().toISOString(),
        authorId: currentUser.id,
        readBy: [],
      };
      setNews(p => [logItem, ...p]);
      await Backend.news.add(logItem);
    }
  };
  const markNewsRead = async (id: string) => { const n = news.find(x => x.id === id); if (n && currentUser) { const readers = [...(n.readBy || []), currentUser.id]; setNews(p => p.map(x => x.id === id ? { ...x, readBy: readers } : x)); await Backend.news.update(id, { readBy: readers }); } };
  const sendAdminBroadcast = async (title: string, msg: string) => {
    await addNotification(title, msg);
    // Trigger push notification via edge function
    try {
      console.log('📡 Sending admin broadcast to edge function...');
      const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqa21mb2R6aHJhZHRrZWl5ZWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0ODIwNjEsImV4cCI6MjA2ODA1ODA2MX0.2cfezsLcT6x3KI9VqzrHntP80O-cy0JQUb7UK3Mnai8';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      };
      const body = JSON.stringify({
        trigger: 'manual_broadcast',
        title,
        body: msg,
        exclude_user_id: currentUser?.id,
      });
      console.log('📡 Broadcast payload:', body);
      const resp = await fetch('https://hjkmfodzhradtkeiyele.supabase.co/functions/v1/push-notify', {
        method: 'POST',
        headers,
        body,
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error('❌ Push-notify edge function failed:', resp.status, errText);
      } else {
        const result = await resp.json();
        console.log('✅ Broadcast push sent to', result.sent_to, 'devices:', JSON.stringify(result.results)?.substring(0, 200));
      }
    } catch (err) {
      console.error('❌ Broadcast push failed:', err);
    }
  };
  const triggerPushTest = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    // 1. Save to app_settings (for webhook-based push)
    const testPayload = {
      push_test_at: new Date().toISOString(),
      push_test_title: '🔔 Push-Test',
      push_test_message: 'FamilyHub hat gerade eine Test-Benachrichtigung gesendet.',
    };
    await Backend.appSettings.update('global', testPayload as any);
  };
  const triggerSecurityScreen = async (id: string) => {
    await Backend.family.update(id, { mustShowSecurityScreen: true });
    setFamily(p => p.map(m => m.id === id ? { ...m, mustShowSecurityScreen: true } : m));
  };
  const acknowledgeSecurityScreen = async () => {
    if (!currentUser) return;
    await Backend.family.update(currentUser.id, { mustShowSecurityScreen: false });
    setFamily(p => p.map(m => m.id === currentUser.id ? { ...m, mustShowSecurityScreen: false } : m));
    setCurrentUser(prev => prev ? { ...prev, mustShowSecurityScreen: false } : prev);
    setShowSecurityScreen(false);
  };
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const nextPass = resetPasswordInput.trim();
    if (nextPass.length < 4) {
      setResetPasswordError('Passwort muss mindestens 4 Zeichen lang sein');
      return;
    }
    if (nextPass !== resetPasswordConfirm.trim()) {
      setResetPasswordError('Passwörter stimmen nicht überein');
      return;
    }
    await Backend.family.update(currentUser.id, { password: nextPass, mustChangePassword: false, mustShowSecurityScreen: false });
    setFamily(p => p.map(m => m.id === currentUser.id ? { ...m, password: nextPass, mustChangePassword: false, mustShowSecurityScreen: false } : m));
    setCurrentUser(prev => prev ? { ...prev, password: nextPass, mustChangePassword: false, mustShowSecurityScreen: false } : prev);
    setResetPasswordInput('');
    setResetPasswordConfirm('');
    setResetPasswordError('');
    setShowPasswordResetScreen(false);
  };

  const handleLogoClick = () => { if (logoClickCount + 1 >= 5) { setShowAdminLogin(true); setLogoClickCount(0); } else setLogoClickCount(p => p + 1); };
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser || !passwordInput.trim()) return;

    if (maintenanceActive() && loginUser.role !== 'admin') {
      setLoginError(t('maintenance.active_error', language));
      return;
    }

    if (passwordInput === loginUser.password) {
      setCurrentUser(loginUser);
      localStorage.setItem('fh_session_user', loginUser.id);
      setLoginError('');
      if (loginUser.mustChangePassword) {
        setShowPasswordResetScreen(true);
      } else {
        setShowOnboarding(localStorage.getItem('fh_onboarding_done') !== 'true');
      }
    } else {
      setLoginError(t('login.wrong_pass', language));
    }
  };
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === 'admin006') {
      const admin = family.find(f => f.role === 'admin') || { id: 'admin_user', name: 'Administrator', role: 'admin', avatar: 'https://ui-avatars.com/api/?name=Admin&background=ef4444&color=fff&bold=true', color: '#ef4444', password: 'admin006' } as FamilyMember;

      if (!family.find(f => f.id === admin.id)) {
        await Backend.family.add(admin);
        setFamily(prev => [...prev, admin]);
      }

      setCurrentUser(admin);
      localStorage.setItem('fh_session_user', admin.id);
      setShowOnboarding(localStorage.getItem('fh_onboarding_done') !== 'true');
      setShowAdminLogin(false);
    } else setLoginError("Zugriff verweigert.");
  };
  const handleUserSelect = (member: FamilyMember) => {
    setLoginUser(member);
    setPasswordInput('');
    setLoginError('');
    setLoginStep('enter-pass');
  };

  // --- CALENDAR HANDLERS ---
  const handleAddEvent = async (e: any) => {
    const ev = { ...e, authorId: currentUser?.id || 'unknown' };
    setEvents(p => [...p, ev]);
    await Backend.events.add(ev);
    try {
      const { NativeCalendarService } = await import('./services/nativeCalendar');
      await NativeCalendarService.syncEventToNative(ev, family);
    } catch (err) {
      console.warn('Native Sync failed:', err);
    }
  };

  const handleUpdateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    setEvents(p => p.map(x => x.id === id ? { ...x, ...updates } : x));
    await Backend.events.update(id, updates);
    try {
      const current = events.find(ev => ev.id === id);
      if (current) {
        const { NativeCalendarService } = await import('./services/nativeCalendar');
        await NativeCalendarService.updateEventInNative({ ...current, ...updates }, family);
      }
    } catch (err) {
      console.warn('Native Update failed:', err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setEvents(p => p.filter(x => x.id !== id));
    await Backend.events.delete(id);
    cancelEventReminder(id);
    try {
      const { NativeCalendarService } = await import('./services/nativeCalendar');
      await NativeCalendarService.deleteEventFromNative(id);
    } catch (err) {
      console.warn('Native Delete failed:', err);
    }
  };
  const handleLogout = () => { localStorage.removeItem('fh_session_user'); setCurrentUser(null); setCurrentRoute(AppRoute.DASHBOARD); setLoginStep('select'); setLoginUser(null); };

  const getNextSwipeRoute = (direction: 1 | -1) => {
    const currentIndex = tabOrder.indexOf(currentRoute);
    if (currentIndex === -1) return currentRoute;
    for (let i = 1; i <= tabOrder.length; i++) {
      const idx = (currentIndex + direction * i + tabOrder.length) % tabOrder.length;
      const candidate = tabOrder[idx];
      if (!isTabClosedForUser(candidate)) return candidate;
    }
    return currentRoute;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableSwipe) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, button, [data-no-swipe]')) return;
    const t = e.touches[0];
    swipeStartX.current = t.clientX;
    swipeStartY.current = t.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!enableSwipe) return;
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeStartX.current;
    const dy = t.clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    // Swipe left → vorheriger Tab (links), Swipe right → nächster Tab (rechts)
    const nextRoute = dx < 0 ? getNextSwipeRoute(-1) : getNextSwipeRoute(1);
    if (nextRoute !== currentRoute) setCurrentRoute(nextRoute);
  };

  // --- Pull-to-Refresh ---
  const PULL_THRESHOLD = 80;

  const handleMainTouchStart = (e: React.TouchEvent) => {
    const main = mainScrollRef.current;
    if (!main || main.scrollTop > 0) return;
    pullStartY.current = e.touches[0].clientY;
  };

  const handleMainTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current === null) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy <= 0) { pullStartY.current = null; setPullY(0); return; }
    const resistance = 0.4;
    setPullY(Math.min(dy * resistance, PULL_THRESHOLD + 40));
  };

  const handleMainTouchEnd = async () => {
    if (pullStartY.current === null) return;
    pullStartY.current = null;
    if (pullY >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullY(PULL_THRESHOLD);
      console.log('🔄 Pull-to-refresh: reloading data...');
      await loadAllData();
      await new Promise(r => setTimeout(r, 400));
      setIsRefreshing(false);
      setPullY(0);
    } else {
      setPullY(0);
    }
  };

  const toggleWeatherFavorite = async (loc: SavedLocation) => {
    if (!currentUser) return;
    const exists = weatherFavorites.find(f => f.name === loc.name && f.userId === currentUser.id);
    if (exists) { setWeatherFavorites(p => p.filter(f => f.id !== exists.id)); await Backend.weatherFavorites.delete(exists.id); }
    else { const n = { ...loc, id: Date.now().toString(), userId: currentUser.id }; setWeatherFavorites(p => [...p, n]); await Backend.weatherFavorites.add(n); }
  };



  // --- 7. Page Rendering Helper ---
  const renderContent = () => {
    if (loadingData) return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
        <Logo size={80} className="animate-pulse mb-4" />
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="mt-4 text-gray-500 font-medium">Lade Familiendaten...</p>
      </div>
    );

    if (currentRoute === AppRoute.LANDING) return <LandingPage onNavigate={setCurrentRoute} lang={language} />;

    if (maintenanceActive() && currentUser?.role !== 'admin' && !showAdminLogin) {
      const countdown = formatCountdown(maintenanceEnd);

      const getUpdateInfo = () => {
        const ua = navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (ua.includes('android')) return { link: APK_DOWNLOAD_LINK, label: 'Android Update (.apk)' };
        if (ua.includes('win')) return { link: EXE_DOWNLOAD_LINK, label: 'Windows Desktop App' };
        if (isIOS) return { link: SWIFT_DOWNLOAD_LINK, label: 'Apple Swift Playgrounds' };
        return { link: APK_DOWNLOAD_LINK, label: t('maintenance.download_update', language) };
      };
      const updateInfo = getUpdateInfo();

      return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center relative">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-[30px] shadow-xl mb-6 active:scale-95 transition-transform cursor-pointer" onClick={handleLogoClick}><Logo size={80} /></div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            {t('maintenance.title', language)}
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">{t('maintenance.headline', language)}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-2">{t('maintenance.description', language)}</p>
          {countdown && (
            <div className="text-xs font-bold text-yellow-700 dark:text-yellow-300 mb-4">Endet in {countdown}</div>
          )}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <a
              href={updateInfo.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition text-center no-underline"
            >
              {updateInfo.label}
            </a>
            {currentUser && (
              <button onClick={handleLogout} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold px-6 py-3 rounded-2xl shadow-sm transition">
                {t('settings.logout', language)}
              </button>
            )}
          </div>
          {showAdminLogin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/95 backdrop-blur-[4px]">
              <div className="bg-red-900 w-full max-w-sm rounded-3xl p-8 relative border border-red-400 shadow-2xl">
                <div className="text-center mb-4">
                  <ShieldAlert size={36} className="text-yellow-300 mx-auto" />
                  <h2 className="text-lg font-black text-white mt-2 leading-tight">SYSTEMÜBERSCHREITUNG</h2>
                  <p className="text-[11px] text-red-200 mt-1 leading-snug">Anmeldung beim Admin Konto. Bitte gib das Passwort ein.</p>
                </div>
                <form onSubmit={handleAdminLoginSubmit}>
                  <div className="relative">
                    <input type={showAdminPassword ? 'text' : 'password'} value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} placeholder="Admin Passwort" className="w-full bg-black/60 border border-red-700 rounded-xl px-4 py-4 pr-12 text-center text-white outline-none" />
                  <button type="button" onClick={() => setShowAdminPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-300">{showAdminPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  <button type="submit" className="w-full bg-yellow-500 text-black font-bold py-4 rounded-xl mt-6">Anmelden</button>
                </form>
                <button onClick={() => setShowAdminLogin(false)} className="absolute top-4 right-4 text-red-100"><X size={20} /></button>
              </div>
            </div>
        )}
        {showOnboarding && currentUser && (
          <Onboarding
            onComplete={() => { setShowOnboarding(false); localStorage.setItem('fh_onboarding_done', 'true'); }}
            darkMode={darkMode}
            language={language}
            userName={currentUser.name}
            userAvatar={currentUser.avatar}
            mustChangePassword={currentUser.mustChangePassword}
            onPasswordChange={async (pw) => {
              await Backend.family.update(currentUser.id, { password: pw, mustChangePassword: false });
              setFamily(p => p.map(m => m.id === currentUser.id ? { ...m, password: pw, mustChangePassword: false } : m));
              setCurrentUser(prev => prev ? { ...prev, password: pw, mustChangePassword: false } : prev);
            }}
          />
        )}
      </div>
      );
    }

    if (!currentUser) return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-6 relative">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-[30px] shadow-xl mb-6 active:scale-95 transition-transform cursor-pointer" onClick={handleLogoClick}><Logo size={80} /></div>
          <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2 tracking-tight">FamilyHub</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('login.welcome', language)}</p>
        </div>
        <div className="w-full max-w-md grid grid-cols-2 gap-4">
          {family.filter(f => f.role !== 'admin').sort((a, b) => {
            const order = ['Mama', 'Papa', 'Tim', 'Jan'];
            const idxA = order.indexOf(a.name);
            const idxB = order.indexOf(b.name);
            if (idxA === -1 && idxB === -1) return a.name.localeCompare(b.name);
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          }).map(member => (
            <button key={member.id} onClick={() => handleUserSelect(member)} className="relative bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center hover:scale-105 active:scale-95 transition-all">
              <img src={member.avatar} className="w-16 h-16 rounded-full object-cover mb-3" />
              <span className="font-bold text-gray-800 dark:text-gray-200">{member.name}</span>
              {(member.password || member.mustChangePassword) && (
                <span className="absolute bottom-2 right-2 text-gray-400 dark:text-gray-300" title="Passwort geschützt"><Lock size={14} /></span>
              )}
            </button>
          ))}
        </div>
        {(loginStep === 'enter-pass' || loginStep === 'set-pass') && loginUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 relative w-full max-w-xs text-center shadow-2xl">
              <button onClick={() => { setLoginStep('select'); setLoginUser(null); }} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
              <img src={loginUser.avatar} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white dark:border-gray-700 shadow-md" />
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-1 glass-text-glow drop-shadow-sm">{t('login.hello', language)}</h2>
              <p className="text-blue-600 dark:text-blue-400 font-black text-xl mb-2 glass-text-glow drop-shadow-sm">{loginUser.name}</p>
              {loginUser.mustChangePassword && (
                <p className="text-yellow-700 dark:text-yellow-300 text-sm font-semibold mb-4 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
                  {t('login.change_required', language)}
                </p>
              )}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setLoginError(''); }}
                    placeholder={loginStep === 'set-pass' ? t('login.create_pass', language) : t('login.pass_placeholder', language)}
                    className="w-full bg-transparent rounded-2xl px-4 py-4 text-center text-xl outline-none dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl transition-all transform active:scale-95">
                  {loginStep === 'set-pass' ? t('login.set_pass_btn', language) : 'Anmelden'}
                </button>

                {loginError && <p className="text-red-500 text-sm mt-2 font-bold animate-shake">{loginError}</p>}
              </form>
            </div>
          </div>
        )}
        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/95 backdrop-blur-[4px]">
            <div className="bg-red-900 w-full max-w-sm rounded-3xl p-8 relative border border-red-400 shadow-2xl">
              <div className="text-center mb-4">
                <ShieldAlert size={36} className="text-yellow-300 mx-auto" />
                <h2 className="text-lg font-black text-white mt-2 leading-tight">SYSTEMÜBERSCHREITUNG</h2>
                <p className="text-[11px] text-red-200 mt-1 leading-snug">Anmeldung beim Admin Konto. 
                  Bitte Passwort eingeben.</p>
              </div>
              <form onSubmit={handleAdminLoginSubmit}>
                <div className="relative">
                  <input type={showAdminPassword ? 'text' : 'password'} value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} placeholder="Admin Passwort" className="w-full bg-black/60 border border-red-700 rounded-xl px-4 py-4 pr-12 text-center text-white outline-none" />
                  <button type="button" onClick={() => setShowAdminPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-300">{showAdminPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>
                <button type="submit" className="w-full bg-yellow-500 text-black font-bold py-4 rounded-xl mt-6">Anmelden</button>
              </form>
              <button onClick={() => setShowAdminLogin(false)} className="absolute top-4 right-4 text-red-100"><X size={20} /></button>
            </div>
          </div>
        )}
      </div>
    );

    if (currentUser && isTabClosedForUser(currentRoute)) {
      return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            Hinweis
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Der Admin hat diesen Tab vorübergehend geschlossen</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Bitte versuche es später erneut oder wechsle zurück zum Dashboard.</p>
          <button onClick={() => setCurrentRoute(AppRoute.DASHBOARD)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition">
            Zum Dashboard
          </button>
        </div>
      );
    }

    let PageComponent;
    switch (currentRoute) {
      case AppRoute.WEATHER:
        PageComponent = <WeatherPage
          onBack={() => setCurrentRoute(AppRoute.DASHBOARD)}
          favorites={userWeatherFavorites}
          onToggleFavorite={toggleWeatherFavorite}
          initialLocation={currentWeatherLocation}
          onUpdateCurrentWeatherLocation={setCurrentWeatherLocation}
          liquidGlass={effectiveLiquidGlass}
          userId={currentUser?.id}
          weatherLayout={currentUser?.weatherLayout}
          onUpdateWeatherLayout={(layout) => {
            if (!currentUser) return;
            const updated = { ...currentUser, weatherLayout: layout };
            setCurrentUser(updated);
            setFamily(prev => prev.map(m => m.id === currentUser.id ? { ...m, weatherLayout: layout } : m));
            Backend.family.update(currentUser.id, { weatherLayout: layout }).catch(() => {});
          }}
        />;
        break;
      case AppRoute.CALENDAR:
        PageComponent = <CalendarPage
          events={events}
          news={news}
          polls={polls}
          family={family}
          currentUser={currentUser}
          onAddEvent={handleAddEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          onAddNews={async (n) => { setNews(p => [n, ...p]); await Backend.news.add(n); }}
          onUpdateNews={async (id, u) => { setNews(p => p.map(x => x.id === id ? { ...x, ...u } : x)); await Backend.news.update(id, u); }}
          onDeleteNews={async (id) => { setNews(p => p.filter(x => x.id !== id)); await Backend.news.delete(id); }}
          onAddPoll={async (p) => { setPolls(x => [p, ...x]); await Backend.polls.add(p); }}
          onUpdatePoll={async (id, u) => { setPolls(x => x.map(p => p.id === id ? { ...p, ...u } : p)); await Backend.polls.update(id, u); }}
          onDeletePoll={async (id) => { setPolls(x => x.filter(p => p.id !== id)); await Backend.polls.delete(id); }}
          onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)}
          onMarkNewsRead={markNewsRead}
          liquidGlass={effectiveLiquidGlass} />;
        break;
      case AppRoute.LISTS:
        PageComponent = <ListsPage
          shoppingItems={shoppingList}
          householdTasks={householdTasks}
          personalTasks={personalTasks}
          recipes={recipes}
          family={family}
          currentUser={currentUser}
          onToggleShopping={async (id) => { const item = shoppingList.find(i => i.id === id); if (item) { setShoppingList(p => p.map(i => i.id === id ? { ...i, checked: !i.checked } : i)); await Backend.shopping.update(id, { checked: !item.checked }); } }}
          onAddShopping={async (name) => { const i: ShoppingItem = { id: Date.now().toString(), name, checked: false, authorId: currentUser?.id }; setShoppingList(p => [...p, i]); await Backend.shopping.add(i); }}
          onDeleteShopping={async (id) => { const item = shoppingList.find(i => i.id === id); setShoppingList(p => p.filter(i => i.id !== id)); await Backend.shopping.delete(id); if (item?.name) await addNotification('🛒❌ Einkauf entfernt', `${item.name} wurde entfernt`, AppRoute.LISTS); }}
          onAddHousehold={async (t, a, pr, n, d, s) => { const task: Task = { id: Date.now().toString(), title: t, done: false, assignedTo: a, type: 'household', priority: pr || 'medium', note: n, dueDate: d, startDate: s, authorId: currentUser?.id }; setHouseholdTasks(prev => [...prev, task]); await Backend.householdTasks.add(task); }}
          onToggleTask={async (id, type) => { if (type === 'household') { const t = householdTasks.find(x => x.id === id); if (t) { const newDone = !t.done; setHouseholdTasks(p => p.map(x => x.id === id ? { ...x, done: newDone } : x)); await Backend.householdTasks.update(id, { done: newDone }); if (newDone) cancelTaskReminder(id); else if (t.dueDate) scheduleTaskReminder(t); await addNotification('🧹 Hausarbeit', `${t.title} wurde ${newDone ? 'erledigt' : 'wieder geöffnet'}`, AppRoute.LISTS); } } else { const t = personalTasks.find(x => x.id === id); if (t) { const newDone = !t.done; setPersonalTasks(p => p.map(x => x.id === id ? { ...x, done: newDone } : x)); await Backend.personalTasks.update(id, { done: newDone }); if (newDone) cancelTaskReminder(id); else if (t.dueDate) scheduleTaskReminder(t); await addNotification('✅ Aufgabe', `${t.title} wurde ${newDone ? 'erledigt' : 'wieder geöffnet'}`, AppRoute.LISTS); } } }}
          onAddPersonal={async (t, pr, n, d, s) => { const task: Task = { id: Date.now().toString(), title: t, done: false, type: 'personal', priority: pr || 'medium', note: n, dueDate: d, startDate: s, authorId: currentUser?.id }; setPersonalTasks(prev => [...prev, task]); await Backend.personalTasks.add(task); }}
          onDeleteTask={async (id, type) => { const task = [...householdTasks, ...personalTasks].find(x => x.id === id); cancelTaskReminder(id); if (type === 'household') { setHouseholdTasks(p => p.filter(x => x.id !== id)); await Backend.householdTasks.delete(id); } else { setPersonalTasks(p => p.filter(x => x.id !== id)); await Backend.personalTasks.delete(id); } if (task?.title) await addNotification('❌ Aufgabe', `${task.title} wurde gelöscht`, AppRoute.LISTS); }}
          onAddRecipe={async (r) => { setRecipes(p => [...p, r]); await Backend.recipes.add(r); }}
          onDeleteRecipe={async (id) => { setRecipes(p => p.filter(x => x.id !== id)); await Backend.recipes.delete(id); }}
          onUpdateRecipe={async (id, updates) => { setRecipes(p => p.map(x => x.id === id ? { ...x, ...updates } : x)); await Backend.recipes.update(id, updates); }}
          onAddIngredientsToShopping={async (ings) => {
            const items: ShoppingItem[] = ings.map(n => ({ id: Math.random().toString(), name: n, checked: false, authorId: currentUser?.id }));
            const newList = [...shoppingList, ...items];
            setShoppingList(newList);
            await Promise.all(items.map(item => Backend.shopping.add(item)));
            await addNotification('Einkauf', 'Zutaten hinzugefügt', AppRoute.LISTS);
          }}
          mealPlan={mealPlan}
          onAddMealToPlan={addMealToPlan}
          onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)}
          liquidGlass={effectiveLiquidGlass} />;
        break;
      case AppRoute.MEALS:
        PageComponent = <MealsPage plan={mealPlan} requests={mealRequests} family={family} currentUser={currentUser} onUpdatePlan={updateMealPlan} onAddRequest={addMealRequest} onDeleteRequest={deleteMealRequest} onAddIngredientsToShopping={addIngredientsToShopping} onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} recipes={recipes} onAddRecipe={addRecipe} onPlanGenerated={handlePlanGenerated} liquidGlass={effectiveLiquidGlass} />;
        break;
      case AppRoute.ACTIVITIES:
        PageComponent = <ActivitiesPage onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} currentLocation={currentWeatherLocation} liquidGlass={effectiveLiquidGlass} />;
        break;
      case AppRoute.SETTINGS:
        PageComponent = <SettingsPage currentUser={currentUser} onUpdateUser={(updates) => setCurrentUser(prev => prev ? { ...prev, ...updates } : prev)} onUpdateFamilyMember={updateFamilyMember} onLogout={handleLogout} onClose={() => setCurrentRoute(AppRoute.DASHBOARD)} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} enableSwipe={enableSwipe} onToggleSwipe={() => setEnableSwipe(!enableSwipe)} summerMode={summerMode} onToggleSummerMode={() => setSummerMode(!summerMode)} liquidGlass={liquidGlass} onToggleLiquidGlass={() => setLiquidGlass(!liquidGlass)} globalLiquidGlassEnabled={globalLiquidGlassEnabled} onToggleGlobalLiquidGlass={() => setGlobalLiquidGlassEnabled(!globalLiquidGlassEnabled)} globalSummerEnabled={globalSummerEnabled} onToggleGlobalSummer={() => setGlobalSummerEnabled(!globalSummerEnabled)} onTriggerSecurityScreen={triggerSecurityScreen} disabledTabs={disabledTabs} onToggleTabDisabled={(route) => setDisabledTabs(prev => ({ ...prev, [route]: !prev[route] }))} maintenanceMode={maintenanceMode} onToggleMaintenance={() => {
          const newVal = !maintenanceMode;
          setMaintenanceMode(newVal);
          if (newVal) {
            const timeframe = maintenanceStart && maintenanceEnd ? ` (${new Date(maintenanceStart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })} – ${new Date(maintenanceEnd).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })})` : '';
            addNotification('🔧 Wartung geplant', `Der Wartungsmodus wurde aktiviert.${timeframe}`, AppRoute.SETTINGS);
            maintenanceEndNotifiedRef.current = false;
          }
          if (newVal && maintenanceEnd && new Date(maintenanceEnd).getTime() < Date.now()) {
            setMaintenanceEnd('');
          }
        }} maintenanceStart={maintenanceStart} maintenanceEnd={maintenanceEnd} onChangeMaintenanceStart={setMaintenanceStart} onChangeMaintenanceEnd={setMaintenanceEnd} lang={language} setLang={() => { }} family={family} onSendFeedback={addFeedback} allFeedbacks={feedbacks} onMarkFeedbackRead={markFeedbacksRead} onAddNews={addNews} onAddFamilyMember={addFamilyMember} onDeleteUser={deleteUser} news={news} onDeleteNews={deleteNews} onResetPassword={resetMemberPassword} onMarkNewsRead={markNewsRead} onSendAdminNotification={sendAdminBroadcast} onTriggerPushTest={triggerPushTest} onNavigate={setCurrentRoute} events={events} onClearTable={(table) => {
          if (table === 'shopping') { setShoppingList([]); Backend.shopping.setAll([]); }
          else if (table === 'household') { setHouseholdTasks([]); Backend.householdTasks.setAll([]); }
          else if (table === 'personal') { setPersonalTasks([]); Backend.personalTasks.setAll([]); }
          else if (table === 'recipes') { setRecipes([]); Backend.recipes.setAll([]); }
          else if (table === 'meal_plan') { setMealPlan([]); Backend.mealPlan.setAll([]); addNotification('Essen', 'Essensplan geleert', AppRoute.MEALS); }
          else if (table === 'events') { setEvents([]); Backend.events.setAll([]); }
          else if (table === 'polls') { setPolls([]); Backend.polls.setAll([]); }
          else if (table === 'feedback') { setFeedbacks([]); Backend.feedback.setAll([]); }
        }} onRestartOnboarding={() => {
          localStorage.removeItem('fh_onboarding_done');
          setShowOnboarding(true);
        }} />
        break;
      default:
        PageComponent = <Dashboard family={family} currentUser={currentUser} events={events} shoppingCount={shoppingList.length} openTaskCount={myOpenTaskCount} todayMeal={mealPlan.find(m => m.day === new Date().toLocaleDateString('de-DE', { weekday: 'long' }))} onNavigate={setCurrentRoute} onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} lang={language} weatherFavorites={weatherFavorites} currentWeatherLocation={currentWeatherLocation} onUpdateWeatherLocation={setCurrentWeatherLocation} news={news} onMarkNewsRead={markNewsRead} liquidGlass={effectiveLiquidGlass} summerMode={effectiveSummerMode} />;
    }

    return (
      <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Offline Banner */}
        {(isOffline || getPendingMutationCount() > 0) && (
          <div className="flex-shrink-0 bg-amber-500 dark:bg-amber-600 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-bold z-50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            {isOffline
              ? 'Offline — Änderungen werden später synchronisiert'
              : `${getPendingMutationCount()} Änderung${getPendingMutationCount() !== 1 ? 'en' : ''} warten auf Sync`}
          </div>
        )}
        <main
          ref={mainScrollRef}
          className="flex-1 overflow-y-auto no-scrollbar relative"
          onTouchStart={handleMainTouchStart}
          onTouchMove={handleMainTouchMove}
          onTouchEnd={handleMainTouchEnd}
        >
          {/* Pull-to-refresh indicator */}
          <div className="sticky top-0 z-40 flex justify-center pointer-events-none" style={{ height: 0, marginTop: pullY > 0 ? -pullY : 0 }}>
            {pullY > 0 && (
              <div className={`mt-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 transition-opacity duration-200 ${isRefreshing ? 'opacity-100' : (pullY >= PULL_THRESHOLD ? 'opacity-100' : 'opacity-80')}`}>
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    <span>Aktualisieren…</span>
                  </>
                ) : pullY >= PULL_THRESHOLD ? (
                  <>
                    <svg className="h-4 w-4 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v12m0 0l-4-4m4 4l4-4" /><path d="M20 16v0a4 4 0 01-4 4H8a4 4 0 01-4-4v0" /></svg>
                    <span>Loslassen zum Aktualisieren</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v12m0 0l-4-4m4 4l4-4" /><path d="M20 16v0a4 4 0 01-4 4H8a4 4 0 01-4-4v0" /></svg>
                    <span>Ziehen zum Aktualisieren</span>
                  </>
                )}
              </div>
            )}
          </div>
          {PageComponent}
        </main>
        <div className={`w-full flex-shrink-0 z-30 transition-all duration-500 ${effectiveLiquidGlass ? 'bg-transparent dark:bg-transparent' : 'bg-white dark:bg-slate-900'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Navigation currentRoute={currentRoute} onNavigate={setCurrentRoute} lang={language} liquidGlass={effectiveLiquidGlass} enableSwipe={enableSwipe} summerMode={effectiveSummerMode} />
        </div>

        {showOnboarding && currentUser && (
          <Onboarding
            onComplete={() => { setShowOnboarding(false); localStorage.setItem('fh_onboarding_done', 'true'); }}
            darkMode={darkMode}
            language={language}
            userName={currentUser.name}
            userAvatar={currentUser.avatar}
            mustChangePassword={currentUser.mustChangePassword}
            onPasswordChange={async (pw) => {
              await Backend.family.update(currentUser.id, { password: pw, mustChangePassword: false });
              setFamily(p => p.map(m => m.id === currentUser.id ? { ...m, password: pw, mustChangePassword: false } : m));
              setCurrentUser(prev => prev ? { ...prev, password: pw, mustChangePassword: false } : prev);
            }}
          />
        )}

        {showSecurityScreen && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-800 text-center">
              <div className="text-blue-600 dark:text-blue-400 font-extrabold text-lg mb-2">Sicherheit geht vor</div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Ein Admin hat einen Sicherheits-Hinweis aktiviert. Bitte bestätige, dass du informiert bist.
              </p>
              <button onClick={acknowledgeSecurityScreen} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-lg transition">
                Verstanden
              </button>
            </div>
          </div>
        )}
        {showPasswordResetScreen && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-800 text-center">
              <div className="text-blue-600 dark:text-blue-400 font-extrabold text-lg mb-2">Sicherheit geht vor</div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Bitte setze jetzt ein neues Passwort.
              </p>
              <form onSubmit={handlePasswordResetSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPasswordInput}
                    onChange={(e) => { setResetPasswordInput(e.target.value); setResetPasswordError(''); }}
                    placeholder="Neues Passwort"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-center text-base outline-none dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPasswordConfirm}
                    onChange={(e) => { setResetPasswordConfirm(e.target.value); setResetPasswordError(''); }}
                    placeholder="Passwort bestätigen"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-center text-base outline-none dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {resetPasswordError && <p className="text-red-500 text-xs font-bold">{resetPasswordError}</p>}
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-lg transition">
                  Passwort speichern
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  return renderContent();
};

export default App;


