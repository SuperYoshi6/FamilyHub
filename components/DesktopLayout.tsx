import React, { useEffect } from 'react';
import { AppRoute, FamilyMember } from '../types';
import { Language } from '../services/translations';
import Navigation from './Navigation';

interface DesktopLayoutProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  lang: Language;
  currentUser: FamilyMember | null;
  onLogout: () => void;
  onProfileClick: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  children: React.ReactNode;
  autumnMode?: boolean;
  liquidGlass?: boolean;
  enableSwipe?: boolean;
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  currentRoute,
  onNavigate,
  lang,
  currentUser,
  onLogout,
  onProfileClick,
  darkMode,
  setDarkMode,
  children,
  autumnMode,
  liquidGlass,
  enableSwipe
}) => {
  useEffect(() => {
    // Add desktop class to body so global CSS rules kick in
    document.body.classList.add('fh-desktop-mode');
    return () => {
      document.body.classList.remove('fh-desktop-mode');
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <style>{`
        /* Global Desktop Spacing & Content Scaling */
        body.fh-desktop-mode .desktop-content-container {
          max-width: 1280px;
          margin-left: auto;
          margin-right: auto;
          width: 100%;
        }

        /* Improved Scrollbar for Desktop */
        .desktop-scroll-area::-webkit-scrollbar {
          width: 8px;
        }
        .desktop-scroll-area::-webkit-scrollbar-track {
          background: transparent;
        }
        .desktop-scroll-area::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .dark .desktop-scroll-area::-webkit-scrollbar-thumb {
          background: #334155;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `}</style>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto desktop-scroll-area">
        <div className="desktop-content-container pb-20">
          {children}
        </div>
      </div>

      {/* Bottom Navigation (Centered within Desktop Width) */}
      <div className={`w-full flex-shrink-0 z-30 transition-all duration-500 fixed bottom-0 ${liquidGlass ? 'bg-transparent dark:bg-transparent' : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800'}`}>
        <div className="desktop-content-container">
          <Navigation
            currentRoute={currentRoute}
            onNavigate={onNavigate}
            lang={lang}
            liquidGlass={liquidGlass}
            enableSwipe={enableSwipe}
            autumnMode={autumnMode}
          />
        </div>
      </div>
    </div>
  );
};

export default DesktopLayout;
