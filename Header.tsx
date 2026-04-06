import React from 'react';
import { FamilyMember } from './types';
import { Settings } from 'lucide-react';
import Logo from './components/Logo';

interface HeaderProps {
  title: string;
  currentUser?: FamilyMember;
  onProfileClick?: () => void;
  liquidGlass?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, currentUser, onProfileClick, liquidGlass }) => {
  return (
    <header className={`sticky top-0 z-40 px-4 py-4 flex justify-between items-center transition-all duration-500 border-b shadow-sm ${liquidGlass ? 'bg-white/30 dark:bg-black/20 backdrop-blur-2xl border-white/20' : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-gray-100 dark:border-gray-800'}`}>
      <div className="flex items-center space-x-3">
        <div className={liquidGlass ? 'drop-shadow-md' : ''}>
            <Logo size={32} />
        </div>
        <h1 className={`text-xl font-bold tracking-tight ${liquidGlass ? 'text-slate-800 dark:text-white drop-shadow-sm' : 'text-gray-800 dark:text-white'}`}>{title}</h1>
      </div>
      
      <div className="flex items-center space-x-3">
          {currentUser && (
            <button 
              onClick={onProfileClick}
              className="flex items-center space-x-2 focus:outline-none group ml-1"
            >
              <div className="relative transition-transform duration-300 active:scale-95">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className={`w-9 h-9 rounded-full border-2 shadow-sm object-cover transition-all ${liquidGlass ? 'border-white/50 dark:border-white/20' : 'border-white dark:border-gray-700 group-hover:ring-2 group-hover:ring-blue-200 dark:group-hover:ring-blue-800'}`}
                />
                <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 shadow-sm border backdrop-blur-sm ${liquidGlass ? 'bg-white/80 dark:bg-black/80 border-white/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                  <Settings size={10} className={liquidGlass ? 'text-slate-500 dark:text-slate-300' : 'text-gray-400 dark:text-gray-300'} />
                </div>
              </div>
            </button>
          )}
      </div>
    </header>
  );
};

export default Header;