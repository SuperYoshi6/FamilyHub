import React, { useState, useRef } from 'react';
import {
  Home, CloudSun, Calendar, UtensilsCrossed, ListTodo,
  Bell, MapPin, CheckCheck, ChevronLeft, ChevronRight,
  Sparkles, MessageSquare, ShoppingCart, ClipboardCheck,
  Smartphone, Globe, ShieldAlert, Plus, MessageCircle
} from 'lucide-react';
import Logo from './Logo';

interface OnboardingProps {
  onComplete: () => void;
  darkMode: boolean;
  language: 'de' | 'en';
  userName?: string;
  userAvatar?: string;
  mustChangePassword?: boolean;
  onPasswordChange?: (password: string) => void;
}

const slides = [
  {
    icon: (size: number) => <Logo size={size} />,
    title: 'Das Herz eures Zuhauses.',
    subtitle: 'Alles an einem Ort.',
    description: 'Die intelligente Plattform für unsere Familie. Organisiert Termine, Einkäufe, Mahlzeiten und mehr.',
    color: 'from-blue-500 to-indigo-500',
    hint: null,
  },
  {
    icon: (size: number) => <Home size={size} />,
    title: 'Dashboard',
    subtitle: 'Alle Infos auf einen Blick',
    description: 'Siehst du Wetter, heutige Termine, offene Aufgaben und die Einkaufsliste – ohne umzuschalten.',
    color: 'from-emerald-500 to-teal-500',
    hint: (
      <div className="grid grid-cols-2 gap-2 w-full max-w-[220px] mx-auto">
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-2.5 text-left shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/40 mb-1" />
          <div className="h-2 w-12 bg-gray-200 dark:bg-gray-600 rounded-full" />
        </div>
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-2.5 text-left shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-900/40 mb-1" />
          <div className="h-2 w-10 bg-gray-200 dark:bg-gray-600 rounded-full" />
        </div>
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-2.5 text-left shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 mb-1" />
          <div className="h-2 w-8 bg-gray-200 dark:bg-gray-600 rounded-full" />
        </div>
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-2.5 text-left shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-900/40 mb-1" />
          <div className="h-2 w-14 bg-gray-200 dark:bg-gray-600 rounded-full" />
        </div>
      </div>
    ),
  },
  {
    icon: (size: number) => <CloudSun size={size} />,
    title: 'Wetter',
    subtitle: 'Tippe unten auf Wetter',
    description: 'Aktuelle Temperatur, 7-Tage-Vorhersage und mehr für deine gespeicherten Orte.',
    color: 'from-sky-500 to-cyan-500',
    hint: (
      <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl p-4 w-full max-w-[220px] mx-auto shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="w-16 h-4 bg-gray-200 dark:bg-gray-600 rounded-full" />
          <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-700" />
        </div>
        <div className="flex items-end gap-2">
          <div className="text-3xl font-black text-gray-800 dark:text-white">22°</div>
          <div className="text-sm text-gray-400 mb-1">Sonnig</div>
        </div>
        <div className="flex gap-1.5 mt-3">
          <div className="h-10 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-1" />
          <div className="h-14 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-1" />
          <div className="h-12 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-1" />
          <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-1" />
          <div className="h-10 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-1" />
        </div>
      </div>
    ),
  },
  {
    icon: (size: number) => <Calendar size={size} />,
    title: 'Kalender',
    subtitle: 'Tippe auf ein Datum → Termin',
    description: 'Erstelle Termine für die ganze Familie. Außerdem: News und Umfragen im Kalender-Tab.',
    color: 'from-violet-500 to-purple-500',
    hint: (
      <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl p-4 w-full max-w-[220px] mx-auto shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['M','D','M','D','F','S','S'].map((d,i) => (
            <span key={i} className="text-[10px] font-bold text-gray-400 text-center">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 mb-3">
          {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28].map((d,i) => (
            <div key={i} className={`text-xs text-center py-0.5 rounded-full ${d === 15 ? 'bg-blue-500 text-white font-bold' : 'text-gray-600 dark:text-gray-300'}`}>{d}</div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-gray-400 font-medium">15. Juli</span>
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm">
            <Plus size={14} />
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: (size: number) => <MessageCircle size={size} />,
    title: 'News & Umfragen',
    subtitle: 'Teile Neuigkeiten mit der Familie',
    description: 'Erstelle News-Beiträge oder starte eine Umfrage – tippe dazu im Kalender-Tab auf News oder Umfragen.',
    color: 'from-pink-500 to-rose-500',
    hint: (
      <div className="flex gap-3 w-full max-w-[220px] mx-auto">
        <div className="flex-1 bg-white/60 dark:bg-gray-800/60 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-2 mx-auto">
            <MessageSquare size={14} className="text-blue-500" />
          </div>
          <div className="h-2 w-14 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-1" />
          <div className="h-2 w-10 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto" />
        </div>
        <div className="flex-1 bg-white/60 dark:bg-gray-800/60 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 relative">
          <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mb-2 mx-auto">
            <ClipboardCheck size={14} className="text-purple-500" />
          </div>
          <div className="h-2 w-14 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-1" />
          <div className="h-2 w-10 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto" />
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white shadow">
            <Plus size={11} />
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: (size: number) => <UtensilsCrossed size={size} />,
    title: 'Mahlzeiten',
    subtitle: 'Woche für Woche planen',
    description: 'Lege den Wochenplan fest, entdecke Rezepte und äußere Essenswünsche für die Familie.',
    color: 'from-orange-500 to-amber-500',
    hint: (
      <div className="grid grid-cols-7 gap-1 w-full max-w-[220px] mx-auto">
        {['Mo','Di','Mi','Do','Fr','Sa','So'].map((d,i) => (
          <div key={i} className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-1.5 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-[10px] font-bold text-gray-400 mb-1">{d}</div>
            <div className={`h-5 rounded-md ${i < 5 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-700'}`} />
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: (size: number) => <ListTodo size={size} />,
    title: 'Listen',
    subtitle: 'Einkaufen & Aufgaben',
    description: 'Teile Einkaufslisten, verteile Haushaltsaufgaben und verwalte persönliche To-dos.',
    color: 'from-pink-500 to-rose-500',
    hint: (
      <div className="space-y-2 w-full max-w-[220px] mx-auto">
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-500" />
          <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-600 rounded-full" />
        </div>
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-500" />
          <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-600 rounded-full" />
        </div>
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-5 h-5 rounded-md bg-blue-500 flex items-center justify-center text-white">✓</div>
          <div className="h-2.5 w-28 bg-gray-200 dark:bg-gray-600 rounded-full line-through opacity-50" />
        </div>
      </div>
    ),
  },
];

const permissions = [
  { icon: <MapPin size={24} />, title: 'Standort', description: 'Für persönliche Wetterdaten an deinem aktuellen Ort.', color: 'text-green-500' },
  { icon: <Calendar size={24} />, title: 'Kalender', description: 'Um Termine mit dem nativen Kalender zu synchronisieren.', color: 'text-violet-500' },
  { icon: <Bell size={24} />, title: 'Benachrichtigungen', description: 'Für Erinnerungen, Push-Nachrichten und wichtige Updates.', color: 'text-amber-500' },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, darkMode, language, userName, userAvatar, mustChangePassword, onPasswordChange }) => {
  const [step, setStep] = useState(0);
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [granting, setGranting] = useState(false);
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const totalSteps = slides.length + 4;
  const swipeX = useRef<number | null>(null);

  const isProfileStep = step === slides.length;
  const isPasswordStep = step === slides.length + 1;
  const isPermissionsStep = step === slides.length + 2;
  const isFinalStep = step === slides.length + 3;

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeX.current;
    swipeX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx > 0 && step > 0) setStep(s => s - 1);
    if (dx < 0 && step < slides.length) setStep(s => s + 1);
  };

  const handlePasswordSubmit = () => {
    if (!mustChangePassword) {
      setPasswordChanged(true);
      return;
    }
    if (passwordInput.length < 4) {
      setPasswordError('Passwort muss mindestens 4 Zeichen lang sein');
      return;
    }
    if (passwordInput !== passwordConfirm) {
      setPasswordError('Passwörter stimmen nicht überein');
      return;
    }
    if (onPasswordChange) onPasswordChange(passwordInput);
    setPasswordChanged(true);
  };

  const requestPermissions = async () => {
    setGranting(true);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const { PushNotifications } = await import('@capacitor/push-notifications');

        await Geolocation.requestPermissions().catch(() => {});
        await LocalNotifications.requestPermissions().catch(() => {});

        const { NativeCalendarService } = await import('../services/nativeCalendar');
        await NativeCalendarService.requestPermissions().catch(() => {});

        const perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') {
          await PushNotifications.requestPermissions();
        }
      } else {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: false, timeout: 5000 });
        }
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }
      setPermissionsGranted(true);
    } catch {}
    setGranting(false);
  };

  const handleFinish = async () => {
    setSendingWelcome(true);
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [{
            id: 999999,
            title: `🎉 Willkommen, ${userName || 'bei FamilyHub'}!`,
            body: 'Schön, dass du da bist! Viel Spaß mit FamilyHub.',
            smallIcon: 'notification_icon',
            schedule: { at: new Date(Date.now() + 500) },
            sound: 'default',
          }],
        });
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`🎉 Willkommen, ${userName || 'bei FamilyHub'}!`, {
          body: 'Schön, dass du da bist! Viel Spaß mit FamilyHub.',
          icon: '/icon.png',
        });
      }
    } catch {}
    setWelcomeDone(true);
    setSendingWelcome(false);
    onComplete();
  };

  const next = () => {
    if (isPasswordStep) { handlePasswordSubmit(); return; }
    if (isPermissionsStep) return;
    if (isFinalStep) return;
    setStep(s => Math.min(s + 1, totalSteps - 1));
  };

  const prev = () => setStep(s => Math.max(s - 1, 0));

  const slide = slides[step] || null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-950" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Background decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br ${slide?.color || 'from-blue-500 to-indigo-500'} opacity-10 dark:opacity-20 blur-3xl animate-blob`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-tr ${slide?.color || 'from-blue-500 to-indigo-500'} opacity-10 dark:opacity-20 blur-3xl animate-blob`} style={{ animationDelay: '3s' }} />
      </div>

      {/* Top skip button */}
      <div className="relative z-10 flex justify-end px-6 pt-6">
        <button
          onClick={onComplete}
          className="text-sm font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-4 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Überspringen
        </button>
      </div>

      {/* Content area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-4">
        {/* Slide content */}
        <div className="w-full max-w-sm mx-auto animate-fade-in">
          {!isPermissionsStep && !isFinalStep && slide && (
            <div className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${slide.color} shadow-xl flex items-center justify-center mb-4 text-white`}>
                {slide.icon(40)}
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                {slide.title}
              </h2>
              <p className="text-blue-600 dark:text-blue-400 font-bold text-base mb-3">
                {slide.subtitle}
              </p>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs text-sm mb-5">
                {slide.description}
              </p>
              {slide.hint}
            </div>
          )}

          {isProfileStep && (
            <div className="flex flex-col items-center text-center animate-slide-up">
              <div className="relative mb-6">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 p-1.5 shadow-xl mx-auto">
                  <img
                    src={userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || '')}&background=1e293b&color=fff&bold=true`}
                    alt={userName}
                    className="w-full h-full rounded-full object-cover border-2 border-white"
                  />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                  <CheckCheck size={16} />
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-4 py-2 rounded-full mb-4 border border-emerald-200 dark:border-emerald-800">
                Passwort geändert ✓
              </div>

              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                Das bist du!
              </h2>
              <p className="text-blue-600 dark:text-blue-400 font-bold text-xl mb-6">
                {userName}
              </p>

              <div className="relative w-full max-w-xs mx-auto mb-6">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 p-0.5 flex-shrink-0">
                    <img
                      src={userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || '')}&background=1e293b&color=fff&bold=true`}
                      alt={userName}
                      className="w-full h-full rounded-full object-cover border border-white"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm text-gray-800 dark:text-white">{userName}</p>
                    <p className="text-xs text-gray-400">Profil & Einstellungen</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  </div>
                </div>
                <div className="absolute -top-6 right-6 animate-float">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500">
                    <path d="M12 5v14m0 0l-6-6m6 6l6-6"/>
                  </svg>
                </div>
              </div>

              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-6 leading-relaxed">
                Jetzt legst du los! In deinem Profil erstellst du Termine, änderst Einstellungen und verwaltest dein Konto.
              </p>

              <button
                onClick={() => setProfileConfirmed(true)}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95"
              >
                {userName}, bin ich!
              </button>
            </div>
          )}

          {isPasswordStep && (
            <div className="flex flex-col items-center text-center animate-slide-up">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-indigo-500 shadow-xl flex items-center justify-center mb-4 text-white">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                Passwort
              </h2>
              {mustChangePassword ? (
                <>
                  <p className="text-amber-600 dark:text-amber-400 font-bold text-sm mb-5">
                    Bitte setze ein neues Passwort.
                  </p>
                  <div className="w-full max-w-xs space-y-3 mb-4">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={passwordInput}
                        onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                        placeholder="Neues Passwort"
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-center text-sm outline-none dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword
                          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={passwordConfirm}
                        onChange={(e) => { setPasswordConfirm(e.target.value); setPasswordError(''); }}
                        placeholder="Passwort bestätigen"
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-center text-sm outline-none dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {passwordError && <p className="text-red-500 text-xs font-bold">{passwordError}</p>}
                  </div>
                  {passwordChanged && (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCheck size={20} />
                      Passwort geändert ✓
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 max-w-xs">
                    Dein Passwort ist bereits sicher. Du kannst es später in den Einstellungen ändern.
                  </p>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-4">
                    <CheckCheck size={20} />
                    Passwort sicher ✓
                  </div>
                </>
              )}
            </div>
          )}

          {isPermissionsStep && (
            <div className="flex flex-col items-center text-center animate-slide-up">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-amber-500 to-orange-500 shadow-xl flex items-center justify-center mb-4 text-white">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                Berechtigungen
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-5 leading-relaxed max-w-xs text-sm">
                Damit FamilyHub optimal funktioniert, benötigt die App folgende Berechtigungen:
              </p>

              <div className="w-full space-y-2 mb-5">
                {permissions.map((perm, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white dark:bg-gray-800/80 rounded-xl p-3 text-left shadow-sm border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                      {React.cloneElement(perm.icon, { className: perm.color })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{perm.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{perm.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {permissionsGranted ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCheck size={20} />
                  Berechtigungen erteilt
                </div>
              ) : (
                <button
                  onClick={requestPermissions}
                  disabled={granting}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3.5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
                >
                  {granting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Berechtigungen anfragen...
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={18} />
                      Berechtigungen erteilen
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {isFinalStep && (
            <div className="flex flex-col items-center text-center animate-slide-up">
              <div className={`w-28 h-28 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-teal-500 shadow-xl flex items-center justify-center mb-8 text-white animate-float`}>
                <Sparkles size={56} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                Alles bereit!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mb-8">
                Du kannst jetzt loslegen. FamilyHub ist startklar für dich und deine Familie.
              </p>

              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-semibold">
                  <Smartphone size={16} /> Wisch-Navigation
                </div>
                <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-full text-sm font-semibold">
                  <Globe size={16} /> Echtzeit-Sync
                </div>
              </div>

              <button
                onClick={handleFinish}
                disabled={sendingWelcome}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {sendingWelcome ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Bereite alles vor...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Los geht's!
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 px-6 pb-8">
        {step < slides.length && (
          <div className="flex items-center justify-between">
            <button
              onClick={prev}
              disabled={step === 0}
              className="p-3 rounded-2xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={24} />
            </button>

            <div className="flex gap-2">
              {Array.from({ length: totalSteps - 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'bg-blue-500 w-6'
                      : i < step
                      ? 'bg-blue-300 dark:bg-blue-700'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                profileConfirmed ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                passwordChanged ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                permissionsGranted ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <div className={`w-2 h-2 rounded-full transition-all duration-300 bg-gray-300 dark:bg-gray-600`} />
            </div>

            <button
              onClick={next}
              className="p-3 rounded-2xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}

        {isProfileStep && (
          <div className="flex justify-center">
            <button
              onClick={() => profileConfirmed && setStep(s => s + 1)}
              disabled={!profileConfirmed}
              className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Weiter
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {isPasswordStep && (
          <div className="flex justify-center">
            <button
              onClick={() => { if (!mustChangePassword) setPasswordChanged(true); if (passwordChanged || !mustChangePassword) setStep(s => s + 1); }}
              disabled={!passwordChanged && mustChangePassword}
              className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Weiter
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {(isPermissionsStep || isFinalStep) && (
          <div className="flex justify-center">
            {isPermissionsStep && (
              <button
                onClick={() => permissionsGranted && setStep(s => s + 1)}
                disabled={!permissionsGranted}
                className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Weiter
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
