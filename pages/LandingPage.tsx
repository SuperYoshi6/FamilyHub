import React, { useState } from 'react';
import { Smartphone, Download, Globe, Shield, Bell, Database, Monitor, CloudSun, Calendar, ShoppingCart, Coffee, ClipboardList, Users, MessageSquare, Activity, Puzzle, Smartphone as SmartphoneIcon, Sparkles, Zap, Repeat, Palette, RefreshCw } from 'lucide-react';
import Logo from '../components/Logo';
import { AppRoute } from '../types';
import { Language } from '../services/translations';

interface LandingPageProps {
    onNavigate: (route: AppRoute) => void;
    lang: Language;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, lang }) => {
    const [showInstallMenu, setShowInstallMenu] = useState(false);

    const features = [
        {
            icon: CloudSun,
            title: 'Wetter',
            desc: 'Live-Wetter mit 7-Tage-Vorhersage, individuellen Metriken, Favoriten-Orten und stündlichen Push-Updates.',
            color: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
        },
        {
            icon: Calendar,
            title: 'Kalender',
            desc: 'Gemeinsamer Familienkalender mit nativer Handy-Sync (Samsung, Google, iOS). Termine anlegen, bearbeiten und löschen — inkl. Push-Benachrichtigung.',
            color: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
        },
        {
            icon: ShoppingCart,
            title: 'Einkaufsliste',
            desc: 'Geteilte Einkaufsliste mit Echtzeit-Sync. Zutaten aus Rezepten direkt übernehmen und abhaken.',
            color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
        },
        {
            icon: ClipboardList,
            title: 'Aufgaben',
            desc: 'Haushaltsaufgaben und persönliche To-dos verwalten, zuweisen und erledigen.',
            color: 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400'
        },
        {
            icon: Coffee,
            title: 'Essensplan',
            desc: 'Wöchentlicher Speiseplan mit Rezeptverwaltung, Essenswünschen und automatischer Einkaufsliste.',
            color: 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
        },
        {
            icon: Activity,
            title: 'Aktivitäten',
            desc: 'Finde Restaurants, Parks und Freizeitaktivitäten in deiner Nähe — mit Kartenanbindung.',
            color: 'bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400'
        },
        {
            icon: MessageSquare,
            title: 'News & Umfragen',
            desc: 'Familien-News teilen, Umfragen erstellen und abstimmen. Alles an einem Ort.',
            color: 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
        },
        {
            icon: Bell,
            title: 'Push-Benachrichtigungen',
            desc: 'Echtzeit-Push bei neuen Terminen, Aufgaben, Einkäufen und News — auch wenn die App geschlossen ist.',
            color: 'bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400'
        },
        {
            icon: Users,
            title: 'Familienverwaltung',
            desc: 'Profile für jedes Familienmitglied mit eigenem Passwort, Avatar und persönlichen Einstellungen.',
            color: 'bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400'
        },
        {
            icon: Shield,
            title: 'Admin-Sicherheit',
            desc: 'Admin-Kontrollen: Passwort-Reset, Sicherheitsbildschirm, Tabs sperren, Wartungsmodus.',
            color: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
        },
        {
            icon: Palette,
            title: 'Liquid Glass UI',
            desc: 'Modernes Glas-Design mit Light/Dark Mode, Sommer-Theme und flüssigen Animationen.',
            color: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400'
        },
        {
            icon: Database,
            title: 'Supabase Sync',
            desc: 'Echtzeit-Datensync über Supabase mit automatischem LocalStorage-Fallback — funktioniert auch offline.',
            color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400'
        },
        {
            icon: SmartphoneIcon,
            title: 'Native Android App',
            desc: 'Echte Android-App mit Push, Kalender-Sync, Benachrichtigungskanal und Hintergrund-Updates.',
            color: 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400'
        },
        {
            icon: Puzzle,
            title: 'Rezepte',
            desc: 'Eigene Rezepte anlegen, durchsuchen und mit einem Klick in den Essensplan übernehmen.',
            color: 'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400'
        },
        {
            icon: Repeat,
            title: 'Geräteübergreifend',
            desc: 'Nutze FamilyHub auf Android, iPhone (Web-App), Windows und im Browser — alle Daten immer synchron.',
            color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
        },
        {
            icon: RefreshCw,
            title: 'Live-Sync (Realtime)',
            desc: 'Änderungen von anderen Familienmitgliedern erscheinen sofort — dank Supabase Realtime Subscriptions.',
            color: 'bg-lime-100 dark:bg-lime-950 text-lime-600 dark:text-lime-400'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans selection:bg-blue-100 dark:selection:bg-blue-900/40">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Logo size={40} />
                        <span className="text-2xl font-black tracking-tight">FamilyHub</span>
                    </div>
                    <nav className="hidden md:flex space-x-8 text-sm font-bold tracking-widest text-gray-500 dark:text-gray-400">
                        <a href="#funktionen" className="hover:text-blue-500 transition-colors">Funktionen</a>
                        <a href="#installieren" className="hover:text-blue-500 transition-colors">Installieren</a>
                        <button onClick={() => onNavigate(AppRoute.DASHBOARD)} className="bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95">Im Web starten</button>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <main className="pt-40 pb-24 px-6 relative overflow-hidden">
                <div className="max-w-6xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black tracking-widest mb-10 animate-fade-in border border-blue-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Version 1.0.0 (Beta) • Jetz bereit für dem Alltag!
                    </div>
                    <h1 className="text-7xl md:text-9xl font-black mb-8 tracking-tighter leading-[0.85] animate-slide-up">
                        Das Herz eures<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Zuhauses.</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-xl text-slate-500 dark:text-slate-400 mb-14 animate-slide-up leading-relaxed font-medium" style={{animationDelay: '300ms'}}>
                        Die intelligente Plattform für unsere Familie. Alles an einem Ort.
                    </p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 animate-slide-up" style={{animationDelay: '500ms'}}>
                        <button onClick={() => onNavigate(AppRoute.DASHBOARD)} className="w-full md:w-auto bg-blue-600 text-white px-12 py-6 rounded-3xl text-xl font-bold hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1 transition-all active:scale-95 text-center">
                            Im Web starten 🌐
                        </button>
                        <div className="relative w-full md:w-auto">
                            <button
                                onClick={() => setShowInstallMenu(!showInstallMenu)}
                                className="w-full md:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-12 py-6 rounded-3xl text-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-slate-200/50 dark:shadow-none"
                            >
                                <Download size={24} /> Installieren
                            </button>
                            <div className={`absolute top-[calc(100%+15px)] left-0 right-0 md:left-1/2 md:-translate-x-1/2 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300 z-[100] w-full md:w-80 p-2 ${showInstallMenu ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                <a href="#installieren" onClick={() => setShowInstallMenu(false)} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all text-left">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600">
                                        <Globe size={24} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm">Web-App</div>
                                        <div className="text-[10px] text-blue-500 font-bold tracking-widest mt-0.5">iPhone & Android</div>
                                    </div>
                                </a>
                                <a href="https://hjkmfodzhradtkeiyele.supabase.co/storage/v1/object/public/apps/FamilyHub.apk" className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all text-left mt-1">
                                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center text-orange-500">
                                        <Smartphone size={24} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm">Android (APK)</div>
                                        <div className="text-[10px] text-orange-500 font-bold tracking-widest mt-0.5">Vollversion v1.0.0 (Beta)</div>
                                    </div>
                                </a>
                                <div className="flex items-center gap-4 p-4 rounded-2xl text-left mt-1 opacity-50 cursor-default">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center text-green-600">
                                        <Monitor size={24} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm">Windows</div>
                                        <div className="text-[10px] text-green-600 font-bold tracking-widest mt-0.5">Bald verfügbar</div>
                                    </div>
                                </div>
                                <a href="https://apps.apple.com/de/app/swift-playground/id908519492" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all text-left mt-1">
                                    <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/40 rounded-xl flex items-center justify-center text-pink-500">
                                        <Smartphone size={24} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm">Apple</div>
                                        <div className="text-[10px] text-pink-500 font-bold tracking-widest mt-0.5">Swift Playgrounds</div>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto mt-24 relative animate-fade-in z-0" style={{animationDelay: '700ms'}}>
                    <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2.5rem] overflow-hidden flex items-center justify-center">
                        <Logo size={120} className="opacity-90" />
                    </div>
                </div>
            </main>

            {/* Features Grid */}
            <section id="funktionen" className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black tracking-widest mb-6 border border-blue-500/20">
                            <Sparkles size={14} /> Alle Funktionen im Überblickentfer
                        </div>
                        <h2 className="text-5xl md:text-6xl font-black tracking-tight">Was FamilyHub kann</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg mt-4 max-w-2xl mx-auto">16 Funktionen, die den Familienalltag erleichtern.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="group bg-slate-50 dark:bg-gray-900 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <f.icon size={24} />
                                </div>
                                <h3 className="font-black text-lg mb-2">{f.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Install Section */}
            <section id="installieren" className="py-24 px-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-blue-600 rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl shadow-blue-500/40">
                        <div className="flex flex-col items-center">
                            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight italic">FamilyHub auf deinem Handy</h2>
                            <p className="text-blue-100 text-lg mb-8">Installiere FamilyHub für alle gängigen Betriebssysteme.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-10 w-full">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-blue-500 p-1.5 rounded-lg shadow-sm"><Globe size={16} /></div>
                                        <h4 className="font-black tracking-widest text-xs">Web-App</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
                                            <p className="flex-1 text-xs font-medium italic">Nutze <span className="underline decoration-blue-400">Chrome</span> oder Safari.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
                                            <p className="flex-1 text-xs font-medium italic">Tippe auf Teilen / Menü.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
                                            <p className="flex-1 text-xs font-medium italic">"App installieren".</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-orange-500 p-1.5 rounded-lg shadow-sm"><Smartphone size={16} /></div>
                                        <h4 className="font-black tracking-widest text-xs">Android (APK)</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
                                            <p className="flex-1 text-xs font-medium italic">Lade die <span className="underline decoration-orange-400">APK</span> Datei.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
                                            <p className="flex-1 text-xs font-medium italic">Erlaube Chrome Downloads.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
                                            <p className="flex-1 text-xs font-medium italic">Installiere die Datei.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-green-500 p-1.5 rounded-lg shadow-sm"><Monitor size={16} /></div>
                                        <h4 className="font-black tracking-widest text-xs">Windows (Desktop)</h4>
                                    </div>
                                    <div className="flex items-center justify-center py-6 text-white/60 text-xs font-medium italic">
                                        Bald verfügbar
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-pink-500 p-1.5 rounded-lg shadow-sm"><Smartphone size={16} /></div>
                                        <h4 className="font-black tracking-widest text-xs">Apple (Swift Playgrounds)</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
                                            <p className="flex-1 text-xs font-medium italic">
                                                Lade
                                                <a
                                                    href="https://apps.apple.com/de/app/swift-playground/id908519492"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="underline decoration-pink-400 ml-1 hover:text-blue-200 transition-colors"
                                                >
                                                    Swift Playground
                                                </a>.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
                                            <p className="flex-1 text-xs font-medium italic">Lade die .swift Datei.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
                                            <p className="flex-1 text-xs font-medium italic">Öffne sie in Playgrounds.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-64 h-96 bg-gray-900 rounded-[3rem] border-[8px] border-gray-800 shadow-2xl flex items-center justify-center relative">
                                <Logo size={80} />
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-800 rounded-b-xl"></div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-200 dark:border-gray-800 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center space-x-2">
                        <Logo size={30} />
                        <span className="font-bold opacity-50">© 2024-2026 FamilyHub</span>
                    </div>
                    <div className="flex space-x-6 text-sm font-medium text-gray-500">
                        <a href="https://github.com/SuperYoshi6/FamilyHub" className="hover:text-blue-500 transition-colors">GitHub</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
