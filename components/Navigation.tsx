import React, { useRef, useState } from 'react';
import { Home, Calendar, ClipboardList, Utensils, CloudSun, TreePine, Snowflake, Gift, Cookie, CalendarHeart, Egg, Rabbit, Bird, Carrot, ShoppingBasket } from 'lucide-react';
import { AppRoute } from '../types';
import { t, Language } from '../services/translations';

interface NavigationProps {
    currentRoute: AppRoute;
    onNavigate: (route: AppRoute) => void;
    lang: Language;
    christmasMode?: boolean;
    easterMode?: boolean;
    liquidGlass?: boolean;
    enableSwipe?: boolean;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ currentRoute, onNavigate, lang, christmasMode, easterMode, liquidGlass, enableSwipe }) => {
    const isWeather = currentRoute === AppRoute.WEATHER;
    const navRef = useRef<HTMLElement>(null);

    // --- Interaction State ---
    const [isDragging, setIsDragging] = useState(false);
    const [dragX, setDragX] = useState<number | null>(null);
    const [velocity, setVelocity] = useState(0);
    const lastX = useRef<number>(0);
    const lastTime = useRef<number>(0);

    const navItems = [
        { route: AppRoute.DASHBOARD, icon: easterMode ? Egg : (christmasMode ? TreePine : Home), label: t('nav.dashboard', lang) },
        { route: AppRoute.WEATHER, icon: easterMode ? Rabbit : (christmasMode ? Snowflake : CloudSun), label: t('nav.weather', lang) },
        { route: AppRoute.CALENDAR, icon: easterMode ? Bird : (christmasMode ? CalendarHeart : Calendar), label: t('nav.calendar', lang) },
        { route: AppRoute.MEALS, icon: easterMode ? Carrot : (christmasMode ? Cookie : Utensils), label: t('nav.meals', lang) },
        { route: AppRoute.LISTS, icon: easterMode ? ShoppingBasket : (christmasMode ? Gift : ClipboardList), label: t('nav.lists', lang) },

    ];

    const activeIndex = navItems.findIndex(item => item.route === currentRoute);
    const itemWidthPercent = 100 / navItems.length;

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!liquidGlass) return;
        setIsDragging(true);
        const rect = navRef.current?.getBoundingClientRect();
        if (rect) {
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const clamped = Math.max(0, Math.min(100 - itemWidthPercent, x - itemWidthPercent / 2));
            setDragX(clamped);
            lastX.current = e.clientX;
            lastTime.current = Date.now();
        }
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !liquidGlass) return;
        const rect = navRef.current?.getBoundingClientRect();
        if (rect) {
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const clamped = Math.max(0, Math.min(100 - itemWidthPercent, x - itemWidthPercent / 2));
            setDragX(clamped);

            // Calculate velocity for "stretch" effect
            const now = Date.now();
            const dt = now - lastTime.current;
            if (dt > 0) {
                const dx = e.clientX - lastX.current;
                setVelocity(dx / dt);
            }
            lastX.current = e.clientX;
            lastTime.current = now;
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging || !liquidGlass) return;
        setIsDragging(false);
        const rect = navRef.current?.getBoundingClientRect();
        if (rect && dragX !== null) {
            const finalX = dragX + itemWidthPercent / 2;
            const index = Math.max(0, Math.min(navItems.length - 1, Math.round((finalX / 100) * navItems.length - 0.5)));
            onNavigate(navItems[index].route);
        }
        setDragX(null);
        setVelocity(0);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const getNavClass = () => {
        if (liquidGlass) return 'liquid-shimmer-card rounded-t-[32px] border-t border-white/40';
        if (easterMode) return 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-t border-white/20 rounded-t-[32px]';
        return 'bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-gray-800 rounded-t-[32px]';
    };

    // Calculate dynamic styles for the bubble
    const bubbleLeft = dragX !== null ? dragX : (activeIndex >= 0 ? activeIndex * itemWidthPercent : 0);
    const stretch = liquidGlass ? Math.min(1.08, 1 + Math.abs(velocity) * 0.06) : 1;
    const skew = liquidGlass ? Math.max(-15, Math.min(15, velocity * 10)) : 0;
    const bubbleWidth = `calc(${itemWidthPercent}% - 0.75rem)`;

    return (
        <nav
            ref={navRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`relative w-full px-2 py-4 flex justify-around items-center transition-all duration-500 overflow-hidden select-none ${liquidGlass ? 'touch-none' : 'touch-auto'} ${getNavClass()}`}
        >
            {/* Wobble Bubble Background (Liquid Glass only) */}
            {liquidGlass && (
                <div
                    className="nav-wobble-bubble"
                    style={{
                        width: bubbleWidth,
                        left: `${bubbleLeft}%`,
                        transition: isDragging ? 'none' : 'all 0.6s cubic-bezier(0.68, -0.6, 0.32, 1.6)',
                        transform: `skewX(${skew}deg) scaleX(${stretch})`,
                        transformOrigin: '50% 50%',
                        opacity: activeIndex === -1 && !isDragging ? 0 : 1,
                        borderRadius: '20px',
                        height: '72%',
                        boxShadow: 'none'
                    }}
                />
            )}

            {navItems.map((item) => {
                const isActive = currentRoute === item.route;
                const activeBg = !liquidGlass && easterMode && isActive ? 'bg-pink-100/70 dark:bg-pink-900/30' : '';
                let textColor = '';

                if (easterMode) {
                    textColor = isActive ? 'text-[#db2777] dark:text-pink-400 font-black scale-110' : 'text-slate-500/60 dark:text-slate-400/50';
                } else if (isWeather && !liquidGlass) {
                    textColor = isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500';
                } else if (christmasMode) {
                    textColor = isActive ? 'text-red-600 dark:text-red-500' : 'text-green-800/70 dark:text-green-400/60';
                } else if (liquidGlass) {
                    textColor = isActive ? 'text-blue-600 dark:text-blue-500 font-black' : 'text-slate-500 dark:text-slate-400';
                } else {
                    textColor = isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-400 dark:text-gray-500';
                }

                return (
                    <button
                        key={item.route}
                        type="button"
                        onClick={() => onNavigate(item.route)}
                        className={`relative flex flex-col items-center justify-center w-full space-y-1 transition-all duration-300 z-10 pointer-events-auto ${textColor} ${activeBg}`}
                        style={{ width: `${itemWidthPercent}%` }}
                    >
                        <item.icon size={isActive ? 28 : 24} className={`transition-all duration-300 ${isActive && liquidGlass ? 'animate-[liquidWobble_0.25s_ease-in-out]' : ''}`} />
                        <span className="text-[10px] font-black truncate w-full text-center tracking-tighter">
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
});


export default Navigation;
