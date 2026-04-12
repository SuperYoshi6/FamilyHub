import React, { useRef, useState, useLayoutEffect, useCallback } from 'react';
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
    /** `scroll`: Tabs behalten natürliche Breite, Zeile scrollt horizontal, Schiebe-Blase per Messung (z. B. Listen). */
    variant?: 'equal' | 'scroll';
}

const SlidingTabs: React.FC<SlidingTabsProps> = ({
    tabs,
    activeTabId,
    onTabChange,
    liquidGlass,
    className = '',
    variant = 'equal',
}) => {
    const scrollWrapRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragX, setDragX] = useState<number | null>(null);
    const [velocity, setVelocity] = useState(0);
    const lastX = useRef<number>(0);
    const lastTime = useRef<number>(0);
    const [bubblePx, setBubblePx] = useState({ left: 0, width: 0 });

    const isScroll = variant === 'scroll';
    const activeIndex = tabs.findIndex((t) => t.id === activeTabId);
    const itemWidthPercent = 100 / tabs.length;

    const updateBubblePx = useCallback(() => {
        if (!isScroll) return;
        const inner = containerRef.current;
        const btn = tabBtnRefs.current[activeIndex];
        if (!inner || !btn || activeIndex < 0) {
            setBubblePx({ left: 0, width: 0 });
            return;
        }
        const innerRect = inner.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        const inset = 6;
        setBubblePx({
            left: btnRect.left - innerRect.left + inset,
            width: Math.max(32, btnRect.width - inset * 2),
        });
    }, [isScroll, activeIndex]);

    useLayoutEffect(() => {
        updateBubblePx();
    }, [updateBubblePx, tabs.length, activeTabId, liquidGlass]);

    useLayoutEffect(() => {
        if (!isScroll || !containerRef.current) return;
        const ro = new ResizeObserver(() => updateBubblePx());
        ro.observe(containerRef.current);
        window.addEventListener('resize', updateBubblePx);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', updateBubblePx);
        };
    }, [isScroll, updateBubblePx]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!liquidGlass || isScroll) return;
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
        if (!isDragging || !liquidGlass || isScroll) return;
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
        if (!isDragging || !liquidGlass || isScroll) return;
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

    const bubbleLeftPct = dragX !== null ? dragX : activeIndex >= 0 ? activeIndex * itemWidthPercent : 0;
    // Subtler liquid motion to avoid jitter/stripes on desktop
    const stretch = liquidGlass && !isScroll ? Math.min(1.18, 1 + Math.abs(velocity) * 0.25) : 1;
    const skew = liquidGlass && !isScroll ? Math.max(-8, Math.min(8, velocity * 6)) : 0;

    const bubbleStyle: React.CSSProperties = isScroll
        ? {
              left: bubblePx.left,
              width: bubblePx.width,
              transform: 'none',
              transformOrigin: 'center',
              zIndex: 0,
          }
        : {
              left: `${bubbleLeftPct}%`,
              width: `calc(${itemWidthPercent}% - 6px)`,
              transform: `translateX(3px) scaleX(${stretch}) skewX(${skew}deg)`,
              transformOrigin: velocity === 0 ? 'center' : velocity > 0 ? 'left center' : 'right center',
              zIndex: 0,
          };

    const innerClassBase = `p-1 rounded-2xl flex relative select-none ${
        isScroll ? 'min-w-max w-max' : 'overflow-hidden touch-none'
    } ${liquidGlass ? 'bg-white/10 backdrop-blur-xl border border-white/15 dark:border-white/10' : 'bg-white/70 dark:bg-gray-800/80 border border-transparent'}`;
    const innerClass = isScroll ? innerClassBase : `${innerClassBase} ${className}`;

    const bubbleTransition = isScroll
        ? `${isDragging ? 'duration-0' : 'duration-200'} ease-out`
        : `${isDragging ? 'duration-0' : 'duration-500'} ease-[cubic-bezier(0.23,1,0.32,1)]`;

    const bubbleVisual = isScroll
        ? liquidGlass
            ? 'bg-white/35 dark:bg-white/12 backdrop-blur-sm rounded-lg border border-white/18 dark:border-white/10 shadow-none'
            : 'bg-white dark:bg-gray-600 shadow-sm rounded-lg'
        : liquidGlass
            ? 'bg-white/45 dark:bg-white/12 backdrop-blur-md rounded-xl border border-white/22 dark:border-white/10 shadow-[0_2px_10px_rgba(255,255,255,0.08)]'
            : 'bg-white dark:bg-gray-600 shadow-sm rounded-xl';

    const bubblePositionClass = isScroll ? 'top-1.5 bottom-1.5' : 'top-1 bottom-1';

    const inner = (
        <div
            ref={containerRef}
            {...(!isScroll
                ? {
                      onPointerDown: handlePointerDown,
                      onPointerMove: handlePointerMove,
                      onPointerUp: handlePointerUp,
                      onTouchStart: (e: React.TouchEvent) => {
                          if (liquidGlass) e.stopPropagation();
                      },
                      onTouchEnd: (e: React.TouchEvent) => {
                          if (liquidGlass) e.stopPropagation();
                      },
                  }
                : {})}
            className={innerClass}
        >
            <div
                className={`absolute ${bubblePositionClass} transition-all ${bubbleTransition} ${bubbleVisual}`}
                style={{
                    ...bubbleStyle,
                    opacity: isScroll && activeIndex < 0 ? 0 : 1,
                }}
            />

            {tabs.map((tab, i) => {
                const isActive = activeTabId === tab.id;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        ref={(el) => {
                            tabBtnRefs.current[i] = el;
                        }}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className={`relative z-10 flex items-center justify-center gap-2 text-sm font-semibold leading-none transition-colors duration-200 active:opacity-80 ${
                            isScroll
                                ? 'flex-none shrink-0 whitespace-nowrap px-3 sm:px-4 py-2.5 min-h-[44px]'
                                : 'flex-1 min-w-0 px-1 py-2'
                        } ${
                            isActive
                                ? liquidGlass
                                    ? 'text-blue-700 dark:text-blue-300'
                                    : 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        {Icon && (
                            <Icon
                                size={14}
                                className={`shrink-0 ${isActive && liquidGlass && !isScroll ? 'animate-wobble' : ''}`}
                            />
                        )}
                        <span className={`tracking-tight leading-none ${isScroll ? '' : 'truncate'}`}>{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );

    if (isScroll) {
        return (
            <div
                ref={scrollWrapRef}
                className={`max-w-full overflow-x-auto overflow-y-visible scrollbar-hide pb-0.5 overscroll-x-contain touch-pan-x ${className}`}
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {inner}
            </div>
        );
    }

    return inner;
};

export default SlidingTabs;
