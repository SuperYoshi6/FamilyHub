import React, { useState, useEffect, useMemo } from 'react';
import { WeatherMetric, WeatherData, SavedLocation } from '../types';
import { fetchWeather, getWeatherDescription, searchCity } from '../services/weather';
import { Sun, CloudRain, Wind, Droplets, Thermometer, MapPinOff, ArrowLeft, Cloud, CloudSnow, CloudLightning, CloudFog, Moon, Umbrella, Calendar, Eye, Gauge, Sunrise, Sunset, Search, MapPin, Loader2, Star, ArrowRightLeft, ArrowUp, ArrowDown, Navigation, GripHorizontal } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface WeatherPageProps {
  onBack: () => void;
  favorites: SavedLocation[];
  onToggleFavorite: (location: SavedLocation) => void;
  initialLocation: {lat: number, lng: number, name: string} | null;
  liquidGlass?: boolean;
}

// --- Helper Functions ---

const renderMetricIcon = (iconName: string, className: string) => {
    switch(iconName) {
        case 'wind': return <Wind className={className} />;
        case 'droplets': return <Umbrella className={className} />;
        case 'humidity': return <Droplets className={className} />;
        case 'sun': return <Sun className={className} />;
        case 'thermometer': return <Thermometer className={className} />;
        case 'eye': return <Eye className={className} />;
        case 'gauge': return <Gauge className={className} />;
        case 'sunrise': return <Sunrise className={className} />;
        case 'sunset': return <Sunset className={className} />;
        default: return <Sun className={className} />;
    }
};

const getBigWeatherIcon = (code: number, isDay: number = 1) => {
  if (code === 0) return isDay ? <Sun size={80} className="text-yellow-400 animate-pulse-slow" /> : <Moon size={80} className="text-gray-200" />;
  if (code >= 1 && code <= 3) return <Cloud size={80} className="text-gray-200 animate-float" />;
  if (code >= 45 && code <= 48) return <CloudFog size={80} className="text-gray-300 animate-float" />;
  if (code >= 51 && code <= 67) return <CloudRain size={80} className="text-blue-300" />;
  if (code >= 71 && code <= 77) return <CloudSnow size={80} className="text-white" />;
  if (code >= 95) return <CloudLightning size={80} className="text-purple-300" />;
  return <Sun size={80} className="text-yellow-400" />;
};

const getSmallWeatherIcon = (code: number) => {
  if (code === 0) return <Sun size={20} className="text-yellow-400" />;
  if (code >= 1 && code <= 3) return <Cloud size={20} className="text-gray-400" />;
  if (code >= 45 && code <= 48) return <CloudFog size={20} className="text-gray-400" />;
  if (code >= 51 && code <= 67) return <CloudRain size={20} className="text-blue-400" />;
  if (code >= 71 && code <= 77) return <CloudSnow size={20} className="text-white" />;
  if (code >= 95) return <CloudLightning size={20} className="text-purple-400" />;
  return <Sun size={20} className="text-yellow-400" />;
}

const getBackgroundClass = (code: number, isDay: number = 1, liquid: boolean = false) => {
    // If liquid glass is on, we use extremely transparent colors to let the body gradient show
    if (liquid) {
        if (!isDay) return 'from-indigo-900/10 to-slate-900/20'; // Night: Very subtle dark overlay
        // Day: Very subtle colored overlay to tint the glass
        if (code === 0) return 'from-blue-400/5 to-blue-600/10';
        if (code >= 1 && code <= 3) return 'from-slate-400/5 to-slate-500/10';
        return 'from-cyan-500/5 to-blue-600/10';
    }

    if (!isDay) return 'from-slate-900 to-indigo-950'; 
    if (code === 0) return 'from-blue-400 to-blue-600'; 
    if (code >= 1 && code <= 3) return 'from-blue-400 to-slate-500'; 
    if (code >= 45) return 'from-gray-500 to-slate-600'; 
    if (code >= 51 && code <= 86) return 'from-slate-600 to-gray-800'; 
    if (code >= 95) return 'from-indigo-900 to-purple-900'; 
    return 'from-blue-500 to-cyan-600'; 
};

