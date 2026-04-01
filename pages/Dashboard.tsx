import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import { FamilyMember, CalendarEvent, MealPlan, AppRoute, SavedLocation, NewsItem } from '../types';
import { Clock, ClipboardList, Utensils, ChevronRight, Sun, CheckCircle, CloudRain, Search, MapPin, Loader2, Info, X, Check, ArrowRight, Cloud, CloudFog, CloudSnow, CloudLightning, Moon, ShoppingCart, Calendar } from 'lucide-react';
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
  const [selectedNewsStep, setSelectedNewsStep] = useState<'preview' | 'article' | null>(null);
  const today = new Date().toISOString().split('T')[0];

  // Filter public news only (keine privaten Nachrichten)
  const publicNews = useMemo(() => news.filter(n => !n.tag?.startsWith('PRIVATE:')), [news]);
  const unreadNews = useMemo(() => publicNews.filter(n => !(n.readBy || []).includes(currentUser.id)), [publicNews, currentUser.id]);

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

  const getWeatherGradient = (code: number, day: number) => {
    if (!day) return 'from-slate-800 to-indigo-950';
    if (code === 0) return 'from-blue-500 via-blue-600 to-indigo-700';
    if (code >= 1 && code <= 3) return 'from-blue-400 to-slate-400';
    if (code >= 51) return 'from-slate-600 to-gray-700';
    return 'from-blue-500 to-cyan-600';
  };

  const getGreetingData = () => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 11) return { main: "Guten Morgen", sub: "Bereit für den Tag?" };
    if (hours >= 11 && hours < 14) return { main: "Schönen Mittag", sub: "Was gibt's zu essen?" };
    if (hours >= 14 && hours < 17) return { main: "Guten Nachmittag", sub: "Zeit für eine Pause?" };
    if (hours >= 17 && hours < 22) return { main: "Guten Abend", sub: "Entspann dich schön." };
    return { main: "Gute Nacht", sub: "Träum was Schönes." };
  };

  const greeting = getGreetingData();

  const getBtnClass = (isActive: boolean) => isActive ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header 
        title={t('dashboard.title', lang)} 
        currentUser={currentUser} 
        onProfileClick={onProfileClick} 
      />
      <main className="p-5 space-y-5 max-w-2xl mx-auto">

        {/* 1. Greeting Card (Enhanced Dynamic Gradient) */}
        <div className={`bg-gradient-to-br ${getWeatherGradient(weatherCode, isDay)} rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden active:scale-[0.98] transition-transform`}>
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold tracking-tight mb-2">{greeting.main}</h2>
            <p className="text-blue-100/90 text-lg font-medium italic">{greeting.sub} {currentUser.name}</p>
          </div>
          <div className="absolute top-1/2 -right-4 -translate-y-1/2 opacity-20 transform rotate-12">
            <Cloud size={120} strokeWidth={1} />
          </div>
          {/* Subtle Decorative Shapes */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* 2. Weather Widget (Reverted to v2.0.6 Style) */}
        <button
          onClick={() => onNavigate(AppRoute.WEATHER)}
          className="w-full bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group active:scale-[0.98] outline-none"
        >
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner">
               <CloudRain size={36} strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <span className="text-5xl font-black text-slate-800 dark:text-white block leading-tight tracking-tighter">
                {weatherError ? '--' : currentTemp}
              </span>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mt-0.5">
                {locationName ? `${locationName} • ` : ''} {weatherDesc}
              </p>
            </div>
          </div>
          <div className="flex items-center text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
            DETAILS <ChevronRight size={14} className="ml-1" />
          </div>
          {weatherLoading && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
               <div className="h-full bg-blue-500 animate-loading-bar w-1/3"></div>
            </div>
          )}
        </button>

        {/* Dashboard News (Optional Feature) */}
        {unreadNews.length > 0 && (
          <div className="animate-fade-in pt-2">
             <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Pinwand-Highlights</h3>
             </div>
             <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1">
                {unreadNews.map(n => (
                  <button key={n.id} onClick={() => { setSelectedNews(n); setSelectedNewsStep('preview'); }} className="flex-shrink-0 w-64 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden text-left hover:scale-[1.02] transition-all">
                      {n.image && <img src={n.image} className="w-full h-32 object-cover" />}
                      <div className="p-5">
                          <span className="text-[10px] uppercase font-black text-blue-500 mb-2 block tracking-widest">Wichtig</span>
                          <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1 text-lg leading-tight">{n.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{n.description}</p>
                      </div>
                  </button>
                ))}
             </div>
          </div>
        )}

        {/* 3. Action Grid (2 columns) */}
        <div className="grid grid-cols-2 gap-5">
          <button onClick={() => onNavigate(AppRoute.LISTS)} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-start transition hover:bg-slate-50 dark:hover:bg-slate-800/50 group active:scale-95">
             <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
               <ShoppingCart className="text-orange-500" size={24} />
             </div>
             <h4 className="font-bold text-slate-800 dark:text-white text-base">Einkaufsliste</h4>
             <p className="text-[12px] text-slate-400 mt-1">{shoppingCount === 0 ? 'Alles erledigt' : `${shoppingCount} Artikel`}</p>
          </button>

          <button onClick={() => onNavigate(AppRoute.MEALS)} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-start transition hover:bg-slate-50 dark:hover:bg-slate-800/50 group active:scale-95">
             <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
               <Utensils className="text-green-500" size={24} />
             </div>
             <h4 className="font-bold text-slate-800 dark:text-white text-base line-clamp-1 w-full text-left">{todayMeal ? todayMeal.mealName : 'Nichts geplant'}</h4>
             <p className="text-[12px] text-slate-400 mt-1">Heute essen</p>
          </button>
        </div>

        {/* 4. Tasks Row (Full Width) */}
        <button onClick={() => onNavigate(AppRoute.LISTS)} className="w-full bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-all active:scale-95">
           <div className="flex items-center space-x-5">
             <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl group-hover:rotate-12 transition-transform">
               <CheckCircle className="text-purple-500" size={28} />
             </div>
             <div className="text-left">
               <h4 className="font-black text-slate-800 dark:text-white text-lg">Meine Aufgaben</h4>
               <p className="text-sm text-slate-400 mt-1">{openTaskCount === 0 ? 'Alles erledigt! 🎉' : `${openTaskCount} Aufgaben offen`}</p>
             </div>
           </div>
           <ArrowRight className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform" size={20} />
        </button>

        {/* 5. Timeline Widget */}
        <div className="pt-4">
           <div className="flex justify-between items-center mb-6 px-1">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Termine heute</h3>
              <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                <button onClick={() => setCalendarView('family')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition ${getBtnClass(calendarView === 'family')}`}>ALLE</button>
                <button onClick={() => setCalendarView('private')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition ${getBtnClass(calendarView === 'private')}`}>MEINE</button>
              </div>
           </div>
           <div className="space-y-4">
              {sortedEvents.length > 0 ? sortedEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onNavigate(AppRoute.CALENDAR)}
                  className="w-full text-left p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center border-l-8 border-l-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all active:scale-[0.99]"
                >
                   <div className="flex-1">
                      <h4 className="font-bold text-slate-800 dark:text-white text-lg">{event.title}</h4>
                      <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
                         <Clock size={14} className="mr-1.5 text-blue-500" /> {event.time} {event.location && `• ${event.location}`}
                      </div>
                   </div>
                   <ArrowRight className="text-slate-200" size={18}/>
                </button>
              )) : (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 opacity-40">
                   <Calendar size={48} strokeWidth={1} className="text-slate-400" />
                   <p className="text-center text-slate-500 text-lg font-medium">Keine Termine für heute.</p>
                </div>
              )}
           </div>
        </div>
      </main>

      {/* News Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-5">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-scale-in">
                <div className="relative h-64 bg-slate-100 dark:bg-slate-800">
                    {selectedNews.image ? (
                      <img 
                        src={selectedNews.image} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=600';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white/20">
                        <Info size={80} />
                      </div>
                    )}
                    <button onClick={() => { setSelectedNews(null); setSelectedNewsStep(null); }} className="absolute top-6 right-6 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors backdrop-blur-md">
                      <X size={20}/>
                    </button>
                </div>
                <div className="p-8">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-black rounded-full uppercase tracking-widest">News Update</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{selectedNews.title}</h2>
                    {selectedNewsStep === 'preview' && (
                        <>
                            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-8 max-h-24 overflow-hidden">{selectedNews.description.substring(0, 180)}{selectedNews.description.length > 180 ? '…' : ''}</p>
                            <button onClick={() => setSelectedNewsStep('article')} className="w-full bg-indigo-600 text-white font-black py-3 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all mb-4">Mehr lesen</button>
                        </>
                    )}
                    {selectedNewsStep === 'article' && (
                        <>
                            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-8 max-h-64 overflow-y-auto pr-2 custom-scrollbar">{selectedNews.description}</p>
                            <button onClick={async () => { if (onMarkNewsRead) await onMarkNewsRead(selectedNews.id); setSelectedNews(null); setSelectedNewsStep(null); }} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-green-700 active:scale-95 transition-all text-sm uppercase tracking-widest">
                                <Check size={22} /> ALS GELESEN MARKIEREN
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
