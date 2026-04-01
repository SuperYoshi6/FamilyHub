import React from 'react';
import { FamilyMember } from '../types';
import { Settings, Bell } from 'lucide-react';
import Logo from './Logo';

interface HeaderProps {
  title: string;
  currentUser?: FamilyMember;
  onProfileClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, currentUser, onProfileClick }) => {
  return (
    <header
      className="sticky top-0 z-40 px-4 pb-3 flex justify-between items-center transition-all duration-500 border-b shadow-sm bg-white dark:bg-slate-900 border-gray-100 dark:border-gray-800 overflow-hidden"
      style={{ 
        marginTop: '-1px', 
        paddingTop: 'calc(1px + env(safe-area-inset-top, 0px))' 
      }}
    >
      <div className="flex items-center space-x-3">
        <div>
          <Logo size={32} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">{title}</h1>
      </div>

      <div className="flex items-center space-x-3">
        {currentUser && (
          <div className="flex items-center space-x-4">
            {/* Profile Button */}
            <button
              onClick={onProfileClick}
              className="flex items-center space-x-2 focus:outline-none group ml-1"
            >
              <div className="relative transition-transform duration-300 active:scale-95">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full border-2 shadow-sm object-cover transition-all border-white dark:border-gray-700 group-hover:ring-2 group-hover:ring-blue-200 dark:group-hover:ring-blue-800"
                />
                <div className="absolute -bottom-1 -right-1 rounded-full p-0.5 shadow-sm border backdrop-blur-sm bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
                  <Settings size={10} className="text-gray-400 dark:text-gray-300" />
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
