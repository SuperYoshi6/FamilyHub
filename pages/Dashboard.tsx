import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import SlidingTabs from '../components/SlidingTabs';
import { FamilyMember, CalendarEvent, MealPlan, AppRoute, SavedLocation, NewsItem } from '../types';
import { Clock, ClipboardList, Utensils, ChevronRight, Sun, CheckCircle, CloudRain, Search, MapPin, Loader2, Info, X, Check, ArrowRight, Cloud, CloudFog, CloudSnow, CloudLightning, Moon, ShoppingCart, Calendar, Users, User, CloudSun } from 'lucide-react';
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
  liquidGlass?: boolean;
  summerMode?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
  family, currentUser, events, shoppingCount, openTaskCount = 0, todayMeal, onNavigate, onProfileClick, lang, weatherFavorites = [],
  currentWeatherLocation, onUpdateWeatherLocation, news, onMarkNewsRead, liquidGlass, summerMode
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
  const [apparentTemp, setApparentTemp] = useState<string>('--');
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
        setApparentTemp(`${Math.round(data.current.apparent_temperature)}°`);
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
        async (pos) => {
          const { resolveLocationName } = await import('../services/weather');
          const name = await resolveLocationName(pos.coords.latitude, pos.coords.longitude);
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, name };
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

  const getWeatherGradient = (code: number, _day: number) => {
    const hours = new Date().getHours();
    const isNight = hours >= 21 || hours < 6 || _day === 0;
    if (isNight) return 'from-slate-900 via-indigo-950 to-blue-950';
    if (code === 0) return 'from-blue-500 via-blue-600 to-indigo-700';
    if (code >= 1 && code <= 3) return 'from-blue-400 to-slate-400';
    if (code >= 51) return 'from-slate-600 to-gray-700';
    return 'from-blue-500 to-cyan-600';
  };

  /** Dynamisches Wetter-Icon basierend auf WMO Weather Code */
  const getWeatherIcon = (code: number, day: number, iconSize: number) => {
    if (code === 0) return day ? <Sun size={iconSize} strokeWidth={2.5} className="text-amber-400" /> : <Moon size={iconSize} strokeWidth={2.5} className="text-indigo-300" />;
    if (code >= 1 && code <= 3) return <CloudSun size={iconSize} strokeWidth={2.5} className="text-amber-400 dark:text-amber-300" />;
    if (code >= 45 && code <= 48) return <CloudFog size={iconSize} strokeWidth={2.5} className="text-gray-400" />;
    if (code >= 51 && code <= 67) return <CloudRain size={iconSize} strokeWidth={2.5} className="text-blue-400" />;
    if (code >= 80 && code <= 82) return <CloudRain size={iconSize} strokeWidth={2.5} className="text-blue-500" />;
    if (code >= 71 && code <= 77) return <CloudSnow size={iconSize} strokeWidth={2.5} className="text-sky-300" />;
    if (code >= 85 && code <= 86) return <CloudSnow size={iconSize} strokeWidth={2.5} className="text-sky-300" />;
    if (code >= 95) return <CloudLightning size={iconSize} strokeWidth={2.5} className="text-amber-500" />;
    return <Cloud size={iconSize} strokeWidth={2.5} className="text-blue-400" />;
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header
        title={t('dashboard.title', lang)}
        currentUser={currentUser}
        onProfileClick={onProfileClick}
        liquidGlass={liquidGlass}
        summerMode={summerMode}
      />
      <main className="px-4 lg:px-8 py-6 space-y-8 max-w-7xl mx-auto">

        {/* Top Section: Greeting & Weather side-by-side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* 1. Greeting Card (Enhanced Dynamic Gradient) */}
          <div className={`lg:col-span-3 bg-gradient-to-br ${getWeatherGradient(weatherCode, isDay)} rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden active:scale-[0.98] transition-transform ${liquidGlass ? 'liquid-shimmer-card' : ''}`}>
            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-3">{greeting.main}</h2>
              <p className="text-blue-100/90 text-xl font-medium italic">{greeting.sub} {currentUser.name}</p>
            </div>
            <div className="absolute top-1/2 -right-8 -translate-y-1/2 transform rotate-12" style={{ opacity: liquidGlass ? 0.35 : 0.2 }}>
              {(() => {
                const hours = new Date().getHours();
                const isNight = hours >= 21 || hours < 6;
                const props = { size: 200, strokeWidth: 0.5, className: "text-white drop-shadow-lg" };
                if (isNight) return <Moon {...props} />;
                if (weatherCode === 0) return <Sun {...props} />;
                if (weatherCode >= 1 && weatherCode <= 3) return <Cloud {...props} />;
                if (weatherCode >= 45 && weatherCode <= 48) return <CloudFog {...props} />;
                if (weatherCode >= 51 && weatherCode <= 67) return <CloudRain {...props} />;
                if (weatherCode >= 80 && weatherCode <= 82) return <CloudRain {...props} />;
                if (weatherCode >= 71 && weatherCode <= 77) return <CloudSnow {...props} />;
                if (weatherCode >= 85 && weatherCode <= 86) return <CloudSnow {...props} />;
                if (weatherCode >= 95) return <CloudLightning {...props} />;
                return <Cloud {...props} />;
              })()}
            </div>
            {/* Subtle Decorative Shapes */}
            <div className="absolute -top-10 -left-10 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          {/* 2. Weather Widget */}
          <button
            onClick={() => onNavigate(AppRoute.WEATHER)}
            className={`lg:col-span-2 w-full relative ${liquidGlass ? 'liquid-shimmer-card rounded-[2.5rem] border-transparent' : 'bg-white dark:bg-slate-900 rounded-[2.5rem] border-slate-100 dark:border-slate-800 shadow-sm'} p-10 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group active:scale-[0.98] outline-none overflow-hidden`}
          >
            <div className="flex items-center justify-between w-full mb-4">
               <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center shadow-inner">
                {getWeatherIcon(weatherCode, isDay, 48)}
              </div>
              <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs font-black tracking-widest bg-blue-50 dark:bg-blue-900/30 px-5 py-2.5 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all uppercase">
                Details <ChevronRight size={16} className="ml-2" />
              </div>
            </div>

            <div className="text-left mt-2">
              <span className="text-6xl font-black text-slate-800 dark:text-white block leading-tight tracking-tighter">
                {weatherError ? '--' : currentTemp}
              </span>
              <p className="text-base text-slate-400 dark:text-slate-500 font-black tracking-widest mt-1">
                {locationName ? `${locationName} • ` : ''} {weatherDesc}
              </p>
            </div>

            {weatherLoading && (
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-500 animate-loading-bar w-1/3"></div>
              </div>
            )}
          </button>
        </div>

        {/* Dashboard News (Optional Feature) */}
        {unreadNews.length > 0 && (
          <div className="animate-fade-in pt-4">
            <div className="flex justify-between items-center mb-6 px-1">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Pinwand-Highlights</h3>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar -mx-1 px-1">
              {unreadNews.map(n => (
                <button key={n.id} onClick={() => { setSelectedNews(n); setSelectedNewsStep('preview'); }} className={`flex-shrink-0 w-80 ${liquidGlass ? 'liquid-shimmer-card rounded-[2.5rem] pb-1' : 'bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800'} overflow-hidden text-left hover:scale-[1.03] transition-all shadow-md`}>
                  {n.image && <img src={n.image} className="w-full h-44 object-cover" />}
                  <div className="p-6">
                    <span className="text-xs font-black text-blue-500 mb-3 block tracking-widest uppercase">Neuigkeit</span>
                    <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1 text-xl leading-tight">{n.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">{n.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Grid & Tasks in 3-column layout on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button onClick={() => onNavigate(AppRoute.LISTS)} className={`${liquidGlass ? 'liquid-shimmer-card rounded-[2.5rem]' : 'bg-white dark:bg-slate-900 rounded-[2.5rem]'} p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-start transition hover:bg-slate-50 dark:hover:bg-slate-800/50 group active:scale-95 shadow-md`}>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-3xl mb-6 group-hover:scale-110 transition-transform">
              <ShoppingCart className="text-orange-500" size={32} />
            </div>
            <h4 className="font-black text-slate-800 dark:text-white text-xl">Einkaufsliste</h4>
            <p className="text-sm text-slate-400 font-medium mt-2">{shoppingCount === 0 ? 'Alles erledigt' : `${shoppingCount} Artikel auf der Liste`}</p>
          </button>

          <button onClick={() => onNavigate(AppRoute.MEALS)} className={`${liquidGlass ? 'liquid-shimmer-card rounded-[2.5rem]' : 'bg-white dark:bg-slate-900 rounded-[2.5rem]'} p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-start transition hover:bg-slate-50 dark:hover:bg-slate-800/50 group active:scale-95 shadow-md`}>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-3xl mb-6 group-hover:scale-110 transition-transform">
              <Utensils className="text-green-500" size={32} />
            </div>
            <h4 className="font-black text-slate-800 dark:text-white text-xl line-clamp-1 w-full text-left">{todayMeal ? todayMeal.mealName : 'Was gibt\'s heute?'}</h4>
            <p className="text-sm text-slate-400 font-medium mt-2">{todayMeal ? 'Heute auf dem Speiseplan' : 'Noch nichts geplant'}</p>
          </button>

          <button onClick={() => onNavigate(AppRoute.LISTS)} className={`md:col-span-2 lg:col-span-1 w-full ${liquidGlass ? 'liquid-shimmer-card rounded-[2.5rem]' : 'bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm'} p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-all active:scale-95 shadow-md`}>
            <div className="flex items-center space-x-6">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-3xl group-hover:rotate-12 transition-transform">
                <CheckCircle className="text-purple-500" size={36} />
              </div>
              <div className="text-left">
                <h4 className="font-black text-slate-800 dark:text-white text-2xl">Aufgaben</h4>
                <p className="text-base text-slate-400 font-medium mt-1">{openTaskCount === 0 ? 'Alles erledigt! 🎉' : `${openTaskCount} Aufgaben offen`}</p>
              </div>
            </div>
            <ArrowRight className="text-slate-300 dark:text-slate-600 group-hover:translate-x-2 transition-transform" size={24} />
          </button>
        </div>

        {/* 5. Timeline Widget */}
        <div className="pt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-1">
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Termine heute</h3>
            <div className="w-full md:w-64">
                <SlidingTabs
                tabs={[
                    { id: 'family', label: 'Alle Termine', icon: Users },
                    { id: 'private', label: 'Nur Meine', icon: User }
                ]}
                activeTabId={calendarView}
                onTabChange={(id) => setCalendarView(id as 'family' | 'private')}
                liquidGlass={liquidGlass}
                colorScheme={summerMode ? 'amber' : 'blue'}
                className="w-full"
                />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedEvents.length > 0 ? sortedEvents.map(event => (
              <button
                key={event.id}
                onClick={() => onNavigate(AppRoute.CALENDAR)}
                className={`w-full text-left p-6 rounded-[2.5rem] border ${liquidGlass ? 'liquid-shimmer-card border-white/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'} flex items-center border-l-8 ${summerMode ? 'border-l-amber-500' : 'border-l-blue-500'} hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all active:scale-[0.98] shadow-md`}
              >
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xl mb-2">{event.title}</h4>
                  <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm font-bold tracking-wide">
                    <Clock size={16} className={`mr-2 ${summerMode ? 'text-amber-500' : 'text-blue-500'}`} />
                    {event.time?.slice(0, 5)}
                    {event.location && (
                        <>
                            <span className="mx-2 opacity-30">•</span>
                            <span className="truncate">{event.location}</span>
                        </>
                    )}
                  </div>
                </div>
                <ArrowRight className="text-slate-200 group-hover:text-blue-500 transition-colors" size={20} />
              </button>
            )) : (
              <div className="col-span-full py-16 flex flex-col items-center justify-center space-y-4 opacity-40">
                <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <Calendar size={64} strokeWidth={1} className="text-slate-400" />
                </div>
                <p className="text-center text-slate-500 text-xl font-bold">Keine Termine für heute.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* News Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-5">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-2xl animate-scale-in">
            <div className="relative h-80 bg-slate-100 dark:bg-slate-800">
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
                  <Info size={100} />
                </div>
              )}
              <button onClick={() => { setSelectedNews(null); setSelectedNewsStep(null); }} className="absolute top-8 right-8 p-3 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors backdrop-blur-md">
                <X size={24} />
              </button>
            </div>
            <div className="p-10">
              <div className="flex items-center gap-2 mb-6">
                <span className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-black rounded-full tracking-widest uppercase">Update</span>
              </div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">{selectedNews.title}</h2>
              {selectedNewsStep === 'preview' && (
                <>
                  <p className="text-slate-600 dark:text-slate-400 text-xl leading-relaxed mb-10 max-h-32 overflow-hidden">{selectedNews.description.substring(0, 220)}{selectedNews.description.length > 220 ? '…' : ''}</p>
                  <button onClick={() => setSelectedNewsStep('article')} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all mb-4 text-lg">Vollständigen Artikel lesen</button>
                </>
              )}
              {selectedNewsStep === 'article' && (
                <>
                  <p className="text-slate-600 dark:text-slate-400 text-xl leading-relaxed mb-10 max-h-80 overflow-y-auto pr-4 custom-scrollbar whitespace-pre-wrap">{selectedNews.description}</p>
                  <button onClick={async () => { if (onMarkNewsRead) await onMarkNewsRead(selectedNews.id); setSelectedNews(null); setSelectedNewsStep(null); }} className="w-full bg-green-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-4 shadow-xl hover:bg-green-700 active:scale-95 transition-all text-base tracking-widest uppercase">
                    <Check size={28} /> Als gelesen markieren
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
