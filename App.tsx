import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { NotificationContext } from './NotificationContext';
import { Lock, X, Loader2, ArrowRight, UserPlus, Eye, EyeOff, ShieldAlert, AlertTriangle } from 'lucide-react';
import { t, Language } from './services/translations';
import { Backend } from './services/backend';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { fetchWeather, getWeatherDescription } from './services/weather';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

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
const CURRENT_APP_VERSION = "1.1.4"; 
const POLLING_INTERVAL = 30000; 


// --- LIQUID BACKGROUND COMPONENT ---
const LiquidBackground = React.memo(() => {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] transform-gpu">
            {/* Info */}
            <div className="absolute top-4 left-4 flex items-center space-x-3 text-xs text-gray-400 font-medium z-10">
                <span>v{CURRENT_APP_VERSION}</span>
                <span>•</span>
                <a href="https://github.com/SuperYoshi6/FamilyHub" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">GitHub</a>
            </div>

            {/* Dynamic Moving Blobs (Apple-style backdrop depth) */}
            <div className="liquid-blob-container text-blue-500 dark:text-blue-900">
                <div className="liquid-blob w-[600px] h-[600px] bg-blue-400/30 -top-20 -left-20 animate-blob"></div>
                <div className="liquid-blob w-[500px] h-[500px] bg-purple-400/20 top-1/4 -right-20 animate-blob animation-delay-2000"></div>
                <div className="liquid-blob w-[700px] h-[700px] bg-pink-300/20 -bottom-40 left-1/4 animate-blob animation-delay-4000"></div>
                <div className="liquid-blob w-[400px] h-[400px] bg-emerald-300/20 top-1/2 left-1/2 animate-blob"></div>
            </div>

            {/* Standard Blobs for non-blob supporting CSS or fallback depth */}
            <div className="absolute top-0 left-[-20%] w-[70vw] h-[70vw] bg-purple-400 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[100px] opacity-30 animate-blob will-change-transform"></div>
            <div className="absolute top-[20%] right-[-20%] w-[70vw] h-[70vw] bg-cyan-300 dark:bg-indigo-900 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[100px] opacity-30 animate-blob animation-delay-2000 will-change-transform"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-[70vw] h-[70vw] bg-pink-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[100px] opacity-30 animate-blob animation-delay-4000 will-change-transform"></div>
        </div>
    );
});

// --- GLASS LENS OVERLAY ---
const LiquidLensOverlay = React.memo(() => {
    return <div className="liquid-lens-scanner will-change-transform"></div>;
});

