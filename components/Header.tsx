import React from 'react';
import { FamilyMember } from '../types';
import { Settings, Bell } from 'lucide-react';
import Logo from './Logo';

interface HeaderProps {
  title: string;
  currentUser?: FamilyMember;
  onProfileClick?: () => void;
  liquidGlass?: boolean;
  unreadNotifications?: number;
  onNotificationClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    title, currentUser, onProfileClick, liquidGlass, 
    unreadNotifications = 0, onNotificationClick 
}) => {
  return (
    <header
      className={`sticky top-0 z-40 px-4 pb-3 flex justify-between items-center transition-all duration-500 overflow-hidden ${liquidGlass ? 'backdrop-blur-2xl bg-white/10 dark:bg-white/5 border-b border-white/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]' : 'shadow-sm bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-800'}`}
      style={{ 
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' 
      }}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <Logo size={32} />
        </div>
        <h1 className={`text-xl font-black tracking-tight ${liquidGlass ? 'text-slate-900 dark:text-white drop-shadow-sm' : 'text-gray-800 dark:text-white line-clamp-1'}`}>{title}</h1>
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
