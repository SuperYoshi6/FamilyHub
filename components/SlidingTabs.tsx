import React, { useRef, useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

interface TabItem {
    id: string;
    label: string;
    icon?: LucideIcon;
}

interface SlidingTabsProps {
    tabs: TabItem[];
    activeTabId: string;
    onTabChange: (id: string) => void;
    liquidGlass?: boolean;
    className?: string;
}

const SlidingTabs: React.FC<SlidingTabsProps> = ({ tabs, activeTabId, onTabChange, liquidGlass, className = '' }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragX, setDragX] = useState<number | null>(null);
    const [velocity, setVelocity] = useState(0);
    const lastX = useRef<number>(0);
    const lastTime = useRef<number>(0);

    const activeIndex = tabs.findIndex(t => t.id === activeTabId);
    const itemWidthPercent = 100 / tabs.length;

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!liquidGlass) return;
        setIsDragging(true);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const clamped = Math.max(0, Math.min(100 - itemWidthPercent, x - itemWidthPercent / 2));
            setDragX(clamped);
            lastX.current = e.clientX;
            lastTime.current = Date.now();
        }
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !liquidGlass) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const clamped = Math.max(0, Math.min(100 - itemWidthPercent, x - itemWidthPercent / 2));
            setDragX(clamped);
            
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
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && dragX !== null) {
            const finalX = dragX + itemWidthPercent / 2;
            const index = Math.max(0, Math.min(tabs.length - 1, Math.floor((finalX / 100) * tabs.length)));
            onTabChange(tabs[index].id);
        }
        setDragX(null);
        setVelocity(0);
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const bubbleLeft = dragX !== null ? dragX : (activeIndex * itemWidthPercent);
    const stretch = liquidGlass ? Math.min(1.6, 1 + Math.abs(velocity) * 0.6) : 1;
    const skew = liquidGlass ? Math.max(-20, Math.min(20, velocity * 15)) : 0;

    return (
        <div 
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onTouchStart={(e) => { if (liquidGlass) e.stopPropagation(); }}
            onTouchEnd={(e) => { if (liquidGlass) e.stopPropagation(); }}
            className={`p-1 rounded-2xl flex relative select-none touch-none overflow-hidden ${className} ${liquidGlass ? 'bg-white/10 backdrop-blur-xl border border-white/30 dark:border-white/10' : 'bg-white/50 dark:bg-gray-800/80 border border-transparent'}`}
        >
            {/* Sliding Bubble - The Pill */}
            <div 
                className={`absolute top-1 bottom-1 transition-all ease-[cubic-bezier(0.23,1,0.32,1)] ${isDragging ? 'duration-0' : 'duration-500'} ${liquidGlass ? 'bg-white/60 dark:bg-white/20 backdrop-blur-md rounded-xl border border-white/40 dark:border-white/10' : 'bg-white dark:bg-gray-600 shadow-sm rounded-xl'}`}
                style={{ 
                    left: `${bubbleLeft}%`, 
                    width: `calc(${itemWidthPercent}% - 6px)`,
                    transform: `translateX(3px) scaleX(${stretch}) skewX(${skew}deg)`,
                    transformOrigin: velocity === 0 ? 'center' : (velocity > 0 ? 'left center' : 'right center'),
                    zIndex: 0 
                }}
            />
            
            {tabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                const Icon = tab.icon;
                return (
                    <button 
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`relative z-10 flex-1 flex items-center justify-center space-x-2 py-2 px-1 text-sm font-bold transition-all duration-300 ${isActive ? (liquidGlass ? 'text-blue-700 dark:text-blue-300 scale-105' : 'text-blue-600 dark:text-blue-400') : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        {Icon && <Icon size={14} className={`flex-shrink-0 transition-transform ${isActive ? 'scale-110' : ''} ${isActive && liquidGlass ? 'animate-wobble' : ''}`} />}
                        <span className="truncate uppercase tracking-tight">{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default SlidingTabs;