const App: React.FC = () => {
  // --- Data State ---
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  // --- Local Settings ---
  const [darkMode, setDarkMode] = useLocalSetting<boolean>('fh_darkmode', false);
  const [liquidGlass, setLiquidGlass] = useLocalSetting<boolean>('fh_liquidglass', false);
  const language: Language = 'de'; 

  // --- Session State ---
  const [currentUser, setCurrentUser] = useState<FamilyMember | null>(null);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/install')) return AppRoute.LANDING;
    if (path.includes('/app')) return AppRoute.APP;
    // Root redirect
    if (path === '/familyhub' || path === '/familyhub/') return AppRoute.LANDING;
    return 'INVALID' as AppRoute;
  });
  const [lastRoute, setLastRoute] = useState<AppRoute>(AppRoute.DASHBOARD);

  // --- Global Weather State ---
  const [currentWeatherLocation, setCurrentWeatherLocation] = useState<{lat: number, lng: number, name: string} | null>(null);
  const lastWeatherNotifyRef = useRef<number>(0);
  const updateNotifiedRef = useRef<boolean>(false);

  // Login Logic State
  const [loginStep, setLoginStep] = useState<'select' | 'enter-pass' | 'set-pass'>('select');
  const [loginUser, setLoginUser] = useState<FamilyMember | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Admin Override State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [logoClickCount, setLogoClickCount] = useState(0);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  
  // Setup State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'parent' | 'child'>('parent');
  const [creatingUser, setCreatingUser] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);

  // References for polling
  const lastPollTime = useRef<number>(Date.now());

  // --- SWIPE GESTURE LOGIC ---
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  
  const onTouchStart = useCallback((e: React.TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
          target.closest('nav') || 
          target.closest('input') || 
          target.closest('textarea') || 
          target.closest('.no-swipe') ||
          target.tagName === 'BUTTON' ||
          e.touches[0].clientX < 20 || 
          e.touches[0].clientX > window.innerWidth - 20
      ) return;
      
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      
      const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      const distanceX = touchStartRef.current.x - touchEnd.x;
      const distanceY = touchStartRef.current.y - touchEnd.y;
      touchStartRef.current = null;

      const minSwipeDistance = 80; 
      const maxVerticalVariance = 50; 

      if (Math.abs(distanceX) > minSwipeDistance && Math.abs(distanceY) < maxVerticalVariance) {
          const navOrder = [
              AppRoute.DASHBOARD,
              AppRoute.WEATHER,
              AppRoute.CALENDAR,
              AppRoute.MEALS,
              AppRoute.LISTS
          ];
          let currentIndex = navOrder.indexOf(currentRoute);
          if (currentRoute === AppRoute.NEWS) currentIndex = 2; 

          if (currentIndex !== -1) {
              if (distanceX > 0) { // Swiped Left -> Next Tab
                  const nextIndex = (currentIndex + 1) % navOrder.length;
                  setCurrentRoute(navOrder[nextIndex]);
              } else { // Swiped Right -> Prev Tab
                  const prevIndex = (currentIndex - 1 + navOrder.length) % navOrder.length;
                  setCurrentRoute(navOrder[prevIndex]);
              }
          }
      }
  }, [currentRoute]);

  // --- HARDWARE BACK BUTTON HANDLING ---
  useEffect(() => {
      if (Capacitor.isNativePlatform()) {
          CapacitorApp.addListener('backButton', ({ canGoBack }) => {
              if (currentRoute !== AppRoute.DASHBOARD && currentUser) {
                  setCurrentRoute(AppRoute.DASHBOARD);
              } else if (!currentUser && (loginStep === 'enter-pass' || loginStep === 'set-pass')) {
                  setLoginStep('select');
                  setLoginUser(null);
              } else {
                  CapacitorApp.exitApp();
              }
          });
      }
      return () => {
          if (Capacitor.isNativePlatform()) {
              CapacitorApp.removeAllListeners();
          }
      };
  }, [currentRoute, currentUser, loginStep]);

  const requestAppPermissions = async () => {
      // 1. Native Permissions (Notifications & Geo)
      try {
          if (Capacitor.isNativePlatform()) {
              try {
                const notifPerm = await LocalNotifications.checkPermissions();
                if (notifPerm.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }
              } catch (e) {}
              
              try {
                  const geoPerm = await Geolocation.checkPermissions();
                  if (geoPerm.location !== 'granted') {
                      await Geolocation.requestPermissions();
                  }
              } catch (e) {}
          }
      } catch (e) {}

      // 2. Web Geolocation (Browser Prompt)
      if (!Capacitor.isNativePlatform() && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (pos) => {
                  setCurrentWeatherLocation({
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                      name: 'Aktueller Standort'
                  });
              },
              (err) => {
                  console.log("Browser GPS request denied or failed:", err.message);
              },
              { enableHighAccuracy: false, timeout: 5000 }
          );
      }
  };

  // Initial Data Load
  useEffect(() => {
      const loadAll = async () => {
          try {
              const [fam, ev, newsData, shop, house, pers, meals, reqs, weath, rec, fbs, pollsData, notifs] = await Promise.all([
                  Backend.family.getAll(),
                  Backend.events.getAll(),
                  Backend.news.getAll(),
                  Backend.shopping.getAll(),
                  Backend.householdTasks.getAll(),
                  Backend.personalTasks.getAll(),
                  Backend.mealPlan.getAll(),
                  Backend.mealRequests.getAll(),
                  Backend.weatherFavorites.getAll(),
                  Backend.recipes.getAll(),
                  Backend.feedback.getAll(),
                  Backend.polls.getAll(),
                  Backend.notifications.getAll()
              ]);
              
              setFamily(fam);
              setEvents(ev);
              setNews(newsData);
              setShoppingList(shop);
              setHouseholdTasks(house);
              setPersonalTasks(pers);
              setMealPlan(meals);
              setMealRequests(reqs);
              setWeatherFavorites(weath);
              setRecipes(rec);
              setFeedbacks(fbs);
              setPolls(pollsData);
              setNotifications(notifs);
          } catch (e) {
              console.error("Failed to load backend data", e);
          } finally {
              setLoadingData(false);
          }
      };
      loadAll();
  }, []);

  // Trigger permissions request when a user logs in or is restored
  useEffect(() => {
      if (currentUser) {
          requestAppPermissions();
      }
  }, [currentUser]);

  // --- BACKGROUND POLLING & NOTIFICATIONS ---
  useEffect(() => {
      if (!currentUser) return;

      const interval = setInterval(async () => {
          const [freshNews, freshFeedback] = await Promise.all([
              Backend.news.getAll(),
              Backend.feedback.getAll()
          ]);
          setNews(freshNews);
          setFeedbacks(freshFeedback);

          const checkTime = lastPollTime.current;
          
          const newMessages = freshNews.filter(n => {
              const isPrivate = n.tag === `PRIVATE:${currentUser.id}`;
              const isNew = new Date(n.createdAt).getTime() > checkTime;
              const notRead = !n.readBy?.includes(currentUser.id);
              return isPrivate && isNew && notRead;
          });

          newMessages.forEach(msg => {
              const sender = family.find(f => f.id === msg.authorId)?.name || 'Jemand';
              addNotification('Neue Nachricht 📬', `${sender}: ${msg.description.substring(0, 30)}...`);
          });

          if (currentUser.role === 'admin') {
              const newFeedback = freshFeedback.filter(f => {
                  return new Date(f.createdAt).getTime() > checkTime && !f.read;
              });
              newFeedback.forEach(fb => {
                  addNotification('Neues Feedback ⭐', `${fb.userName} hat Feedback gesendet.`);
              });
          }

          const SIMULATED_SERVER_VERSION = "1.1.4"; 
          if (SIMULATED_SERVER_VERSION > CURRENT_APP_VERSION && !updateNotifiedRef.current) {
               addNotification('Update verfügbar 📲', `Version ${SIMULATED_SERVER_VERSION} ist bereit. Jetzt herunterladen.`);
               updateNotifiedRef.current = true;
          }

          const now = Date.now();
          if (now - lastWeatherNotifyRef.current > 3600000) { 
              await checkAndScheduleWeather();
              lastWeatherNotifyRef.current = now;
          }

          lastPollTime.current = Date.now();

      }, POLLING_INTERVAL);

      checkAndScheduleWeather();

      return () => clearInterval(interval);
  }, [currentUser, family]);

  const checkAndScheduleWeather = async () => {
      let lat = currentWeatherLocation?.lat;
      let lng = currentWeatherLocation?.lng;
      let name = currentWeatherLocation?.name || 'Dein Standort';

      if (!lat && weatherFavorites.length > 0) {
          lat = weatherFavorites[0].lat;
          lng = weatherFavorites[0].lng;
          name = weatherFavorites[0].name;
      }

      if (lat && lng) {
          try {
              const data = await fetchWeather(lat, lng);
              if (data) {
                  const pending = await LocalNotifications.getPending();
                  const weatherIds = pending.notifications
                      .filter(n => n.id >= 100 && n.id < 125)
                      .map(n => ({ id: n.id }));
                  
                  if (weatherIds.length > 0) {
                      await LocalNotifications.cancel({ notifications: weatherIds });
                  }

                  const notificationsToSchedule = [];
                  const now = new Date();
                  const currentHour = now.getHours();

                  for (let i = 1; i <= 12; i++) {
                      const targetHourIndex = currentHour + i;
                      const forecastTemp = data.hourly.temperature_2m[targetHourIndex];
                      const forecastCode = data.hourly.weather_code[targetHourIndex];
                      const forecastTimeStr = data.hourly.time[targetHourIndex]; 

                      if (forecastTemp !== undefined && forecastCode !== undefined && forecastTimeStr) {
                          const desc = getWeatherDescription(forecastCode);
                          const temp = Math.round(forecastTemp);
                          
                          let emoji = '☁️';
                          if (forecastCode === 0) emoji = '☀️';
                          else if (forecastCode <= 3) emoji = '⛅';
                          else if (forecastCode >= 45 && forecastCode <= 48) emoji = '🌫️';
                          else if (forecastCode >= 51 && forecastCode <= 67) emoji = '🌧️';
                          else if (forecastCode >= 71) emoji = '❄️';
                          else if (forecastCode >= 95) emoji = '⚡';

                          const scheduleDate = new Date(forecastTimeStr);
                          
                          if (scheduleDate > now) {
                              notificationsToSchedule.push({
                                  id: 100 + i, 
                                  title: `${emoji} Wetter in ${name}`,
                                  body: `${temp}°C und ${desc}.`,
                                  schedule: { at: scheduleDate },
                                  smallIcon: "ic_stat_logo", 
                                  sound: undefined
                              });
                          }
                      }
                  }

                  if (notificationsToSchedule.length > 0) {
                      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
                  }
              }
          } catch (e) {
          }
      }
  };

  // ... (Rest of useEffects and methods remain the same) ...

  useEffect(() => {
      if (!loadingData && family.length > 0 && !currentUser) {
          const storedUserId = localStorage.getItem('fh_session_user');
          if (storedUserId) {
              const foundUser = family.find(f => f.id === storedUserId);
              if (foundUser) {
                  setCurrentUser(foundUser);
              }
          }
      }
  }, [loadingData, family, currentUser]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (liquidGlass) {
        document.body.classList.add('liquid-glass');
    } else {
        document.body.classList.remove('liquid-glass');
    }
  }, [darkMode, liquidGlass]);

  const addNotification = async (title: string, message: string) => {
      const notif: AppNotification = {
          id: Date.now().toString() + Math.random(),
          title,
          message,
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false
      };
      setNotifications(prev => [notif, ...prev]);
      await Backend.notifications.add(notif);

      try {
          await LocalNotifications.schedule({
              notifications: [{
                  title: title,
                  body: message,
                  id: Math.floor(Math.random() * 1000000),
                  schedule: { at: new Date(Date.now() + 100) }, 
                  sound: undefined,
                  attachments: [],
                  actionTypeId: "",
                  extra: null,
                  smallIcon: "ic_stat_logo" 
              }]
          });
      } catch (e) {
      }
  };

  // --- HELPER FOR SCHEDULING CALENDAR NOTIFICATIONS ---
  const scheduleEventNotification = async (event: CalendarEvent) => {
      try {
          const eventDate = new Date(`${event.date}T${event.time}`);
          const now = new Date();
          
          if (eventDate > now) {
              await LocalNotifications.schedule({
                  notifications: [{
                      id: hashCode(event.id), // Unique numeric ID
                      title: 'Termin Erinnerung 📅',
                      body: `${event.title} um ${event.time} Uhr`,
                      schedule: { at: eventDate },
                      smallIcon: "ic_stat_logo",
                      sound: undefined,
                      actionTypeId: "",
                      extra: { route: AppRoute.CALENDAR }
                  }]
              });
          }
      } catch (e) {
          console.error("Failed to schedule notification for event", event.title, e);
      }
  };

  const cancelEventNotification = async (id: string) => {
      try {
          await LocalNotifications.cancel({ notifications: [{ id: hashCode(id) }] });
      } catch (e) {}
  };

  const clearAllNotifications = async () => {
      setNotifications([]);
      const all = await Backend.notifications.getAll();
      if(all.length > 0) {
          await Backend.notifications.setAll([]);
      }
  };

  const addEvent = async (event: CalendarEvent) => {
      setEvents(prev => [...prev, event]);
      await Backend.events.add(event);
      
      // Schedule background notification
      await scheduleEventNotification(event);

      const creatorName = currentUser?.name || 'Jemand';
      await addNotification('Neuer Termin 📅', `${creatorName} hat "${event.title}" am ${new Date(event.date).toLocaleDateString()} erstellt.`);
  };
  
  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      await Backend.events.update(id, updates);
      
      // Reschedule: Cancel old, add new if needed
      await cancelEventNotification(id);
      
      const updatedEvent = events.find(e => e.id === id);
      if (updatedEvent) {
          const finalEvent = { ...updatedEvent, ...updates };
          await scheduleEventNotification(finalEvent);
      }
  };
  
  const deleteEvent = async (id: string) => {
      setEvents(prev => prev.filter(e => e.id !== id));
      await Backend.events.delete(id);
      await cancelEventNotification(id);
  };

  const addNews = async (item: NewsItem) => {
      setNews(prev => [item, ...prev]);
      await Backend.news.add(item);
      
      if (!item.tag?.startsWith('PRIVATE:')) {
          const creatorName = currentUser?.name || 'Jemand';
          await addNotification('Pinnwand 📌', `${creatorName} hat "${item.title}" gepostet.`);
      }
  };
  const updateNews = async (id: string, updates: Partial<NewsItem>) => {
      setNews(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
      await Backend.news.update(id, updates);
  };
  const deleteNews = async (id: string) => {
      setNews(prev => prev.filter(n => n.id !== id));
      await Backend.news.delete(id);
  };
  const markNewsRead = async (id: string) => {
      if (!currentUser) return;
      const item = news.find(n => n.id === id);
      if (item) {
          const newReadBy = [...(item.readBy || []), currentUser.id];
          setNews(prev => prev.map(n => n.id === id ? { ...n, readBy: newReadBy } : n));
          await Backend.news.update(id, { readBy: newReadBy });
      }
  };
  
  const addPoll = async (poll: Poll) => {
      setPolls(prev => [poll, ...prev]);
      await Backend.polls.add(poll);
      const creatorName = currentUser?.name || 'Jemand';
      await addNotification('Neue Umfrage 📊', `${creatorName} fragt: "${poll.question}"`);
  }
  const updatePoll = async (id: string, updates: Partial<Poll>) => {
      setPolls(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      await Backend.polls.update(id, updates);
  }
  const deletePoll = async (id: string) => {
      setPolls(prev => prev.filter(p => p.id !== id));
      await Backend.polls.delete(id);
  }

  const toggleShoppingItem = async (id: string) => {
      const item = shoppingList.find(i => i.id === id);
      if (item) {
          const newItem = { ...item, checked: !item.checked };
          setShoppingList(prev => prev.map(i => i.id === id ? newItem : i));
          await Backend.shopping.update(id, { checked: newItem.checked });
      }
  };
  const addShoppingItem = async (name: string, note?: string, category?: string) => {
      const newItem: ShoppingItem = { id: Date.now().toString(), name, checked: false, note, category };
      setShoppingList(prev => [...prev, newItem]);
      await Backend.shopping.add(newItem);
      await addNotification('Einkaufsliste 🛒', `"${name}" wurde hinzugefügt.`);
  };
  const deleteShoppingItem = async (id: string) => {
      setShoppingList(prev => prev.filter(i => i.id !== id));
      await Backend.shopping.delete(id);
  };
  const addIngredientsToShopping = async (ingredients: string[]) => {
      const newItems = ingredients.map(ing => ({ id: Date.now().toString() + Math.random(), name: ing, checked: false }));
      setShoppingList(prev => [...prev, ...newItems]);
      const fullList = await Backend.shopping.getAll();
      await Backend.shopping.setAll([...fullList, ...newItems]);
      await addNotification('Einkaufsliste 🛒', `${ingredients.length} Zutaten aus Rezept hinzugefügt.`);
  };

  const addHouseholdTask = async (title: string, assignedTo: string, priority: TaskPriority = 'medium', note?: string) => {
      const task: Task = { id: Date.now().toString(), title, done: false, assignedTo, type: 'household', priority, note };
      setHouseholdTasks(prev => [...prev, task]);
      await Backend.householdTasks.add(task);
  };
  const addPersonalTask = async (title: string, priority: TaskPriority = 'medium', note?: string) => {
      const task: Task = { id: Date.now().toString(), title, done: false, type: 'personal', priority, note };
      setPersonalTasks(prev => [...prev, task]);
      await Backend.personalTasks.add(task);
  };
  const toggleTask = async (id: string, type: 'household' | 'personal') => {
      if (type === 'household') {
          const task = householdTasks.find(t => t.id === id);
          if (task) {
              setHouseholdTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
              await Backend.householdTasks.update(id, { done: !task.done });
          }
      } else {
          const task = personalTasks.find(t => t.id === id);
          if (task) {
              setPersonalTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
              await Backend.personalTasks.update(id, { done: !task.done });
          }
      }
  };
  const deleteTask = async (id: string, type: 'household' | 'personal') => {
      if (type === 'household') {
          setHouseholdTasks(prev => prev.filter(t => t.id !== id));
          await Backend.householdTasks.delete(id);
      } else {
          setPersonalTasks(prev => prev.filter(t => t.id !== id));
          await Backend.personalTasks.delete(id);
      }
  };

  const updateMealPlan = async (plan: MealPlan[]) => {
      setMealPlan(plan);
      await Backend.mealPlan.setAll(plan);
  };
  
  const handlePlanGenerated = () => {
      addNotification('Wochenplan erstellt 🍽️', 'Dein neuer Essensplan für die Woche ist fertig!');
  };

  const addMealToPlan = async (day: string, mealName: string, ingredients: string[]) => {
      const existingMeal = mealPlan.find(m => m.day === day);
      const id = existingMeal ? existingMeal.id : Date.now().toString() + Math.random().toString().slice(2,5);

      const filtered = mealPlan.filter(m => m.day !== day);
      const newMeal: MealPlan = { 
          id, 
          day, 
          mealName, 
          ingredients, 
          recipeHint: 'Aus Rezeptlager',
          breakfast: existingMeal?.breakfast || '',
          lunch: existingMeal?.lunch || ''
      };
      const newPlan = [...filtered, newMeal];
      setMealPlan(newPlan);
      await Backend.mealPlan.setAll(newPlan);
  };
  const addMealRequest = async (dishName: string) => {
      if (currentUser) {
          const req: MealRequest = { id: Date.now().toString(), dishName, requestedBy: currentUser.id, createdAt: new Date().toISOString() };
          setMealRequests(prev => [...prev, req]);
          await Backend.mealRequests.add(req);
          const requestName = currentUser.name;
          await addNotification('Essenswunsch 😋', `${requestName} wünscht sich: ${dishName}`);
      }
  };
  const deleteMealRequest = async (id: string) => {
      setMealRequests(prev => prev.filter(r => r.id !== id));
      await Backend.mealRequests.delete(id);
  };
  const addRecipe = async (recipe: Recipe) => {
      setRecipes(prev => [...prev, recipe]);
      await Backend.recipes.add(recipe);
  };
  const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      await Backend.recipes.update(id, updates);
  };
  const deleteRecipe = async (id: string) => {
      setRecipes(prev => prev.filter(r => r.id !== id));
      await Backend.recipes.delete(id);
  };

  const updateFamilyMember = async (id: string, updates: Partial<FamilyMember>) => {
    setFamily(prev => prev.map(member => member.id === id ? { ...member, ...updates } : member));
    if (currentUser && currentUser.id === id) setCurrentUser({ ...currentUser, ...updates });
    await Backend.family.update(id, updates);
  };

  const addUser = async (name: string, role: 'parent' | 'child') => {
      const randomId = Math.floor(Math.random() * 1000);
      const newMember: FamilyMember = {
          id: Date.now().toString(),
          name: name.trim(),
          avatar: `https://picsum.photos/200/200?random=${randomId}`,
          color: role === 'parent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700',
          role: role
      };
      await Backend.family.add(newMember);
      setFamily(prev => [...prev, newMember]);
      return newMember;
  };

  const deleteUser = async (id: string) => {
      if (family.length <= 1) {
          alert("Der letzte Benutzer kann nicht gelöscht werden.");
          return;
      }
      setFamily(prev => prev.filter(f => f.id !== id));
      await Backend.family.delete(id);
  }

  const resetMemberPassword = async (id: string) => {
      const updates = { password: undefined };
      setFamily(prev => prev.map(member => member.id === id ? { ...member, ...updates } : member));
      await Backend.family.update(id, updates);
  };
  
  const addFeedback = async (item: FeedbackItem) => {
      setFeedbacks(prev => [...prev, item]);
      await Backend.feedback.add(item);
      addNotification('Feedback gesendet ✅', 'Danke für dein Feedback!');
  };

  const markFeedbacksRead = async (ids: string[]) => {
      setFeedbacks(prev => prev.map(f => ids.includes(f.id) ? { ...f, read: true } : f));
      for (const id of ids) {
          await Backend.feedback.update(id, { read: true });
      }
  };

  const handleLogout = () => {
    localStorage.removeItem('fh_session_user');
    setCurrentUser(null);
    setCurrentRoute(AppRoute.DASHBOARD);
    setLoginStep('select');
    setLoginUser(null);
    setPasswordInput('');
  };

  const toggleWeatherFavorite = async (location: SavedLocation) => {
      const exists = weatherFavorites.find(f => f.name === location.name);
      if (exists) {
          setWeatherFavorites(prev => prev.filter(f => f.name !== location.name));
          await Backend.weatherFavorites.delete(exists.id);
      } else {
          setWeatherFavorites(prev => [...prev, location]);
          await Backend.weatherFavorites.add(location);
      }
  };

  const handleVoiceAction = (action: VoiceAction) => {
      if (action.type === 'ADD_SHOPPING') {
          if (action.data?.item) {
              addShoppingItem(action.data.item);
          }
      } else if (action.type === 'ADD_TASK') {
          if (action.data?.title) {
              if (action.data.type === 'personal') addPersonalTask(action.data.title);
              else addHouseholdTask(action.data.title, currentUser?.id || family[0].id);
              addNotification('Sprachbefehl 🗣️', `Aufgabe "${action.data.title}" erstellt.`);
          }
      } else if (action.type === 'ADD_EVENT') {
          if (action.data?.title && action.data?.date && action.data?.time) {
              addEvent({
                  id: Date.now().toString(),
                  title: action.data.title,
                  date: action.data.date,
                  time: action.data.time,
                  endTime: action.data.endTime || undefined,
                  assignedTo: [currentUser?.id || '']
              });
          }
      } else if (action.type === 'ADD_MEAL') {
          if (action.data?.dish) {
              addMealRequest(action.data.dish);
          }
      }
  };

  const handleOpenSettings = () => {
      setLastRoute(currentRoute); 
      setCurrentRoute(AppRoute.SETTINGS);
  };

  const handleUserSelect = (member: FamilyMember) => {
      setLoginUser(member);
      setPasswordInput('');
      setLoginError('');
      setShowPassword(false); 
      if (member.password) {
          setLoginStep('enter-pass');
      } else {
          setLoginStep('set-pass');
      }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMemberName.trim()) return;
      setCreatingUser(true);

      try {
          const newMember = await addUser(newMemberName, newMemberRole);
          if (newMember) {
              if (!currentUser) {
                  setCurrentUser(newMember);
                  localStorage.setItem('fh_session_user', newMember.id);
                  requestAppPermissions(); 
              } else {
                  setShowNewUserForm(false);
              }
          }
          setNewMemberName('');
      } catch (err) {
          console.error("Setup failed", err);
      } finally {
          setCreatingUser(false);
      }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!loginUser || !passwordInput.trim()) return;

      if (loginStep === 'set-pass') {
          if (passwordInput.trim().length < 4) {
              setLoginError("Das Passwort muss mindestens 4 Zeichen lang sein.");
              return;
          }
          updateFamilyMember(loginUser.id, { password: passwordInput });
          setCurrentUser({ ...loginUser, password: passwordInput });
          localStorage.setItem('fh_session_user', loginUser.id);
          requestAppPermissions(); 
      } else {
          if (passwordInput === loginUser.password) {
              setCurrentUser(loginUser);
              localStorage.setItem('fh_session_user', loginUser.id);
              requestAppPermissions(); 
          }
          else setLoginError(t('login.wrong_pass', language));
      }
  };

  const handleLogoClick = () => {
      setLogoClickCount(prev => {
          if (prev + 1 >= 5) {
              setShowAdminLogin(true);
              setLoginError('');
              setAdminPasswordInput('');
              setShowAdminPassword(false);
              return 0;
          }
          return prev + 1;
      });
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Try to find the admin user or check against default admin005 if not found in list
      const adminUser = family.find(f => f.role === 'admin');
      
      if (adminPasswordInput === 'admin005') {
          // If we found the user in the list, use that, otherwise use a fallback mock
          const targetUser = adminUser || {
              id: 'admin_user',
              name: 'Administrator',
              avatar: 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff',
              color: 'bg-gray-800 text-white',
              role: 'admin'
          } as FamilyMember;

          setCurrentUser(targetUser);
          localStorage.setItem('fh_session_user', targetUser.id);
          setShowAdminLogin(false);
          setAdminPasswordInput('');
          setLoginError('');
          requestAppPermissions(); 
      } else {
          setLoginError("Zugriff verweigert. Falsches Passwort.");
      }
  };

  if (loadingData) {
      return (
          <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
              <Logo size={80} className="animate-pulse mb-4" />
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="mt-4 text-gray-500 font-medium">Lade Familiendaten...</p>
          </div>
      );
  }

  const getAppBackgroundClass = () => {
      if (liquidGlass) {
          return 'bg-transparent';
      }
      return 'bg-gray-50 dark:bg-gray-900';
  };

  // --- PUBLIC ROUTES (No Login Required) ---
  if (currentRoute === AppRoute.LANDING) {
      return (
          <div className={`min-h-screen ${getAppBackgroundClass()} transition-colors duration-500`}>
              {liquidGlass && <LiquidBackground />}
              <LandingPage />
          </div>
      );
  }

  // --- LOGIN SCREEN ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-6 transition-colors relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="text-center mb-10 animate-fade-in flex flex-col items-center z-10">
           <div className="bg-white dark:bg-gray-800 p-4 rounded-[30px] shadow-xl mb-6 ring-1 ring-black/5 dark:ring-white/10 active:scale-95 transition-transform cursor-pointer select-none" onClick={handleLogoClick}>
               <Logo size={80} />
           </div>
           <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2 tracking-tight">FamilyHub</h1>
           <p className="text-gray-500 dark:text-gray-400 font-medium">{t('login.welcome', language)}</p>
        </div>
        
        {/* ... (Rest of Login UI same as before) ... */}
        {family.length > 0 && !showNewUserForm ? (
            <div className="w-full max-w-md z-10">
                <div className="grid grid-cols-2 gap-4 animate-slide-in">
                  {family
                    .filter(m => m.role !== 'admin') 
                    .sort((a, b) => {
                        if (a.role === 'parent' && b.role !== 'parent') return -1;
                        if (a.role !== 'parent' && b.role === 'parent') return 1;
                        if (a.role === 'parent') {
                             return a.id.localeCompare(b.id);
                        } else {
                             return b.id.localeCompare(a.id);
                        }
                    })
                    .map(member => (
                    <button 
                      key={member.id}
                      onClick={() => handleUserSelect(member)}
                      className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center hover:scale-105 hover:shadow-md active:scale-95 transition-all group relative`}
                    >
                      <div className="relative mb-3">
                          <img src={member.avatar} alt={member.name} className="w-16 h-16 rounded-full object-cover ring-4 ring-gray-50 dark:ring-gray-700 group-hover:ring-blue-50 dark:group-hover:ring-blue-900/50 transition-all" />
                          {member.password && (
                              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 p-1 rounded-full border border-gray-100 dark:border-gray-700 text-gray-400">
                                  <Lock size={12} />
                              </div>
                          )}
                      </div>
                      <span className="font-bold text-base text-gray-800 dark:text-gray-200">{member.name}</span>
                    </button>
                  ))}
                  <button 
                    onClick={() => setShowNewUserForm(true)}
                    className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 group"
                  >
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center mb-3 text-gray-400 group-hover:text-blue-500 transition-colors">
                        <UserPlus size={32} />
                    </div>
                    <span className="font-bold text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">Mitglied hinzufügen</span>
                  </button>
                </div>
            </div>
        ) : (
            // ... (New User Form) ...
            <div className="w-full max-w-xs animate-fade-in z-10 relative">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700">
                    {family.length > 0 && (
                        <button onClick={() => setShowNewUserForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    )}
                    
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                            {family.length === 0 ? "Neu hier?" : "Neues Mitglied"}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {family.length === 0 ? "Erstelle das erste Profil." : "Füge jemanden hinzu."}
                        </p>
                    </div>

                    <form onSubmit={handleCreateMember}>
                        <div className="mb-4">
                            <input 
                                type="text"
                                placeholder="Name (z.B. Mama)"
                                value={newMemberName}
                                onChange={(e) => setNewMemberName(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-400 transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setNewMemberRole('parent')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1 ${newMemberRole === 'parent' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
                            >
                                <span>Elternteil</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewMemberRole('child')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1 ${newMemberRole === 'child' ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-300 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
                            >
                                <span>Kind</span>
                            </button>
                        </div>

                        <button 
                            type="submit"
                            disabled={!newMemberName.trim() || creatingUser}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition disabled:opacity-50 flex justify-center items-center"
                        >
                            {creatingUser ? <Loader2 className="animate-spin" size={20}/> : <span className="flex items-center">Erstellen <ArrowRight size={18} className="ml-2"/></span>}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {(loginStep === 'enter-pass' || loginStep === 'set-pass') && loginUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-xs p-8 relative animate-slide-up ring-1 ring-white/20">
                    <button 
                        onClick={() => { setLoginStep('select'); setLoginUser(null); }}
                        className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-gray-700 rounded-full p-1 transition"
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative">
                            <img src={loginUser.avatar} className="w-20 h-20 rounded-full mb-4 ring-4 ring-white dark:ring-gray-700 shadow-md" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">{t('login.hello', language)} {loginUser.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {loginStep === 'set-pass' ? t('login.create_pass', language) : t('login.enter_pass', language)}
                        </p>
                    </div>

                    <form onSubmit={handlePasswordSubmit}>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                autoFocus
                                value={passwordInput}
                                onChange={(e) => { setPasswordInput(e.target.value); setLoginError(''); }}
                                placeholder={loginStep === 'set-pass' ? t('login.new_pass_placeholder', language) : t('login.pass_placeholder', language)}
                                className={`w-full bg-gray-50 dark:bg-gray-700 border ${loginError ? 'border-red-500 text-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-2xl px-4 py-4 pr-12 text-center text-xl tracking-widest mb-6 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all dark:text-white`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                            {loginError && <div className="absolute -bottom-5 left-0 right-0 text-red-500 text-xs text-center font-bold animate-pulse">{loginError}</div>}
                        </div>
                        
                        <button 
                            type="submit"
                            disabled={!passwordInput.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition disabled:opacity-50 disabled:shadow-none"
                        >
                            {loginStep === 'set-pass' ? t('login.set_pass_btn', language) : t('login.login_btn', language)}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {showAdminLogin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-fade-in">
                <div className="bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl p-8 relative border border-red-500/30 ring-4 ring-red-500/10 animate-slide-up">
                    <button 
                        onClick={() => { setShowAdminLogin(false); setAdminPasswordInput(''); setLoginError(''); setShowAdminPassword(false); }}
                        className="absolute top-4 right-4 text-red-400 hover:text-red-200 bg-red-950/50 rounded-full p-1 transition"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border border-red-500/50">
                            <ShieldAlert size={32} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-black text-red-500 uppercase tracking-widest">System Überschreibung</h3>
                        <p className="text-xs text-red-300 font-mono mt-2 bg-red-950/50 px-2 py-1 rounded">
                            <AlertTriangle size={10} className="inline mr-1"/>
                            ADMINBEREICH: Nur erlaubter Zutritt
                        </p>
                    </div>

                    <form onSubmit={handleAdminLoginSubmit}>
                        <div className="relative mb-6">
                            <input 
                                type={showAdminPassword ? "text" : "password"}
                                autoFocus
                                value={adminPasswordInput}
                                onChange={(e) => { setAdminPasswordInput(e.target.value); setLoginError(''); }}
                                placeholder="Admin Passwort"
                                className={`w-full bg-black/50 border ${loginError ? 'border-red-500' : 'border-red-900'} rounded-xl px-4 py-4 pr-12 text-center text-white placeholder-red-800/50 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono tracking-wider`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowAdminPassword(!showAdminPassword)}
                                className="absolute right-4 top-4 text-red-400 hover:text-red-200"
                            >
                                {showAdminPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                            {loginError && <div className="absolute -bottom-6 left-0 right-0 text-red-500 text-xs text-center font-bold animate-pulse">{loginError}</div>}
                        </div>
                        
                        <button 
                            type="submit"
                            disabled={!adminPasswordInput.trim()}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20 active:scale-95 transition disabled:opacity-50 disabled:shadow-none uppercase tracking-wide text-sm"
                        >
                            Zugriff Gewähren
                        </button>
                    </form>
                </div>
            </div>
        )}

      </div>
    );
  };

  const myOpenTaskCount = householdTasks.filter(t => t.assignedTo === currentUser.id && !t.done).length + personalTasks.filter(t => !t.done).length;
  const regularFamily = family.filter(f => f.role !== 'admin');

  // Provide Context for Notifications
  const contextValue = {
      notifications,
      markAllRead: () => setNotifications(prev => prev.map(n => ({ ...n, read: true }))),
      clearAll: clearAllNotifications
  };

  const renderPage = () => {
    const content = () => {
        switch (currentRoute) {
            case AppRoute.LANDING:
              return <LandingPage />;
            case 'INVALID' as AppRoute:
              return null; // Don't load anything for invalid routes
            case AppRoute.APP:
              // For /app, we show the dashboard or whatever the current state is
              // But if we are on /app specifically, dashboard is the base
              return <Dashboard 
                        family={regularFamily} 
                        currentUser={currentUser} 
                        events={events} 
                        shoppingCount={shoppingList.filter(i => !i.checked).length} 
                        openTaskCount={myOpenTaskCount} 
                        todayMeal={mealPlan[0]} 
                        onNavigate={setCurrentRoute} 
                        onProfileClick={handleOpenSettings}
                        lang={language} 
                        weatherFavorites={weatherFavorites}
                        currentWeatherLocation={currentWeatherLocation}
                        onUpdateWeatherLocation={setCurrentWeatherLocation}
                        news={news}
                        liquidGlass={liquidGlass}
                     />;
            case AppRoute.DASHBOARD:
              return <Dashboard 
                        family={regularFamily} 
                        currentUser={currentUser} 
                        events={events} 
                        shoppingCount={shoppingList.filter(i => !i.checked).length} 
                        openTaskCount={myOpenTaskCount} 
                        todayMeal={mealPlan[0]} 
                        onNavigate={setCurrentRoute} 
                        onProfileClick={handleOpenSettings}
                        lang={language} 
                        weatherFavorites={weatherFavorites}
                        currentWeatherLocation={currentWeatherLocation}
                        onUpdateWeatherLocation={setCurrentWeatherLocation}
                        news={news}
                        liquidGlass={liquidGlass}
                     />;
            case AppRoute.CALENDAR:
              return <CalendarPage 
                        events={events} 
                        news={news} 
                        polls={polls}
                        family={regularFamily} 
                        onAddEvent={addEvent} 
                        onUpdateEvent={updateEvent} 
                        onDeleteEvent={deleteEvent} 
                        onAddNews={addNews} 
                        onUpdateNews={updateNews}
                        onDeleteNews={deleteNews} 
                        onAddPoll={addPoll}
                        onUpdatePoll={updatePoll}
                        onDeletePoll={deletePoll}
                        currentUser={currentUser} 
                        onProfileClick={handleOpenSettings}
                        initialTab="calendar"
                        onMarkNewsRead={markNewsRead}
                        liquidGlass={liquidGlass}
                     />;
            case AppRoute.NEWS: // Added Route for direct Pinnwand access
              return <CalendarPage 
                        events={events} 
                        news={news} 
                        polls={polls}
                        family={regularFamily} 
                        onAddEvent={addEvent} 
                        onUpdateEvent={updateEvent} 
                        onDeleteEvent={deleteEvent} 
                        onAddNews={addNews} 
                        onUpdateNews={updateNews}
                        onDeleteNews={deleteNews} 
                        onAddPoll={addPoll}
                        onUpdatePoll={updatePoll}
                        onDeletePoll={deletePoll}
                        currentUser={currentUser} 
                        onProfileClick={handleOpenSettings}
                        initialTab="news"
                        onMarkNewsRead={markNewsRead}
                        liquidGlass={liquidGlass}
                     />;
            case AppRoute.LISTS:
              return <ListsPage 
                        shoppingItems={shoppingList} 
                        householdTasks={householdTasks} 
                        personalTasks={personalTasks} 
                        recipes={recipes} 
                        family={regularFamily} 
                        currentUser={currentUser} 
                        onToggleShopping={toggleShoppingItem} 
                        onAddShopping={addShoppingItem} 
                        onDeleteShopping={deleteShoppingItem} 
                        onAddHousehold={addHouseholdTask} 
                        onToggleTask={toggleTask} 
                        onAddPersonal={addPersonalTask} 
                        onDeleteTask={deleteTask} 
                        onAddRecipe={addRecipe} 
                        onDeleteRecipe={deleteRecipe} 
                        onUpdateRecipe={updateRecipe}
                        onAddIngredientsToShopping={addIngredientsToShopping} 
                        onAddMealToPlan={addMealToPlan} 
                        onProfileClick={handleOpenSettings}
                        liquidGlass={liquidGlass}
                     />;
            case AppRoute.MEALS:
              return <MealsPage 
                        plan={mealPlan} 
                        requests={mealRequests} 
                        family={regularFamily} 
                        currentUser={currentUser} 
                        onUpdatePlan={updateMealPlan} 
                        onAddRequest={addMealRequest} 
                        onDeleteRequest={deleteMealRequest} 
                        onAddIngredientsToShopping={addIngredientsToShopping} 
                        onProfileClick={handleOpenSettings}
                        recipes={recipes}
                        onAddRecipe={addRecipe}
                        onPlanGenerated={handlePlanGenerated}
                        liquidGlass={liquidGlass}
                     />;
            case AppRoute.ACTIVITIES:
              return <ActivitiesPage 
                        onProfileClick={handleOpenSettings} 
                        currentLocation={currentWeatherLocation}
                     />;
            case AppRoute.WEATHER:
              return <WeatherPage 
                        onBack={() => setCurrentRoute(AppRoute.DASHBOARD)} 
                        favorites={weatherFavorites} 
                        onToggleFavorite={toggleWeatherFavorite} 
                        initialLocation={currentWeatherLocation} 
                        liquidGlass={liquidGlass}
                     />;
            case AppRoute.SETTINGS:
              return <SettingsPage 
                        currentUser={currentUser} 
                        onUpdateUser={(updates) => updateFamilyMember(currentUser.id, updates)} 
                        onUpdateFamilyMember={updateFamilyMember}
                        onLogout={handleLogout} 
                        onClose={() => setCurrentRoute(lastRoute)}
                        darkMode={darkMode} 
                        onToggleDarkMode={() => setDarkMode(!darkMode)} 
                        liquidGlass={liquidGlass}
                        onToggleLiquidGlass={() => setLiquidGlass(!liquidGlass)}
                        lang={language} 
                        setLang={() => {}} 
                        family={family} 
                        onResetPassword={resetMemberPassword} 
                        onSendFeedback={addFeedback} 
                        allFeedbacks={feedbacks} 
                        onMarkFeedbackRead={markFeedbacksRead}
                        onAddNews={addNews}
                        news={news}
                        onDeleteNews={deleteNews}
                        onAddUser={addUser}
                        onDeleteUser={deleteUser}
                        onMarkNewsRead={markNewsRead}
                     />;
            default:
              return null;
          }
    };

    return (
        <div key={currentRoute} className="page-transition-wrapper">
            {content()}
        </div>
    );
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {/* Global Liquid Background Blobs (Only visible when class present on body) */}
      {liquidGlass && <LiquidBackground />}

      {/* Global Liquid Lens Effect Overlay (Scanner) */}
      {liquidGlass && <LiquidLensOverlay />}

      {/* 
          Main App Container
          Added extra bottom padding to account for navigation bar 
          and prevent list items from being hidden behind it.
      */}
      <div 
        className={`min-h-screen transition-all duration-500 overflow-x-hidden ${currentRoute === AppRoute.WEATHER ? '' : 'pb-24'} ${getAppBackgroundClass()}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Hide Navigation on Landing Page */}
        {renderPage()}
        {currentRoute !== AppRoute.LANDING && (
          <Navigation 
              currentRoute={currentRoute} 
              onNavigate={setCurrentRoute} 
              lang={language} 
              liquidGlass={liquidGlass}
          />
        )}
      </div>
    </NotificationContext.Provider>
  );
};

export default App;