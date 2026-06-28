import React from 'react';
import { FamilyMember } from '../types';
import { Settings, Bell, Sun } from 'lucide-react';
import Logo from './Logo';

interface HeaderProps {
  title: string;
  currentUser?: FamilyMember;
  onProfileClick?: () => void;
  liquidGlass?: boolean;
  unreadNotifications?: number;
  onNotificationClick?: () => void;
  summerMode?: boolean;
  wmMode?: boolean;
}

const Header: React.FC<HeaderProps> = ({
    title, currentUser, onProfileClick, liquidGlass,
    unreadNotifications = 0, onNotificationClick, summerMode, wmMode
}) => {
  return (
    <header
      className={`px-4 pb-3 flex justify-between items-center transition-all duration-500 overflow-hidden ${liquidGlass ? 'backdrop-blur-2xl bg-white/10 dark:bg-white/5 shadow-[0_8px_24px_0_rgba(31,38,135,0.05)]' : 'bg-white dark:bg-slate-900 shadow-[0_1px_0_rgba(0,0,0,0.03)]'}`}
      style={{
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))'
      }}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <Logo size={32} />
        </div>
        <h1 className={`text-xl font-black tracking-tight ${liquidGlass ? 'text-slate-900 dark:text-white drop-shadow-sm' : 'text-gray-800 dark:text-white line-clamp-1'}`}>{title}</h1>
        {wmMode && (
          <img
            src="https://upload.wikimedia.org/wikipedia/en/thumb/6/6c/2026_FIFA_World_Cup.svg/120px-2026_FIFA_World_Cup.svg.png"
            alt="FIFA World Cup 2026"
            className="h-7 w-auto"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
            onError={(e) => {
              // Fallback: zeige "26" Badge wenn Bild nicht lädt
              (e.target as HTMLImageElement).style.display = 'none';
              const fallback = document.createElement('span');
              fallback.className = 'inline-flex items-center justify-center w-12 h-7 bg-gradient-to-b from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700 rounded-lg shadow-sm text-red-700 dark:text-red-800 text-sm font-black tracking-tight';
              fallback.textContent = '26';
              (e.target as HTMLImageElement).after(fallback);
            }}
          />
        )}
        {summerMode && !wmMode && (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400">
            <Sun size={16} />
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {onNotificationClick && (
            <button 
                onClick={onNotificationClick}
                className={`p-2 rounded-full relative transition-all active:scale-95 ${liquidGlass ? 'bg-white/20 hover:bg-white/30 backdrop-blur-md' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
                <Bell size={20} className={liquidGlass ? 'text-slate-700 dark:text-white' : 'text-gray-500 dark:text-gray-400'} />
                {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
                )}
            </button>
        )}

        {currentUser && (
          <div className="flex items-center">
            {/* Profile Button */}
            <button
              onClick={onProfileClick}
              className="flex items-center focus:outline-none group"
            >
              <div className="relative transition-transform duration-300 active:scale-95">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className={`w-10 h-10 rounded-full border-2 shadow-sm object-cover transition-all ${liquidGlass ? 'border-white/60 shadow-lg' : 'border-white dark:border-gray-700 group-hover:ring-2 group-hover:ring-blue-200 dark:group-hover:ring-blue-800'}`}
                />
                <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 shadow-sm border backdrop-blur-sm ${liquidGlass ? 'bg-white/40 border-white/60' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                  <Settings size={10} className={liquidGlass ? 'text-slate-700 dark:text-slate-200' : 'text-gray-400 dark:text-gray-300'} />
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
