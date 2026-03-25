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
    const [dragLeft, setDragLeft] = useState<number | null>(null);

    const navItems = [
        { route: AppRoute.DASHBOARD, icon: christmasMode ? TreePine : Home, label: t('nav.dashboard', lang) },
        { route: AppRoute.WEATHER, icon: christmasMode ? Snowflake : CloudSun, label: t('nav.weather', lang) },
        { route: AppRoute.CALENDAR, icon: christmasMode ? CalendarHeart : Calendar, label: t('nav.calendar', lang) },
        { route: AppRoute.MEALS, icon: christmasMode ? Cookie : Utensils, label: t('nav.meals', lang) },
        { route: AppRoute.LISTS, icon: christmasMode ? Gift : ClipboardList, label: t('nav.lists', lang) },
    ];

    const getNavClass = () => {
        if (liquidGlass) return 'liquid-shimmer-card';
        if (isWeather) return 'bg-black/20 backdrop-blur-lg border-t border-white/10';
        return 'bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800';
    };

    const activeIndex = navItems.findIndex(item => item.route === currentRoute);
    const itemWidthPercent = 100 / navItems.length;

    const currentLeftPosition = dragLeft !== null ? dragLeft : (activeIndex !== -1 ? activeIndex * itemWidthPercent : 0);

    return (
        <nav
            ref={navRef}
            className={`relative w-full px-2 py-4 flex justify-around items-center transition-all duration-500 overflow-hidden ${getNavClass()}`}
            style={{}}
        >
            {navItems.map((item) => {
                const isActive = currentRoute === item.route;

                let textColor = '';

                if (isWeather && !liquidGlass) {
                    textColor = isActive
                        ? 'text-white'
                        : 'text-white/60';
                } else if (christmasMode) {
                    textColor = isActive
                        ? 'text-red-600 dark:text-red-500'
                        : 'text-green-800/70 dark:text-green-400/60';
                } else if (liquidGlass) {
                    textColor = isActive
                        ? 'text-slate-900 dark:text-white font-extrabold'
                        : 'text-slate-500 dark:text-slate-400';
                } else {
                    textColor = isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500';
                }

                return (
                    <button
                        key={item.route}
                        onClick={() => onNavigate(item.route)}
                        className={`relative flex flex-col items-center justify-center w-full space-y-1 transition-all duration-300 ${textColor}`}
                        style={{ width: `${itemWidthPercent}%` }}
                    >
                        <item.icon size={24} />
                        <span className="text-[10px] font-medium truncate w-full text-center">
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
});

export default Navigation;