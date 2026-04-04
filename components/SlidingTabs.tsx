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
    const stretch = liquidGlass ? Math.min(1.2, 1 + Math.abs(velocity) * 0.1) : 1;
    const skew = liquidGlass ? Math.max(-10, Math.min(10, velocity * 5)) : 0;

    return (
        <div 
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`p-1 rounded-xl flex relative select-none touch-none overflow-hidden ${className} ${liquidGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}
        >
            {/* Sliding Bubble */}
            <div 
                className={`absolute top-1 bottom-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${liquidGlass ? 'liquid-shimmer-card rounded-lg shadow-md border-white/30' : 'bg-white dark:bg-gray-700 shadow-sm rounded-lg'}`}
                style={{ 
                    left: `${bubbleLeft}%`, 
                    width: `calc(${itemWidthPercent}% - 8px)`,
                    transform: `translateX(4px) scaleX(${stretch}) skewX(${skew}deg)`,
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
                        className={`flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black flex items-center justify-center gap-1.5 transition-all relative z-10 ${isActive ? (liquidGlass ? 'text-blue-600 dark:text-blue-400' : 'text-blue-600 dark:text-blue-400') : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        {Icon && <Icon size={14} className={`flex-shrink-0 ${isActive && liquidGlass ? 'animate-[liquidWobble_0.25s_ease-in-out]' : ''}`} />}
                        <span className="truncate">{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default SlidingTabs;
