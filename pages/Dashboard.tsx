import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { FamilyMember, CalendarEvent, MealPlan, AppRoute, SavedLocation, NewsItem } from '../types';
import { Clock, ClipboardList, Utensils, ChevronRight, Sun, CheckCircle, CloudRain, Search, MapPin, Loader2, Info, X, Check, ArrowRight } from 'lucide-react';
import { fetchWeather, getWeatherDescription } from '../services/weather';
import { t, Language } from '../services/translations';

interface DashboardProps {
  family: FamilyMember[];
  currentUser: FamilyMember;
  events: CalendarEvent[];
  shoppingCount: number;
  openTaskCount?: number;
  todayMeal?: MealPlan;
  onNavigate: (route: AppRoute) => void;
  onProfileClick: () => void;
  lang: Language;
  weatherFavorites?: SavedLocation[];
  currentWeatherLocation: { lat: number, lng: number, name: string } | null;
  onUpdateWeatherLocation: (loc: { lat: number, lng: number, name: string }) => void;
  news: NewsItem[];
  onMarkNewsRead?: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  family, currentUser, events, shoppingCount, openTaskCount = 0, todayMeal, onNavigate, onProfileClick, lang, weatherFavorites = [],
  currentWeatherLocation, onUpdateWeatherLocation, news, onMarkNewsRead
}) => {
  const [calendarView, setCalendarView] = useState<'family' | 'private'>('family');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const today = new Date().toISOString().split('T')[0];

  // Filter unread news
  const unreadNews = news.filter(n => !n.readBy?.includes(currentUser.id));

  // Filter events based on view mode
  const filteredEvents = events.filter(e => {
    const isToday = e.date === today;
    if (!isToday) return false;
    if (calendarView === 'private') {
      return e.assignedTo.includes(currentUser.id);
    }
    return true;
  });

  const sortedEvents = filteredEvents.sort((a, b) => a.time.localeCompare(b.time));

  // Weather State
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<boolean>(false);
  const [currentTemp, setCurrentTemp] = useState<string>('--');
  const [weatherDesc, setWeatherDesc] = useState<string>(t('dashboard.loading', lang));
  const [weatherCode, setWeatherCode] = useState<number>(0);
  const [isDay, setIsDay] = useState<number>(1);
  const [locationName, setLocationName] = useState<string>('');

  const loadWeatherData = async (lat: number, lng: number, name?: string) => {
    setWeatherLoading(true);
    setWeatherError(false);
    try {
      const data = await fetchWeather(lat, lng);
      if (data) {
        setCurrentTemp(`${Math.round(data.current.temperature_2m)}°`);
        setWeatherDesc(getWeatherDescription(data.current.weather_code));
        setWeatherCode(data.current.weather_code);
        setIsDay(data.current.is_day);
        setLocationName(name || '');
      } else {
        setWeatherError(true);
      }
    } catch (e) {
      setWeatherError(true);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    setWeatherDesc(t('dashboard.loading', lang));
    if (currentWeatherLocation) {
      loadWeatherData(currentWeatherLocation.lat, currentWeatherLocation.lng, currentWeatherLocation.name);
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'Aktueller Standort' };
          loadWeatherData(loc.lat, loc.lng, loc.name);
          onUpdateWeatherLocation(loc);
        },
        () => {
          setWeatherError(true);
          setWeatherLoading(false);
        },
        { timeout: 5000 }
      );
    } else {
       setWeatherError(true);
       setWeatherLoading(false);
    }
  }, [lang]);

  const getWeatherIcon = (code: number, day: number) => {
    if (code === 0) return day ? <Sun className="text-yellow-300" size={48} /> : <span>🌙</span>;
    if (code >= 1 && code <= 3) return <span>☁️</span>;
    if (code >= 51) return <CloudRain className="text-blue-300" size={48} />;
    return <Sun className="text-yellow-300" size={48} />;
  };

  const getWeatherGradient = (code: number, day: number) => {
    if (!day) return 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900';
    if (code === 0) return 'bg-gradient-to-br from-blue-500 to-sky-400';
    return 'bg-gradient-to-br from-blue-400 to-indigo-500';
  };

  const getGreetingData = () => {
    const hours = new Date().getHours();
    if (hours < 11) return { main: "Guten Morgen", sub: `Hab einen tollen Start, ${currentUser.name}!` };
    if (hours < 18) return { main: "Hallo", sub: `Schön dich zu sehen, ${currentUser.name}.` };
    return { main: "Guten Abend", sub: `Zeit zum Entspannen, ${currentUser.name}.` };
  };

  const greeting = getGreetingData();

  return (
    <>
      <Header title="Übersicht" currentUser={currentUser} onProfileClick={onProfileClick} />
      <main className="p-4 space-y-6 pb-24">

        {/* Dynamic Greeting Section */}
        <div className={`${getWeatherGradient(weatherCode, isDay)} rounded-3xl p-6 text-white shadow-xl relative overflow-hidden`}>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black">{greeting.main}</h2>
              <p className="text-sm opacity-90 mt-1">{greeting.sub}</p>
              <div className="mt-4 inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm">
                <MapPin size={12} className="mr-1" /> {locationName || 'Ort suchen...'} • {currentTemp}
              </div>
            </div>
            <div className="text-5xl">{getWeatherIcon(weatherCode, isDay)}</div>
          </div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* News Highlights */}
        {unreadNews.length > 0 && (
          <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-gray-800 dark:text-white">Neuigkeiten</h3>
                <button onClick={() => onNavigate(AppRoute.NEWS)} className="text-blue-500 text-xs font-bold">PINNWAND <ChevronRight size={14} className="inline"/></button>
             </div>
             <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                {unreadNews.map(n => (
                  <button key={n.id} onClick={() => setSelectedNews(n)} className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden text-left hover:scale-[1.02] transition-all">
                      {n.image && <img src={n.image} className="w-full h-32 object-cover" />}
                      <div className="p-4">
                          <span className="text-[10px] uppercase font-black text-blue-500 mb-1 block">WICHTIG</span>
                          <h4 className="font-bold text-gray-800 dark:text-white line-clamp-1">{n.title}</h4>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1">{n.description}</p>
                      </div>
                  </button>
                ))}
             </div>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => onNavigate(AppRoute.LISTS)} className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm text-left flex flex-col justify-between">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl w-fit mb-4"><ClipboardList size={24}/></div>
            <div>
              <span className="block font-black text-gray-800 dark:text-white">Einkaufen</span>
              <span className="text-xs text-gray-400 font-bold">{shoppingCount} Artikel</span>
            </div>
          </button>
          <button onClick={() => onNavigate(AppRoute.MEALS)} className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm text-left flex flex-col justify-between">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl w-fit mb-4"><Utensils size={24}/></div>
            <div>
              <span className="block font-black text-gray-800 dark:text-white truncate">{todayMeal?.mealName || 'Kein Plan'}</span>
              <span className="text-xs text-gray-400 font-bold">Essensplan</span>
            </div>
          </button>
        </div>

        {/* Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-gray-800 dark:text-white">Heutige Termine</h3>
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
              <button onClick={() => setCalendarView('family')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition ${calendarView === 'family' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-400'}`}>ALLE</button>
              <button onClick={() => setCalendarView('private')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition ${calendarView === 'private' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-400'}`}>ICH</button>
            </div>
          </div>
          <div className="space-y-4">
            {sortedEvents.length > 0 ? sortedEvents.map(event => (
              <div key={event.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/10" />
                      <div className="w-0.5 flex-1 bg-gray-100 dark:bg-gray-700 my-1" />
                  </div>
                  <div className="flex-1 pb-4">
                      <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-800 dark:text-white">{event.title}</h4>
                          <span className="text-xs font-black text-gray-400">{event.time}</span>
                      </div>
                      {event.location && <p className="text-xs text-gray-400 mt-0.5 flex items-center"><MapPin size={10} className="mr-1"/>{event.location}</p>}
                  </div>
              </div>
            )) : <p className="text-center text-gray-400 italic py-4">Keine Termine für heute.</p>}
          </div>
          <button onClick={() => onNavigate(AppRoute.CALENDAR)} className="w-full mt-2 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl text-blue-500 text-xs font-black hover:bg-blue-50 transition-all flex items-center justify-center gap-2">KALENDER ÖFFNEN <ArrowRight size={14}/></button>
        </div>
      </main>

      {/* News Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-scale-in">
                <div className="relative h-64">
                    {selectedNews.image ? <img src={selectedNews.image} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white"><Info size={64} opacity={0.2}/></div>}
                    <button onClick={() => setSelectedNews(null)} className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all"><X size={20}/></button>
                </div>
                <div className="p-8">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-full uppercase tracking-widest">News Update</span>
                        <span className="text-gray-400 text-[10px] font-bold">{new Date(selectedNews.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 leading-tight">{selectedNews.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8 scrollbar-hide max-h-48 overflow-y-auto">{selectedNews.description}</p>
                    
                    <button 
                        onClick={() => {
                            if (onMarkNewsRead) onMarkNewsRead(selectedNews.id);
                            setSelectedNews(null);
                        }}
                        className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Check size={20} /> ALS GELESEN MARKIEREN
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;