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
import { requestFirebaseToken, onMessageListener } from './services/fcm';
import { Lock, X, Loader2, ArrowRight, UserPlus, Eye, EyeOff, ShieldAlert, AlertTriangle } from 'lucide-react';
import { t, Language } from './services/translations';
import { Backend } from './services/backend';
import { Geolocation } from '@capacitor/geolocation';
import { fetchWeather, getWeatherDescription } from './services/weather';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from './services/backend';

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
const EXE_DOWNLOAD_LINK: string = "https://hjkmfodzhradtkeiyele.supabase.co/storage/v1/object/public/apps/FamilyHub-setup.exe";
const SWIFT_DOWNLOAD_LINK: string = "https://hjkmfodzhradtkeiyele.supabase.co/storage/v1/object/public/apps/FamilyHub.swiftpm.zip";
const POLLING_INTERVAL = 30000;
const DEFAULT_APP_SETTINGS = {
  id: 'global',
  maintenance_mode: false,
  maintenance_start: null,
  maintenance_end: null,
  disabled_tabs: {},
  global_easter_enabled: true,
  global_liquid_glass_enabled: true,
};

const formatForDateTimeLocal = (isoString: string | null) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString.slice(0, 16);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  // --- 2. Settings & Session State ---
  const [darkMode, setDarkMode] = useState(false);
  const [enableSwipe, setEnableSwipe] = useLocalSetting<boolean>('fh_enableswipe', false);
  const [easterMode, setEasterMode] = useLocalSetting<boolean>('fh_eastermode', false);
  const [liquidGlass, setLiquidGlass] = useLocalSetting<boolean>('fh_liquidglass', true);
  const [globalEasterEnabled, setGlobalEasterEnabled] = useLocalSetting<boolean>('fh_global_easter_enabled', true);
  const [globalLiquidGlassEnabled, setGlobalLiquidGlassEnabled] = useLocalSetting<boolean>('fh_global_liquidglass_enabled', true);
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
  const [currentUser, setCurrentUser] = useState<FamilyMember | null>(null);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/install')) return AppRoute.LANDING;
    const savedRoute = localStorage.getItem('fh_last_route');
    const hasBooted = localStorage.getItem('fh_has_booted');
    if (hasBooted && savedRoute && Object.values(AppRoute).includes(savedRoute as AppRoute)) {
      return savedRoute as AppRoute;
    }
    return AppRoute.DASHBOARD;
  });
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
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  // --- 3. Refs ---
  const processedNotificationsRef = useRef<Set<string>>(new Set());
  const lastPollTimeRef = useRef<number>(Date.now());
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const lastSentPayloadRef = useRef<string>('');

  // --- 4. Helper Logic (Non-Conditional) ---
  const regularFamily = family.filter(f => f.role !== 'admin');
  const myOpenTaskCount = householdTasks.filter(t => t.assignedTo === currentUser?.id && !t.done).length + personalTasks.filter(t => !t.done).length;
  const userWeatherFavorites = (currentUser && weatherFavorites) ? weatherFavorites.filter(f => f.userId === currentUser.id) : [];
  const allowEasterForUser = currentUser ? (currentUser.role === 'admin' || globalEasterEnabled) : globalEasterEnabled;
  const allowLiquidGlassForUser = currentUser ? (currentUser.role === 'admin' || globalLiquidGlassEnabled) : globalLiquidGlassEnabled;
  const effectiveEasterMode = allowEasterForUser ? easterMode : false;
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

  const addNotification = async (title: string, message: string) => {
    if (!shouldFireNotification(title, message)) return;
    const notif: AppNotification = { id: Date.now().toString() + Math.random(), title, message, type: 'info', timestamp: new Date().toISOString(), read: false, authorId: currentUser?.id };
    await Backend.notifications.add(notif);
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.schedule({ notifications: [{ id: hashCode(title + message), title, body: message, smallIcon: 'notification_icon', schedule: { at: new Date(Date.now() + 100) }, sound: 'default' }] });
    }
  };

  const requestAppPermissions = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const geoPerm = await Geolocation.checkPermissions();
        if (geoPerm.location !== 'granted') await Geolocation.requestPermissions();
      } catch (e) { }
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentWeatherLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'Aktueller Standort' }),
        null, { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  };

  // --- 5. Effect Hooks (Unconditional) ---

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => { });
      StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => { });
      LocalNotifications.requestPermissions().catch(() => { });
    }
  }, []);

  useEffect(() => {
    if (currentRoute !== AppRoute.LANDING) localStorage.setItem('fh_has_booted', 'true');
    if (currentRoute !== AppRoute.SETTINGS && currentRoute !== AppRoute.LANDING) localStorage.setItem('fh_last_route', currentRoute);
  }, [currentRoute]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    // This allows the global CSS in index.html (like Blue -> Pink) to work
    if (effectiveEasterMode) {
      document.documentElement.setAttribute('data-easter', 'true');
    } else {
      document.documentElement.removeAttribute('data-easter');
    }
  }, [effectiveEasterMode]);

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

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [fam, ev, newsData, shop, house, pers, meals, reqs, weath, rec, fbs, pollsData, appSettings] = await Promise.all([
          Backend.family.getAll(), Backend.events.getAll(), Backend.news.getAll(), Backend.shopping.getAll(),
          Backend.householdTasks.getAll(), Backend.personalTasks.getAll(), Backend.mealPlan.getAll(),
          Backend.mealRequests.getAll(), Backend.weatherFavorites.getAll(), Backend.recipes.getAll(),
          Backend.feedback.getAll(), Backend.polls.getAll(), Backend.appSettings.getAll()
        ]);
        setFamily(fam); setEvents(ev); setNews(newsData); setShoppingList(shop);
        setHouseholdTasks(house); setPersonalTasks(pers); setMealPlan(meals);
        setMealRequests(reqs); setWeatherFavorites(weath); setRecipes(rec);
        setFeedbacks(fbs); setPolls(pollsData);
        const settingsRow = appSettings && appSettings.length > 0 ? appSettings[0] : null;
        if (settingsRow) {
          setMaintenanceMode(!!settingsRow.maintenance_mode);
          setMaintenanceStart(settingsRow.maintenance_start || '');
          setMaintenanceEnd(settingsRow.maintenance_end || '');
          setDisabledTabs(settingsRow.disabled_tabs || {});
          if (typeof settingsRow.global_easter_enabled === 'boolean') setGlobalEasterEnabled(settingsRow.global_easter_enabled);
          if (typeof settingsRow.global_liquid_glass_enabled === 'boolean') setGlobalLiquidGlassEnabled(settingsRow.global_liquid_glass_enabled);
        } else {
          await Backend.appSettings.add(DEFAULT_APP_SETTINGS as any);
        }
      } finally { setLoadingData(false); }
    };
    loadAll();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    requestAppPermissions();
    let unsubscribeFCM: (() => void) | undefined;
    const setupFCM = async () => {
      const token = await requestFirebaseToken(currentUser.id);
      if (token) {
        unsubscribeFCM = onMessageListener((payload: any) => {
          if (payload.notification) {
            const title = payload.notification.title || 'Mitteilung';
            const message = payload.notification.body || '';
            if (shouldFireNotification(title, message) && Capacitor.isNativePlatform()) {
              LocalNotifications.schedule({ notifications: [{ id: hashCode(title + message), title, body: message, smallIcon: 'notification_icon', schedule: { at: new Date(Date.now() + 100) }, sound: 'default' }] });
            }
          }
        });
      }
    };
    setupFCM();
    return () => { if (unsubscribeFCM) unsubscribeFCM(); };
  }, [currentUser]);

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
      global_easter_enabled: globalEasterEnabled,
      global_liquid_glass_enabled: globalLiquidGlassEnabled,
    };

    const payloadStr = JSON.stringify(payload);
    if (payloadStr === lastSentPayloadRef.current) return;
    lastSentPayloadRef.current = payloadStr;

    // Use a small timeout to debounce and ensure we don't fire too many requests
    const timeout = setTimeout(() => {
      Backend.appSettings.update('global', payload as any);
    }, 500);

    return () => clearTimeout(timeout);
  }, [loadingData, currentUser, maintenanceMode, maintenanceStart, maintenanceEnd, disabledTabs, globalEasterEnabled, globalLiquidGlassEnabled]);

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
    if (typeof settingsRow.global_easter_enabled === 'boolean') setGlobalEasterEnabled(settingsRow.global_easter_enabled);
    if (typeof settingsRow.global_liquid_glass_enabled === 'boolean') setGlobalLiquidGlassEnabled(settingsRow.global_liquid_glass_enabled);
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
    if (!currentUser) return;
    const scheduleWeather = async () => {
      try {
        if (!navigator.geolocation) return;
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 15000 }));
        const data = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
        if (!data) return;
        const temp = Math.round(data.current.temperature_2m);
        const title = `Stündliches Wetterupdate: ${temp}°C`;
        const body = `Jetzt: ${getWeatherDescription(data.current.weather_code)}.`;

        if (Capacitor.isNativePlatform()) {
          try {
            await LocalNotifications.cancel({ notifications: [{ id: 9001 }] });
          } catch (e) {
            // ignore if no existing notification is set
          }
          LocalNotifications.schedule({ notifications: [{ id: 9001, title, body, smallIcon: 'notification_icon', schedule: { every: 'hour', allowWhileIdle: true } }] });
        }
      } catch (e) { }
    };
    const startup = setTimeout(scheduleWeather, 10000);
    let interval: ReturnType<typeof setInterval> | null = null;
    if (!Capacitor.isNativePlatform()) {
      interval = setInterval(scheduleWeather, 3600000);
    }
    return () => { clearTimeout(startup); if (interval) clearInterval(interval); };
  }, [currentUser]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: (currentRoute === AppRoute.WEATHER || darkMode) ? Style.Dark : Style.Light }).catch(() => { });
    }
  }, [currentRoute, darkMode]);

  const updateMealPlan = async (newPlan: MealPlan[]) => { setMealPlan(newPlan); await Backend.mealPlan.setAll(newPlan); };
  const addMealRequest = async (r: MealRequest) => { setMealRequests(p => [...p, r]); await Backend.mealRequests.add(r); };
  const deleteMealRequest = async (id: string) => { setMealRequests(p => p.filter(x => x.id !== id)); await Backend.mealRequests.delete(id); };
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
    await addNotification('Essen', `${mealName} zum Plan hinzugefügt`);
  };
  const addIngredientsToShopping = async (ings: string[]) => { 
    const items = ings.map(n => ({ id: Math.random().toString(), name: n, checked: false })); 
    setShoppingList(p => [...p, ...items]); 
    await Promise.all(items.map(item => Backend.shopping.add(item)));
    await addNotification('Einkauf', 'Zutaten hinzugefügt'); 
  };
  const addRecipe = async (r: Recipe) => { setRecipes(p => [...p, r]); await Backend.recipes.add(r); };
  const handlePlanGenerated = async (newPlan: MealPlan[]) => { setMealPlan(newPlan); await Backend.mealPlan.setAll(newPlan); };
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
  const sendAdminBroadcast = async (title: string, msg: string) => { await addNotification(title, msg); };
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
      setShowAdminLogin(false);
    } else setLoginError("Zugriff verweigert.");
  };
  const handleUserSelect = (member: FamilyMember) => {
    setLoginUser(member);
    setPasswordInput('');
    setLoginError('');
    setLoginStep('enter-pass');
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
    if (target.closest('input, textarea, select, button')) return;
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
    const nextRoute = dx < 0 ? getNextSwipeRoute(1) : getNextSwipeRoute(-1);
    if (nextRoute !== currentRoute) setCurrentRoute(nextRoute);
  };

  const toggleWeatherFavorite = async (loc: SavedLocation) => {
    if (!currentUser) return;
    const exists = weatherFavorites.find(f => f.name === loc.name && f.userId === currentUser.id);
    if (exists) { setWeatherFavorites(p => p.filter(f => f.id !== exists.id)); await Backend.weatherFavorites.delete(exists.id); }
    else { const n = { ...loc, id: Date.now().toString(), userId: currentUser.id }; setWeatherFavorites(p => [...p, n]); await Backend.weatherFavorites.add(n); }
  };

  const renderEasterDecorations = () => {
    if (!effectiveEasterMode) return null;
    const eggs = ['🥚', '🐰', '🐣', '🌷', '🦋'];
    return (
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute text-3xl animate-easter-fall"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 15}s`,
              top: '-50px'
            }}
          >
            <span className="animate-[easter-sway_3s_ease-in-out_infinite] block">
              {eggs[Math.floor(Math.random() * eggs.length)]}
            </span>
          </div>
        ))}
      </div>
    );
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
        if (ua.includes('win')) return { link: EXE_DOWNLOAD_LINK, label: 'Windows Update (.exe)' };
        if (isIOS) return { link: SWIFT_DOWNLOAD_LINK, label: 'iOS Update (Swift)' };
        return { link: APK_DOWNLOAD_LINK, label: t('maintenance.download_update', language) };
      };
      const updateInfo = getUpdateInfo();

      return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center relative">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-[30px] shadow-xl mb-6 active:scale-95 transition-transform cursor-pointer" onClick={handleLogoClick}><Logo size={80} /></div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            {t('maintenance.title', language)}
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">{t('maintenance.title', language)}</h2>
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
                  <p className="text-[11px] text-red-200 mt-1 leading-snug">Admin-Modus aktiviert. Bitte Admin-Passwort eingeben.</p>
                </div>
                <form onSubmit={handleAdminLoginSubmit}>
                  <input type="password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} placeholder="Admin Passwort" className="w-full bg-black/60 border border-red-700 rounded-xl px-4 py-4 text-center text-white outline-none" />
                  <button type="submit" className="w-full bg-yellow-500 text-black font-bold py-4 rounded-xl mt-6 uppercase">Zutritt</button>
                </form>
                <button onClick={() => setShowAdminLogin(false)} className="absolute top-4 right-4 text-red-100"><X size={20} /></button>
              </div>
            </div>
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
                <p className="text-[11px] text-red-200 mt-1 leading-snug">Admin-Modus aktiviert. Bitte Admin-Passwort eingeben.</p>
              </div>
              <form onSubmit={handleAdminLoginSubmit}>
                <input type="password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} placeholder="Admin Passwort" className="w-full bg-black/60 border border-red-700 rounded-xl px-4 py-4 text-center text-white outline-none" />
                <button type="submit" className="w-full bg-yellow-500 text-black font-bold py-4 rounded-xl mt-6 uppercase">Zutritt</button>
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
        PageComponent = <WeatherPage onBack={() => setCurrentRoute(AppRoute.DASHBOARD)} favorites={userWeatherFavorites} onToggleFavorite={toggleWeatherFavorite} initialLocation={currentWeatherLocation} onUpdateCurrentWeatherLocation={setCurrentWeatherLocation} liquidGlass={effectiveLiquidGlass} />;
        break;
      case AppRoute.CALENDAR:
        PageComponent = <CalendarPage events={events} news={news} polls={polls} family={family} currentUser={currentUser} onAddEvent={async (e) => { const ev = { ...e, authorId: currentUser.id }; setEvents(p => [...p, ev]); await Backend.events.add(ev); }} onUpdateEvent={async (id, u) => { setEvents(p => p.map(x => x.id === id ? { ...x, ...u } : x)); await Backend.events.update(id, u); }} onDeleteEvent={async (id) => { setEvents(p => p.filter(x => x.id !== id)); await Backend.events.delete(id); }} onAddNews={async (n) => { setNews(p => [n, ...p]); await Backend.news.add(n); }} onUpdateNews={async (id, u) => { setNews(p => p.map(x => x.id === id ? { ...x, ...u } : x)); await Backend.news.update(id, u); }} onDeleteNews={async (id) => { setNews(p => p.filter(x => x.id !== id)); await Backend.news.delete(id); }} onAddPoll={async (p) => { setPolls(x => [p, ...x]); await Backend.polls.add(p); }} onUpdatePoll={async (id, u) => { setPolls(x => x.map(p => p.id === id ? { ...p, ...u } : p)); await Backend.polls.update(id, u); }} onDeletePoll={async (id) => { setPolls(x => x.filter(p => p.id !== id)); await Backend.polls.delete(id); }} onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} onMarkNewsRead={async (id) => { const n = news.find(x => x.id === id); if (n) { const readers = [...(n.readBy || []), currentUser.id]; setNews(p => p.map(x => x.id === id ? { ...x, readBy: readers } : x)); await Backend.news.update(id, { readBy: readers }); } }} easterEnabled={effectiveEasterMode} />;
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
                                onAddShopping={async (name) => { const i = { id: Date.now().toString(), name, checked: false }; setShoppingList(p => [...p, i]); await Backend.shopping.add(i); }} 
                                onDeleteShopping={async (id) => { setShoppingList(p => p.filter(i => i.id !== id)); await Backend.shopping.delete(id); }} 
                                onAddHousehold={async (t, a) => { const task: Task = { id: Date.now().toString(), title: t, done: false, assignedTo: a, type: 'household', priority: 'medium' }; setHouseholdTasks(p => [...p, task]); await Backend.householdTasks.add(task); }} 
                                onToggleTask={async (id, type) => { if (type === 'household') { const t = householdTasks.find(x => x.id === id); if (t) { setHouseholdTasks(p => p.map(x => x.id === id ? { ...x, done: !x.done } : x)); await Backend.householdTasks.update(id, { done: !t.done }); } } else { const t = personalTasks.find(x => x.id === id); if (t) { setPersonalTasks(p => p.map(x => x.id === id ? { ...x, done: !x.done } : x)); await Backend.personalTasks.update(id, { done: !t.done }); } } }} 
                                onAddPersonal={async (t) => { const task: Task = { id: Date.now().toString(), title: t, done: false, type: 'personal', priority: 'medium' }; setPersonalTasks(p => [...p, task]); await Backend.personalTasks.add(task); }} 
                                onDeleteTask={async (id, type) => { if (type === 'household') { setHouseholdTasks(p => p.filter(x => x.id !== id)); await Backend.householdTasks.delete(id); } else { setPersonalTasks(p => p.filter(x => x.id !== id)); await Backend.personalTasks.delete(id); } }} 
                                onAddRecipe={async (r) => { setRecipes(p => [...p, r]); await Backend.recipes.add(r); }} 
                                onDeleteRecipe={async (id) => { setRecipes(p => p.filter(x => x.id !== id)); await Backend.recipes.delete(id); }} 
                                onAddIngredientsToShopping={async (ings) => { 
                                  const items = ings.map(n => ({ id: Math.random().toString(), name: n, checked: false })); 
                                  const newList = [...shoppingList, ...items];
                                  setShoppingList(newList); 
                                  await Promise.all(items.map(item => Backend.shopping.add(item)));
                                  await addNotification('Einkauf', 'Zutaten hinzugefügt'); 
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
        PageComponent = <SettingsPage currentUser={currentUser} onUpdateUser={(updates) => setCurrentUser(prev => prev ? { ...prev, ...updates } : prev)} onUpdateFamilyMember={updateFamilyMember} onLogout={handleLogout} onClose={() => setCurrentRoute(AppRoute.DASHBOARD)} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} enableSwipe={enableSwipe} onToggleSwipe={() => setEnableSwipe(!enableSwipe)} easterMode={easterMode} onToggleEasterMode={() => setEasterMode(!easterMode)} liquidGlass={liquidGlass} onToggleLiquidGlass={() => setLiquidGlass(!liquidGlass)} globalEasterEnabled={globalEasterEnabled} onToggleGlobalEaster={() => setGlobalEasterEnabled(!globalEasterEnabled)} globalLiquidGlassEnabled={globalLiquidGlassEnabled} onToggleGlobalLiquidGlass={() => setGlobalLiquidGlassEnabled(!globalLiquidGlassEnabled)} onTriggerSecurityScreen={triggerSecurityScreen} disabledTabs={disabledTabs} onToggleTabDisabled={(route) => setDisabledTabs(prev => ({ ...prev, [route]: !prev[route] }))} maintenanceMode={maintenanceMode} onToggleMaintenance={() => {
          const newVal = !maintenanceMode;
          setMaintenanceMode(newVal);
          if (newVal && maintenanceEnd && new Date(maintenanceEnd).getTime() < Date.now()) {
            setMaintenanceEnd('');
          }
        }} maintenanceStart={maintenanceStart} maintenanceEnd={maintenanceEnd} onChangeMaintenanceStart={setMaintenanceStart} onChangeMaintenanceEnd={setMaintenanceEnd} lang={language} setLang={() => { }} family={family} onSendFeedback={addFeedback} allFeedbacks={feedbacks} onMarkFeedbackRead={markFeedbacksRead} onAddNews={addNews} onAddFamilyMember={addFamilyMember} onDeleteUser={deleteUser} news={news} onDeleteNews={deleteNews} onResetPassword={resetMemberPassword} onMarkNewsRead={markNewsRead} onSendAdminNotification={sendAdminBroadcast} onNavigate={setCurrentRoute} />;
        break;
      default:
        PageComponent = <Dashboard family={family} currentUser={currentUser} events={events} shoppingCount={shoppingList.length} openTaskCount={myOpenTaskCount} todayMeal={mealPlan.find(m => m.day === new Date().toLocaleDateString('de-DE', { weekday: 'long' }))} onNavigate={setCurrentRoute} onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} lang={language} weatherFavorites={weatherFavorites} currentWeatherLocation={currentWeatherLocation} onUpdateWeatherLocation={setCurrentWeatherLocation} news={news} onMarkNewsRead={markNewsRead} liquidGlass={effectiveLiquidGlass} />;
    }

    return (
      <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {renderEasterDecorations()}
        <main className="flex-1 overflow-y-auto no-scrollbar relative">{PageComponent}</main>
        <div className={`w-full flex-shrink-0 z-30 transition-all duration-500 ${currentRoute === AppRoute.WEATHER ? (effectiveLiquidGlass ? 'bg-transparent' : 'bg-slate-900') : (effectiveLiquidGlass ? 'bg-transparent' : 'bg-white dark:bg-slate-900')}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Navigation currentRoute={currentRoute} onNavigate={setCurrentRoute} lang={language} easterMode={effectiveEasterMode} liquidGlass={effectiveLiquidGlass} enableSwipe={enableSwipe} />
        </div>
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