const getDayName = (dateStr: string, index: number) => {
    if (index === 0) return 'Heute';
    if (index === 1) return 'Morgen';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { weekday: 'long' });
};

// --- Weather Effects Component ---
const WeatherEffects: React.FC<{ code: number; isDay: number }> = ({ code, isDay }) => {
  const isClear = code === 0;
  const isPartlyCloudy = code === 1 || code === 2;
  const isOvercast = code === 3;
  const isFog = code === 45 || code === 48;
  const isDrizzle = code >= 51 && code <= 57;
  const isRain = (code >= 61 && code <= 63) || code === 66 || code === 80 || code === 81;
  const isHeavyRain = code === 65 || code === 67 || code === 82 || (code >= 95 && code <= 99);
  const isSnow = (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
  const isThunder = code >= 95;
  
  const isClearNight = isClear && isDay === 0;

  const precipConfig = useMemo(() => {
    if (isHeavyRain) return { count: 120, speedBase: 0.3, speedVar: 0.2, angle: 15, opacity: 0.7, type: 'rain' };
    if (isRain) return { count: 60, speedBase: 0.7, speedVar: 0.3, angle: 5, opacity: 0.5, type: 'rain' };
    if (isDrizzle) return { count: 40, speedBase: 1.5, speedVar: 0.5, angle: 0, opacity: 0.3, type: 'rain' };
    if (isSnow) return { count: 50, speedBase: 4, speedVar: 2, angle: 0, opacity: 0.8, type: 'snow' };
    return { count: 0, speedBase: 0, speedVar: 0, angle: 0, opacity: 0, type: 'none' };
  }, [isHeavyRain, isRain, isDrizzle, isSnow]);

  const particles = useMemo(() => {
    return Array.from({ length: precipConfig.count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: precipConfig.speedBase + Math.random() * precipConfig.speedVar,
      size: precipConfig.type === 'snow' ? Math.random() * 3 + 2 : (precipConfig.type === 'rain' && isDrizzle ? Math.random() * 5 + 5 : Math.random() * 15 + 10)
    }));
  }, [precipConfig, isDrizzle]);

  const clouds = useMemo(() => {
     return [
         { top: 10, left: -20, duration: 25, size: 'w-64 h-64' },
         { top: 30, left: -10, duration: 35, size: 'w-80 h-80' },
         { top: 60, left: 10, duration: 45, size: 'w-40 h-40' },
         { top: 20, left: -30, duration: 20, size: 'w-72 h-72' },
         { top: 50, left: -15, duration: 30, size: 'w-56 h-56' },
         { top: 5, left: 50, duration: 40, size: 'w-96 h-96' },
     ];
  }, []);

  const stars = useMemo(() => {
     return Array.from({ length: 50 }).map((_, i) => ({
         id: i,
         top: Math.random() * 60,
         left: Math.random() * 100,
         delay: Math.random() * 3,
         size: Math.random() * 2 + 1
     }));
  }, []);

  const activeClouds = isOvercast ? clouds : (isPartlyCloudy || isDrizzle || isRain || isHeavyRain || isSnow ? clouds.slice(0, 3) : []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {isClearNight && stars.map(s => (
          <div 
            key={`star-${s.id}`}
            className="absolute bg-white rounded-full animate-pulse-slow"
            style={{
                top: `${s.top}%`,
                left: `${s.left}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                opacity: 0.8,
                animationDelay: `${s.delay}s`
            }}
          />
      ))}
      {activeClouds.map((c, i) => (
          <div 
            key={i} 
            className={`absolute bg-white/${isOvercast ? '10' : '20'} rounded-full blur-3xl animate-cloud ${c.size}`}
            style={{ 
                top: `${c.top}%`, 
                animationDuration: `${c.duration}s`,
                left: `${c.left}%`
            }} 
          />
      ))}
      {isOvercast && <div className="absolute inset-0 bg-slate-900/30 z-0"></div>}
      {isFog && <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-white/20 to-transparent blur-3xl z-10"></div>}
      {precipConfig.type !== 'none' && (
          <div className="absolute inset-0" style={{ transform: `skewX(-${precipConfig.angle}deg)` }}>
             {particles.map(p => (
                 <div 
                    key={p.id}
                    className={`absolute rounded-full ${precipConfig.type === 'snow' ? 'bg-white' : 'bg-blue-100/60'}`}
                    style={{
                        left: `${p.left}%`,
                        top: '-50px',
                        width: precipConfig.type === 'snow' ? `${p.size}px` : (isHeavyRain ? '2px' : '1px'),
                        height: precipConfig.type === 'snow' ? `${p.size}px` : `${p.size}px`,
                        opacity: precipConfig.opacity,
                        animation: `fall ${p.duration}s linear infinite`,
                        animationDelay: `-${p.delay}s`
                    }}
                 />
             ))}
          </div>
      )}
      {isThunder && <div className="absolute inset-0 bg-white/30 animate-thunder mix-blend-overlay z-10"></div>}
      {isClear && isDay === 1 && <div className="absolute -top-20 right-0 w-[500px] h-[500px] bg-yellow-400/20 rounded-full blur-3xl animate-pulse-slow"></div>}
    </div>
  );
};

const WeatherPage = ({ onBack, favorites, onToggleFavorite, initialLocation, liquidGlass = false }: WeatherPageProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState<string>('Standort');
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);

  // Radar State
  const [radarType, setRadarType] = useState<'rain' | 'temp'>('rain');

  // Reordering State (Tap to move)
  const [metrics, setMetrics] = useState<WeatherMetric[]>([]);
  const [selectedSwapMetricIndex, setSelectedSwapMetricIndex] = useState<number | null>(null);
  
  const [sectionOrder, setSectionOrder] = useState<string[]>(['hourly', 'daily', 'details']);
  const [selectedSwapSectionIndex, setSelectedSwapSectionIndex] = useState<number | null>(null);

  const loadWeather = async (lat: number, lng: number, name?: string) => {
    setLoading(true);
    setError(null);
    setCurrentCoords({ lat, lng });
    const result = await fetchWeather(lat, lng);
    if (result) {
        setData(result);
        if (name) setLocationName(name);

        const sunrise = new Date(result.daily.sunrise[0]).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const sunset = new Date(result.daily.sunset[0]).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const visibilityKm = result.current.visibility ? (result.current.visibility / 1000).toFixed(1) : '--';
        
        setMetrics([
            { id: '1', label: 'Gefühlt', value: `${Math.round(result.current.apparent_temperature)}°`, icon: 'thermometer', colorClass: 'bg-orange-500/20 text-orange-200' },
            { id: '2', label: 'Feuchtigkeit', value: `${result.current.relative_humidity_2m}%`, icon: 'humidity', colorClass: 'bg-blue-500/20 text-blue-200' },
            { id: '3', label: 'Wind', value: `${Math.round(result.current.wind_speed_10m)} km/h`, icon: 'wind', colorClass: 'bg-teal-500/20 text-teal-200' },
            { id: '4', label: 'UV Index', value: `${result.daily.uv_index_max[0].toFixed(1)}`, icon: 'sun', colorClass: 'bg-yellow-500/20 text-yellow-200' },
            { id: '5', label: 'Luftdruck', value: `${Math.round(result.current.surface_pressure)} hPa`, icon: 'gauge', colorClass: 'bg-purple-500/20 text-purple-200' },
            { id: '6', label: 'Sichtweite', value: `${visibilityKm} km`, icon: 'eye', colorClass: 'bg-indigo-500/20 text-indigo-200' },
            { id: '7', label: 'Sonnenaufgang', value: sunrise, icon: 'sunrise', colorClass: 'bg-amber-500/20 text-amber-200' },
            { id: '8', label: 'Sonnenuntergang', value: sunset, icon: 'sunset', colorClass: 'bg-red-500/20 text-red-200' },
        ]);
    } else {
        setError("Daten konnten nicht geladen werden");
    }
    setLoading(false);
  };

  const attemptCurrentLocation = async (forceRequest: boolean = false) => {
      setLoading(true);
      setError(null);
      
      // Native App Logic
      if (Capacitor.isNativePlatform()) {
          try {
              if (forceRequest) {
                  try { await Geolocation.requestPermissions(); } catch (e) {}
              }
              const coordinates = await Geolocation.getCurrentPosition({
                  enableHighAccuracy: false, 
                  timeout: 10000, 
                  maximumAge: Infinity
              });
              loadWeather(coordinates.coords.latitude, coordinates.coords.longitude, "Aktueller Standort");
              return;
          } catch (err: any) {
              console.error("Capacitor Geo Error:", err);
          }
      }

      // Web Fallback
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (pos) => {
                  loadWeather(pos.coords.latitude, pos.coords.longitude, "Aktueller Standort");
              },
              (err2) => {
                  setError("Standort nicht verfügbar. Bitte suche manuell.");
                  setIsSearching(true);
                  setLoading(false);
              },
              { timeout: 8000, enableHighAccuracy: false }
          );
      } else {
          setError("Standortzugriff fehlgeschlagen.");
          setIsSearching(true);
          setLoading(false);
      }
  }

  useEffect(() => {
    if (initialLocation) {
        loadWeather(initialLocation.lat, initialLocation.lng, initialLocation.name);
    } else {
        attemptCurrentLocation();
    }
  }, []);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setIsSearching(false);
    
    const coords = await searchCity(searchQuery);
    
    if (coords) {
        loadWeather(coords.lat, coords.lng, coords.name);
    } else {
        setError(`Konnte Ort "${searchQuery}" nicht finden.`);
        setLoading(false);
    }
    setSearchQuery('');
  };

  const handleFavoriteClick = () => {
      if (!currentCoords) return;
      onToggleFavorite({ id: locationName, name: locationName, lat: currentCoords.lat, lng: currentCoords.lng });
  };

  const isFavorite = favorites.some(f => f.name === locationName);

  // --- Swapping Logic (Tap to move) ---
  const handleSectionClick = (index: number) => {
      if (selectedSwapSectionIndex === null) {
          setSelectedSwapSectionIndex(index);
      } else if (selectedSwapSectionIndex === index) {
          setSelectedSwapSectionIndex(null);
      } else {
          const newOrder = [...sectionOrder];
          const temp = newOrder[index];
          newOrder[index] = newOrder[selectedSwapSectionIndex];
          newOrder[selectedSwapSectionIndex] = temp;
          setSectionOrder(newOrder);
          setSelectedSwapSectionIndex(null);
      }
  };

  const handleMetricClick = (index: number) => {
      if (selectedSwapMetricIndex === null) {
          setSelectedSwapMetricIndex(index);
      } else if (selectedSwapMetricIndex === index) {
          setSelectedSwapMetricIndex(null);
      } else {
          const newMetrics = [...metrics];
          const temp = newMetrics[index];
          newMetrics[index] = newMetrics[selectedSwapMetricIndex];
          newMetrics[selectedSwapMetricIndex] = temp;
          setMetrics(newMetrics);
          setSelectedSwapMetricIndex(null);
      }
  };

  const currentCode = data?.current?.weather_code || 0;
  const isDay = data?.current?.is_day ?? 1;
  const isSnowyBg = (currentCode >= 71 && currentCode <= 77);

  // --- THEME LOGIC FOR LIQUID GLASS ---
  const textColorClass = liquidGlass 
    ? 'text-slate-800 dark:text-white' 
    : (isSnowyBg && isDay ? 'text-slate-800' : 'text-white');

  const sectionTitleClass = liquidGlass
    ? 'text-slate-600 dark:text-yellow-100 opacity-90'
    : 'text-yellow-100 opacity-90';

  const glassClass = liquidGlass 
    ? 'bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-sm' 
    : (isSnowyBg ? 'bg-white/40 border-slate-500/20' : 'bg-black/20 border-white/5');

  // --- Helper Components ---

  const SectionHeader = ({ title, index, onClick }: { title: string, index: number, onClick: () => void }) => {
      const isSelected = selectedSwapSectionIndex === index;
      return (
        <div 
            onClick={onClick}
            className={`flex justify-between items-center mb-3 px-3 py-1.5 cursor-pointer transition-all rounded-lg select-none ${isSelected ? 'bg-white/20 ring-1 ring-white/50' : 'hover:bg-white/10 group'}`}
        >
            <h3 className={`text-left text-xs font-bold uppercase tracking-wider flex items-center drop-shadow-sm ${sectionTitleClass}`}>
                {title}
            </h3>
            {isSelected ? (
                <div className="flex items-center space-x-1 animate-pulse">
                    <span className="text-[10px] font-bold text-yellow-300 uppercase">Verschieben...</span>
                    <ArrowRightLeft size={14} className="text-current" />
                </div>
            ) : (
                <GripHorizontal size={18} className="opacity-60 group-hover:opacity-100 transition" />
            )}
        </div>
      );
  }

  // --- Render Sections ---

  const renderHourly = (index: number) => {
    if (!data) return null;
    const currentHourIndex = new Date().getHours();
    const hourlySlice = data.hourly.time.slice(currentHourIndex, currentHourIndex + 25);
    const tempSlice = data.hourly.temperature_2m.slice(currentHourIndex, currentHourIndex + 25);
    const codeSlice = data.hourly.weather_code.slice(currentHourIndex, currentHourIndex + 25);

    return (
      <div className={`w-full transition-all duration-300 ${selectedSwapSectionIndex === index ? (liquidGlass ? 'animate-wobble' : 'scale-[0.98] opacity-80') : ''}`}>
          <SectionHeader title="Stündlich" index={index} onClick={() => handleSectionClick(index)} />
          <div className={`${glassClass} rounded-3xl p-5 shadow-sm`}>
              <div className="flex overflow-x-auto gap-6 pb-2 scrollbar-hide">
                  {hourlySlice.map((t: string, i: number) => {
                      const date = new Date(t);
                      const hour = date.getHours();
                      const isNow = i === 0;
                      return (
                          <div key={i} className="flex flex-col items-center space-y-3 min-w-[3rem]">
                              <span className="text-xs font-medium opacity-80 whitespace-nowrap">{isNow ? 'Jetzt' : `${hour}:00`}</span>
                              {getSmallWeatherIcon(codeSlice[i] || 0)}
                              <span className="font-bold text-lg">{Math.round(tempSlice[i] || 0)}°</span>
                          </div>
                      )
                  })}
              </div>
          </div>
      </div>
    );
  };

  const renderDaily = (index: number) => (
      <div className={`w-full transition-all duration-300 ${selectedSwapSectionIndex === index ? (liquidGlass ? 'animate-wobble' : 'scale-[0.98] opacity-80') : ''}`}>
           <SectionHeader title="7-Tage Trend" index={index} onClick={() => handleSectionClick(index)} />
          <div className={`${glassClass} rounded-3xl p-5 space-y-4 shadow-sm`}>
              {data?.daily.time.map((dayStr, i) => {
                  const min = Math.round(data.daily.temperature_2m_min[i]);
                  const max = Math.round(data.daily.temperature_2m_max[i]);
                  const rangeMin = -5;
                  const rangeMax = 35;
                  const totalRange = rangeMax - rangeMin;
                  const leftPct = Math.max(0, ((min - rangeMin) / totalRange) * 100);
                  const widthPct = Math.max(5, ((max - min) / totalRange) * 100);

                  return (
                      <div key={i} className="flex items-center justify-between text-sm">
                          <span className="w-20 font-medium text-left">{getDayName(dayStr, i)}</span>
                          <div className="flex justify-center w-8">
                              {getSmallWeatherIcon(data.daily.weather_code[i])}
                          </div>
                          <div className="flex-1 flex items-center gap-2 px-2">
                              <span className="w-6 text-right opacity-80 text-xs">{min}°</span>
                              <div className={`flex-1 h-1.5 ${liquidGlass ? 'bg-slate-400/30' : (isSnowyBg ? 'bg-slate-600/10' : 'bg-white/10')} rounded-full relative overflow-hidden`}>
                                  <div 
                                      className="absolute h-full rounded-full opacity-80"
                                      style={{ 
                                          left: `${leftPct}%`, 
                                          width: `${widthPct}%`,
                                          background: 'linear-gradient(90deg, #93c5fd 0%, #fbbf24 100%)'
                                      }}
                                  />
                              </div>
                              <span className="w-6 text-left font-bold text-xs">{max}°</span>
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>
  );

  const renderRadar = () => {
    if (!currentCoords) return null;
    const overlay = radarType;
    const embedUrl = `https://embed.windy.com/embed2.html?lat=${currentCoords.lat}&lon=${currentCoords.lng}&detailLat=${currentCoords.lat}&detailLon=${currentCoords.lng}&width=650&height=450&zoom=8&level=surface&overlay=${overlay}&product=ecmwf&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

    return (
      <div className="w-full transition-all duration-300">
          <div className="flex justify-between items-center mb-3 px-3 py-1.5 rounded-lg select-none">
                <h3 className={`text-left text-xs font-bold uppercase tracking-wider flex items-center drop-shadow-md ${sectionTitleClass}`}>
                    Wetterradar
                </h3>
          </div>
          <div className={`${glassClass} rounded-3xl p-2 shadow-sm`}>
              <div className="flex gap-2 mb-2 px-1">
                  <button 
                      onClick={(e) => { e.stopPropagation(); setRadarType('rain'); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${radarType === 'rain' ? 'bg-blue-500 text-white shadow-md' : 'bg-white/20 hover:bg-white/30 text-current'}`}
                  >
                      <CloudRain size={14} className="mr-1.5"/> Regen
                  </button>
                  <button 
                      onClick={(e) => { e.stopPropagation(); setRadarType('temp'); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${radarType === 'temp' ? 'bg-orange-500 text-white shadow-md' : 'bg-white/20 hover:bg-white/30 text-current'}`}
                  >
                      <Thermometer size={14} className="mr-1.5"/> Temperatur
                  </button>
              </div>
              <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-black/20 relative shadow-inner">
                  <iframe 
                      src={embedUrl}
                      className="w-full h-full border-none"
                      title="Radar"
                  />
              </div>
          </div>
      </div>
    );
  };

  const renderDetails = (index: number) => (
      <div className={`w-full transition-all duration-300 ${selectedSwapSectionIndex === index ? (liquidGlass ? 'animate-wobble' : 'scale-[0.98] opacity-80') : ''}`}>
          <SectionHeader title="Details" index={index} onClick={() => handleSectionClick(index)} />
          <div className="grid grid-cols-2 gap-3 w-full">
              {metrics.map((metric, idx) => {
                  const isSelected = selectedSwapMetricIndex === idx;
                  
                  let dynamicIconColor = metric.colorClass || 'bg-white/20';
                  if (liquidGlass) {
                      if (metric.icon === 'sun') dynamicIconColor = 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-200';
                      else if (metric.icon === 'wind') dynamicIconColor = 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-200';
                      else if (metric.icon === 'thermometer') dynamicIconColor = 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-200';
                      else if (metric.icon === 'humidity') dynamicIconColor = 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200';
                      else dynamicIconColor = 'bg-slate-100 text-slate-600 dark:bg-white/20 dark:text-white';
                  }

                  return (
                      <div
                          key={metric.id}
                          onClick={() => handleMetricClick(idx)}
                          className={`
                              ${glassClass} 
                              p-4 rounded-3xl flex flex-col items-start 
                              relative overflow-hidden cursor-pointer transition-all active:scale-95 select-none
                              ${isSelected ? (liquidGlass ? 'animate-wobble ring-2 ring-yellow-400' : 'ring-2 ring-yellow-400 shadow-lg scale-[0.98]') : 'hover:bg-white/5'}
                          `}
                      >
                          <div className="flex justify-between w-full mb-3">
                              <div className={`p-2 rounded-full ${dynamicIconColor}`}>
                                  {renderMetricIcon(metric.icon, "w-4 h-4")}
                              </div>
                              {isSelected ? <ArrowRightLeft size={16} className="text-yellow-400 animate-pulse" /> : <div className="w-4" />}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-normal mb-0.5 opacity-70 w-full truncate">{metric.label}</span>
                          <span className="text-xl font-bold tracking-tight">{metric.value}</span>
                      </div>
                  );
              })}
          </div>
      </div>
  );

  if (loading) return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 flex-col">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <span className="text-gray-500">Lade Wetter...</span>
      </div>
  );

  const bgGradient = getBackgroundClass(currentCode, isDay, liquidGlass);

  return (
    <div className={`min-h-screen ${liquidGlass ? '' : 'bg-gradient-to-b'} ${bgGradient} ${textColorClass} pb-24 transition-all duration-1000 relative overflow-hidden`}>
      <WeatherEffects code={currentCode} isDay={isDay} />

      {/* Header Optimized Layout */}
      <div className="pt-4 px-4 flex items-center z-20 relative">
          <button onClick={onBack} className={`bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur-md transition flex-shrink-0 mr-2 ${isSnowyBg && !liquidGlass ? 'text-slate-800' : 'text-current'}`}>
              <ArrowLeft size={24} />
          </button>
          
          <div className="flex-1 min-w-0 flex items-center justify-center space-x-1 mx-2 bg-white/10 rounded-full py-1.5 px-3 backdrop-blur-sm">
              <MapPin size={12} className="opacity-70 flex-shrink-0" />
              <span className="font-semibold tracking-wide uppercase text-sm opacity-90 truncate">{locationName}</span>
          </div>

          <div className="flex space-x-1 flex-shrink-0">
            <button 
                onClick={() => attemptCurrentLocation(true)} 
                className={`bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur-md transition ${isSnowyBg && !liquidGlass ? 'text-slate-800' : 'text-current'}`}
                title="Aktueller Standort"
            >
                <Navigation size={20} className={!initialLocation ? 'fill-current' : ''} />
            </button>
            <button 
                onClick={handleFavoriteClick} 
                className={`bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur-md transition ${isSnowyBg && !liquidGlass ? 'text-slate-800' : 'text-current'}`}
            >
                <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} className={isFavorite ? 'text-yellow-400' : ''} />
            </button>
            <button onClick={() => setIsSearching(!isSearching)} className={`bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur-md transition ${isSnowyBg && !liquidGlass ? 'text-slate-800' : 'text-current'}`}>
                <Search size={20} />
            </button>
          </div>
      </div>

      {/* Search Bar Overlay */}
      {isSearching && (
          <div className="absolute top-20 left-4 right-4 z-30 animate-fade-in-down">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-2 shadow-xl border border-white/20">
                <form onSubmit={handleSearchSubmit} className="relative mb-2">
                    <input 
                        type="text" 
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Stadt eingeben (z.B. München)..."
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl py-3 pl-4 pr-12 outline-none border border-transparent focus:border-blue-500 transition-all"
                    />
                    <button type="submit" className="absolute right-2 top-2 p-1.5 bg-blue-500 text-white rounded-lg">
                        <Search size={20} />
                    </button>
                </form>
                {favorites.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-1 pb-2">
                        {favorites.map(fav => (
                            <button
                                key={fav.id}
                                onClick={() => {
                                    loadWeather(fav.lat, fav.lng, fav.name);
                                    setIsSearching(false);
                                }}
                                className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium transition"
                            >
                                <Star size={10} className="fill-current text-yellow-500" />
                                <span>{fav.name}</span>
                            </button>
                        ))}
                    </div>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 text-center">
                    <button onClick={() => setIsSearching(false)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">Schließen</button>
                </div>
              </div>
          </div>
      )}

      <div className="flex flex-col items-center pt-8 px-6 text-center z-10 relative animate-fade-in-up">
         {error ? (
             <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md mt-10">
                 <MapPinOff size={48} className="mx-auto mb-2 opacity-70" />
                 <p className="mb-4 font-medium">{error}</p>
                 <div className="flex flex-col gap-2">
                     <button 
                        onClick={() => attemptCurrentLocation(true)} 
                        className="bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold transition flex items-center justify-center hover:bg-blue-600 shadow-lg"
                     >
                        <Navigation size={16} className="mr-2"/> Standort freigeben
                     </button>
                     <button 
                        onClick={() => setIsSearching(true)} 
                        className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-full text-sm font-bold transition flex items-center justify-center"
                     >
                        <Search size={16} className="mr-2"/> Manuell suchen
                     </button>
                 </div>
             </div>
         ) : data && (
             <>
                {/* Hero Section (Always Top) */}
                <div className={`mb-2 drop-shadow-2xl filter transform hover:scale-105 transition duration-700 ease-in-out ${liquidGlass ? 'animate-float' : ''}`}>
                    {getBigWeatherIcon(currentCode, isDay)}
                </div>
                <h1 className="text-8xl font-bold tracking-tighter drop-shadow-lg leading-none">
                    {Math.round(data.current.temperature_2m)}°
                </h1>
                <p className="text-xl font-medium mt-2 opacity-90 drop-shadow-sm">
                    {getWeatherDescription(currentCode)}
                </p>
                <div className={`flex space-x-4 mt-2 text-sm opacity-90 font-medium ${liquidGlass ? 'bg-white/10 backdrop-blur-md text-current' : (isSnowyBg ? 'bg-slate-800/10' : 'bg-black/20')} px-4 py-1 rounded-full backdrop-blur-sm`}>
                    <span className="flex items-center"><span className="text-xs mr-1 opacity-70">H:</span> {Math.round(data.daily.temperature_2m_max[0])}°</span>
                    <span className={`w-px ${isSnowyBg && !liquidGlass ? 'bg-slate-800/30' : 'bg-white/30'} h-4`}></span>
                    <span className="flex items-center"><span className="text-xs mr-1 opacity-70">T:</span> {Math.round(data.daily.temperature_2m_min[0])}°</span>
                </div>

                {/* Reorderable Sections */}
                <div className="w-full mt-10 space-y-6">
                    {sectionOrder.map((sectionId, index) => {
                        if (sectionId === 'hourly') return <div key="hourly" className="animate-fade-in">{renderHourly(index)}</div>;
                        if (sectionId === 'daily') return <div key="daily" className="animate-fade-in">{renderDaily(index)}</div>;
                        if (sectionId === 'details') return <div key="details" className="animate-fade-in">{renderDetails(index)}</div>;
                        return null;
                    })}
                    
                    {/* Fixed Radar Section (Bottom) */}
                    <div className="animate-fade-in">
                        {renderRadar()}
                    </div>
                </div>
             </>
         )}
      </div>
    </div>
  );
};

export default WeatherPage;