import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { FamilyMember, CalendarEvent, MealPlan, AppRoute, SavedLocation, NewsItem } from '../types';
import { Clock, ClipboardList, Utensils, ChevronRight, Sun, CheckCircle, CloudRain, Search, MapPin, Loader2, Star, ArrowRightLeft, Users, User, Cloud, CloudFog, CloudSnow, CloudLightning, Moon } from 'lucide-react';
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
  currentWeatherLocation: {lat: number, lng: number, name: string} | null;
  onUpdateWeatherLocation: (loc: {lat: number, lng: number, name: string}) => void;
  news: NewsItem[];
  liquidGlass?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    family, currentUser, events, shoppingCount, openTaskCount = 0, todayMeal, onNavigate, onProfileClick, lang, weatherFavorites = [],
    currentWeatherLocation, onUpdateWeatherLocation, news, liquidGlass = false
}) => {
  const [calendarView, setCalendarView] = useState<'family' | 'private'>('family');
  const activeViewIndex = calendarView === 'family' ? 0 : 1;
  const today = new Date().toISOString().split('T')[0];
  
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
    
    const loadDefaultOrError = () => {
        setWeatherError(true);
        setWeatherLoading(false);
    };

    if (currentWeatherLocation) {
        loadWeatherData(currentWeatherLocation.lat, currentWeatherLocation.lng, currentWeatherLocation.name);
        return;
    }

    if (!navigator.geolocation) {
      loadDefaultOrError();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude, name: 'Aktueller Standort' };
        loadWeatherData(loc.lat, loc.lng, loc.name);
        onUpdateWeatherLocation(loc);
      },
      (error) => {
        console.log("GPS error in Dashboard:", error.message);
        loadDefaultOrError();
      },
      { timeout: 5000 }
    );
  }, [lang]);

  // Determine Greeting Icon and Background based on Weather
  const getWeatherIcon = (code: number, day: number) => {
    if (code === 0) return day ? <Sun className="text-yellow-300 animate-spin-slow" size={48} /> : <Moon className="text-gray-200" size={48} />;
    if (code >= 1 && code <= 3) return <Cloud className="text-gray-200" size={48} />;
    if (code >= 45 && code <= 48) return <CloudFog className="text-gray-300" size={48} />;
    if (code >= 51 && code <= 67) return <CloudRain className="text-blue-300" size={48} />;
    if (code >= 71 && code <= 77) return <CloudSnow className="text-white" size={48} />;
    if (code >= 95) return <CloudLightning className="text-purple-300" size={48} />;
    return <Sun className="text-yellow-300" size={48} />;
  };

  const getWeatherGradient = (code: number, day: number) => {
      if (liquidGlass) return 'liquid-shimmer-card'; // Use Liquid Style
      if (!day) return 'bg-gradient-to-r from-slate-800 to-indigo-900';
      if (code === 0) return 'bg-gradient-to-r from-blue-500 to-blue-400';
      if (code >= 1 && code <= 3) return 'bg-gradient-to-r from-blue-400 to-slate-400';
      if (code >= 51) return 'bg-gradient-to-r from-slate-500 to-gray-600';
      return 'bg-gradient-to-r from-blue-500 to-cyan-600';
  };

  // --- Dynamic Slider Helpers ---
  const getSliderClass = () => {
      return "absolute top-0.5 bottom-0.5 rounded-lg z-0 transition-all duration-500 cubic-bezier(0.23, 1, 0.32, 1)";
  };

  const getSliderInnerClass = () => {
      if (liquidGlass) {
          return "w-full h-full rounded-lg bg-white/40 dark:bg-white/20 backdrop-blur-md border border-white/40 shadow-sm";
      }
      return "";
  };

  const getBtnClass = (isActive: boolean) => {
      if (liquidGlass) {
          return isActive ? "text-slate-900 dark:text-white" : "text-gray-500 dark:text-gray-400";
      }
      return isActive ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400";
  };

  return (
    <>
      <Header title="Übersicht" currentUser={currentUser} onProfileClick={onProfileClick} liquidGlass={liquidGlass} />
      <main className="p-4 space-y-6 pb-24">
        
        {/* Dynamic Greeting Section */}
        <div className={`${getWeatherGradient(weatherCode, isDay)} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden transition-all duration-1000`}>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h2 className={`text-3xl font-bold ${liquidGlass ? 'text-slate-800 dark:text-white drop-shadow-sm' : ''}`}>{t('dashboard.greeting', lang)} {currentUser.name}!</h2>
              <p className={`text-sm font-medium mt-1 ${liquidGlass ? 'text-slate-600 dark:text-gray-300' : 'text-blue-50/80'}`}>{t('dashboard.good_day', lang)}</p>
            </div>
            <div className="filter drop-shadow-md">
                {getWeatherIcon(weatherCode, isDay)}
            </div>
          </div>
          {/* Decorative shapes - Hidden in Liquid Mode to keep clean */}
          {!liquidGlass && (
              <>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full blur-xl"></div>
              </>
          )}
        </div>

        {/* Weather Link Widget */}
        <div className="relative">
            <button 
              onClick={() => onNavigate(AppRoute.WEATHER)}
              className={`w-full rounded-2xl p-4 shadow-sm border relative overflow-hidden flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750 transition ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}
            >
                {weatherLoading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 z-20 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-500" size={24} />
                  </div>
                )}
                
                <div className="flex items-center space-x-4">
                    {weatherError ? (
                       <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full"><Search className="text-gray-400" size={20} /></div>
                    ) : (
                       <div className={`p-2 rounded-full ${liquidGlass ? 'bg-blue-100/50 dark:bg-blue-900/30' : 'bg-blue-50 dark:bg-blue-900/30'}`}><CloudRain className="text-blue-500" size={24} /></div>
                    )}
                    <div className="text-left">
                        <span className={`text-2xl font-bold block leading-none mb-1 ${liquidGlass ? 'text-slate-800 dark:text-white' : 'text-gray-800 dark:text-white'}`}>
                          {weatherError ? '--' : currentTemp}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          {weatherError ? 'Ort suchen...' : (
                              <span>
                                  {locationName ? `${locationName} • ` : ''} {weatherDesc}
                              </span>
                          )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                    {t('dashboard.weather_details', lang)} <ChevronRight size={16} className="ml-1" />
                </div>
            </button>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Shopping */}
          <button 
            onClick={() => onNavigate(AppRoute.LISTS)}
            className={`p-4 rounded-xl shadow-sm border flex flex-col items-start transition ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'}`}
          >
            <div className="flex justify-between w-full mb-2">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400">
                    <ClipboardList size={20} />
                </div>
                {shoppingCount > 0 && <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full h-fit">{shoppingCount}</span>}
            </div>
            <span className={`text-sm font-bold ${liquidGlass ? 'text-slate-800 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>{t('dashboard.shopping_list', lang)}</span>
            <span className="text-xs text-gray-400 mt-0.5">{shoppingCount === 0 ? t('dashboard.all_done', lang) : `${shoppingCount} ${t('dashboard.items_open', lang)}`}</span>
          </button>

          {/* Meals */}
          <button 
            onClick={() => onNavigate(AppRoute.MEALS)}
            className={`p-4 rounded-xl shadow-sm border flex flex-col items-start transition ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'}`}
          >
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-600 dark:text-green-400 mb-2">
              <Utensils size={20} />
            </div>
            <span className={`text-sm font-bold line-clamp-1 w-full text-left ${liquidGlass ? 'text-slate-800 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
              {todayMeal ? todayMeal.mealName : t('dashboard.nothing_planned', lang)}
            </span>
            <span className="text-xs text-gray-400 mt-0.5">{t('dashboard.meal_plan', lang)}</span>
          </button>
        </div>
        
        {/* My Tasks Widget */}
        <button 
            onClick={() => onNavigate(AppRoute.LISTS)}
            className={`w-full p-4 rounded-xl shadow-sm border flex items-center justify-between transition ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'}`}
        >
            <div className="flex items-center space-x-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                    <CheckCircle size={20} />
                </div>
                <div className="text-left">
                    <span className={`block text-sm font-bold ${liquidGlass ? 'text-slate-800 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>{t('dashboard.my_tasks', lang)}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{openTaskCount === 0 ? t('dashboard.all_tasks_done', lang) : `${openTaskCount} ${t('dashboard.tasks_open', lang)}`}</span>
                </div>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
        </button>

        {/* Timeline */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t('dashboard.appointments_today', lang)}</h3>
            <div className="flex items-center space-x-3">
                <div className={`flex p-0.5 rounded-lg relative ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    
                    {/* Slider Element - Liquid Only */}
                    {liquidGlass && (
                        <div 
                            className={getSliderClass()}
                            style={{ 
                                left: `${activeViewIndex * 50}%`, 
                                width: '50%' 
                            }}
                        >
                            <div className={getSliderInnerClass()} />
                        </div>
                    )}

                    <button 
                        onClick={() => setCalendarView('family')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition z-10 ${getBtnClass(calendarView === 'family')}`}
                    >
                        Alle
                    </button>
                    <button 
                        onClick={() => setCalendarView('private')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition z-10 ${getBtnClass(calendarView === 'private')}`}
                    >
                        Meine
                    </button>
                </div>
                <button 
                onClick={() => onNavigate(AppRoute.CALENDAR)}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center"
                >
                <ChevronRight size={20} />
                </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {sortedEvents.length > 0 ? (
              sortedEvents.map(event => (
                <div key={event.id} className={`p-4 rounded-xl shadow-sm border-l-4 border-blue-500 flex items-center animate-fade-in ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white dark:bg-gray-800'}`}>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${liquidGlass ? 'text-slate-800 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>{event.title}</h4>
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mt-1 space-x-2">
                      <span className="flex items-center"><Clock size={12} className="mr-1"/> {event.time}</span>
                      {event.location && <span>• {event.location}</span>}
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                     {event.assignedTo.map(uid => {
                        const member = family.find(f => f.id === uid);
                        return member ? (
                          <div key={uid} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white dark:ring-gray-800 ${member.color.split(' ')[0].replace('bg-', 'bg-')}`}>
                             {member.name[0]}
                          </div>
                        ) : null;
                     })}
                  </div>
                </div>
              ))
            ) : (
              <div className={`text-center py-8 rounded-xl border border-dashed ${liquidGlass ? 'border-white/30 bg-white/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <p className={`text-sm ${liquidGlass ? 'text-slate-600 dark:text-slate-400' : 'text-gray-400'}`}>{t('dashboard.no_appointments', lang)}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default Dashboard;