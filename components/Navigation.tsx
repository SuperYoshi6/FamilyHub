import React, { useRef, useState } from 'react';
import { Home, Calendar, ClipboardList, Utensils, CloudSun, TreePine, Snowflake, Gift, Cookie, CalendarHeart } from 'lucide-react';
import { AppRoute } from '../types';
import { t, Language } from '../services/translations';

interface NavigationProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  lang: Language;
  christmasMode?: boolean;
  liquidGlass?: boolean;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ currentRoute, onNavigate, lang, christmasMode, liquidGlass }) => {
  const isWeather = currentRoute === AppRoute.WEATHER;
  const navRef = useRef<HTMLElement>(null);
  const [dragLeft, setDragLeft] = useState<number | null>(null); // Percentage 0-100 position

  // Icon Mapping based on Mode
  const navItems = [
    { 
        route: AppRoute.DASHBOARD, 
        icon: christmasMode ? TreePine : Home, 
        label: t('nav.dashboard', lang) 
    },
    { 
        route: AppRoute.WEATHER, 
        icon: christmasMode ? Snowflake : CloudSun, 
        label: t('nav.weather', lang) 
    },
    { 
        route: AppRoute.CALENDAR, 
        icon: christmasMode ? CalendarHeart : Calendar, 
        label: t('nav.calendar', lang) 
    },
    { 
        route: AppRoute.MEALS, 
        icon: christmasMode ? Cookie : Utensils, 
        label: t('nav.meals', lang) 
    },
    { 
        route: AppRoute.LISTS, 
        icon: christmasMode ? Gift : ClipboardList, 
        label: t('nav.lists', lang) 
    },
  ];

  // Dynamic Class for Nav Container
  const getNavClass = () => {
      if (liquidGlass) {
          return 'liquid-shimmer-card pb-[env(safe-area-inset-bottom)]';
      }
      if (isWeather) {
          return 'bg-black/20 backdrop-blur-lg border-t border-white/10 pb-[env(safe-area-inset-bottom)]';
      }
      return 'bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]';
  };

  // Calculate active index for the slider position
  const activeIndex = navItems.findIndex(item => item.route === currentRoute);
  
  // Calculate width percentage based on number of items
  const itemWidthPercent = 100 / navItems.length;

  // --- DRAG INTERACTION HANDLERS (Only for Liquid Glass) ---
  const handlePointerDown = (e: React.PointerEvent) => {
      if (!liquidGlass) return; // Disable gestures in normal mode
      e.preventDefault();
      e.stopPropagation(); 
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      setDragLeft(activeIndex * itemWidthPercent);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!liquidGlass || dragLeft === null || !navRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const navRect = navRef.current.getBoundingClientRect();
      const x = e.clientX - navRect.left;
      const sliderWidthPx = navRect.width / navItems.length;
      const centeredX = x - (sliderWidthPx / 2);
      
      let newLeftPercent = (centeredX / navRect.width) * 100;
      const maxLeft = 100 - itemWidthPercent;
      newLeftPercent = Math.max(0, Math.min(maxLeft, newLeftPercent));

      setDragLeft(newLeftPercent);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      if (!liquidGlass || dragLeft === null) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.releasePointerCapture(e.pointerId);

      const nearestIndex = Math.round(dragLeft / itemWidthPercent);
      const clampedIndex = Math.max(0, Math.min(navItems.length - 1, nearestIndex));
      
      const targetItem = navItems[clampedIndex];
      if (targetItem && targetItem.route !== currentRoute) {
          onNavigate(targetItem.route);
      }

      setDragLeft(null); 
  };

  // Helper for inner slider style
  const getSliderStyle = () => {
      if (liquidGlass) {
          return 'bg-white/40 dark:bg-white/20 backdrop-blur-xl shadow-lg border border-white/40 dark:border-white/10';
      }
      return ''; // Not used in standard mode
  };

  // Determine positions and styles
  const currentLeftPosition = dragLeft !== null ? dragLeft : (activeIndex !== -1 ? activeIndex * itemWidthPercent : 0);
  // Slider is only visible in Liquid Glass mode
  const isSliderVisible = liquidGlass && (activeIndex !== -1 || dragLeft !== null);
  
  const transitionClass = dragLeft !== null ? 'transition-none' : 'transition-all duration-500 cubic-bezier(0.23, 1, 0.32, 1)';
  const scaleClass = dragLeft !== null ? 'scale-[1.02] shadow-xl cursor-grabbing' : 'scale-100 cursor-grab';

  return (
    <nav 
        ref={navRef}
        className={`fixed bottom-0 left-0 right-0 px-2 pt-2 pb-safe flex justify-around items-center z-50 transition-all duration-500 ${getNavClass()}`}
    >
      
      {/* --- ACTIVE TAB SLIDER (Liquid Glass Only) --- */}
      {isSliderVisible && (
          <div 
            className={`absolute top-1 bottom-[calc(env(safe-area-inset-bottom)+0.25rem)] rounded-2xl z-0 will-change-transform ${transitionClass}`}
            style={{
                left: `${currentLeftPosition}%`,
                width: `${itemWidthPercent}%`,
            }}
          >
              <div className={`h-full rounded-2xl mx-0.5 w-[calc(100%-4px)] transition-transform duration-200 ${scaleClass} ${getSliderStyle()}`}>
                  {/* Grip Indicator for Liquid Mode */}
                  {dragLeft === null && (
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 rounded-full bg-white/40 dark:bg-white/10" />
                  )}
              </div>
          </div>
      )}

      {/* --- INTERACTION HANDLE (Liquid Glass Only) --- */}
      {isSliderVisible && (
          <div
            className={`absolute top-1 bottom-[calc(env(safe-area-inset-bottom)+0.25rem)] z-20 touch-none ${transitionClass}`}
            style={{
                left: `${currentLeftPosition}%`,
                width: `${itemWidthPercent}%`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
      )}

      {navItems.map((item) => {
        const isActive = currentRoute === item.route;
        
        let textColor = '';
        
        if (isWeather && !liquidGlass) {
            textColor = isActive 
                ? 'text-white drop-shadow-md' 
                : 'text-white/60 hover:text-white drop-shadow-sm';
        } else if (christmasMode) {
            textColor = isActive
                ? 'text-red-600 dark:text-red-500 drop-shadow-sm' 
                : 'text-green-800/70 dark:text-green-400/60 hover:text-green-700 dark:hover:text-green-300';
        } else if (liquidGlass) {
            textColor = isActive 
                ? 'text-slate-900 dark:text-white font-extrabold drop-shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300';
        } else {
            // Standard Mode
            textColor = isActive 
                ? 'text-blue-600 dark:text-blue-400 scale-105' // Slight scale in standard mode
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300';
        }

        const iconScale = isActive ? (liquidGlass ? 'scale-110 -translate-y-1' : 'scale-100') : 'scale-100';

        return (
          <button
            key={item.route}
            onClick={() => onNavigate(item.route)}
            className={`flex flex-col items-center justify-center w-full space-y-1 transition-all duration-300 z-10 pb-[env(safe-area-inset-bottom)] group ${textColor}`}
            style={{ width: `${itemWidthPercent}%` }}
          >
            <div className={`relative transition-transform duration-300 ${iconScale} ${isActive && liquidGlass ? 'drop-shadow-md' : ''} pointer-events-none`}>
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} className={(isWeather && !liquidGlass) ? 'filter drop-shadow-sm' : ''} />
            </div>
            <span className={`text-[10px] font-medium truncate w-full text-center drop-shadow-sm transition-all duration-300 pointer-events-none ${isActive ? (liquidGlass ? 'opacity-100 translate-y-0' : 'opacity-100') : 'opacity-100'}`}>
                {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
});

export default Navigation;