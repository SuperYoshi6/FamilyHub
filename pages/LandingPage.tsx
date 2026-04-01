import React from 'react';
import { Smartphone, Download, Globe, Shield, Bell, Droplets, Database } from 'lucide-react';
import Logo from '../components/Logo';
import { AppRoute } from '../types';
import { Language } from '../services/translations';

interface LandingPageProps {
    onNavigate: (route: AppRoute) => void;
    lang: Language;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, lang }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans selection:bg-blue-100 dark:selection:bg-blue-900/40">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Logo size={40} />
                        <span className="text-2xl font-black tracking-tight">FamilyHub</span>
                    </div>
                    <nav className="hidden md:flex space-x-8 text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        <a href="#features" className="hover:text-blue-500 transition-colors">Features</a>
                        <a href="#install" className="hover:text-blue-500 transition-colors">Installieren</a>
                        <a href="https://SuperYoshi6.github.io/FamilyHub/app" className="bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95">Im Web starten</a>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <main className="pt-40 pb-24 px-6 relative overflow-hidden">
                <div className="max-w-6xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest mb-10 animate-fade-in border border-blue-500/20">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Version 1.0.0 • Jetzt bereit fuer den Alltag
                    </div>
                    <h1 className="text-7xl md:text-9xl font-black mb-8 tracking-tighter leading-[0.85] animate-slide-up">
                        Das Herz eures<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Zuhauses.</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-xl text-slate-500 dark:text-slate-400 mb-14 animate-slide-up animation-delay-300 leading-relaxed font-medium">
                        Die intelligente Plattform fuer eure Familie. Modernes Liquid-Design, Supabase Sync mit Offline-Fallback und klare Admin-Sicherheit.
                    </p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 animate-slide-up animation-delay-500">
                        <a href="https://SuperYoshi6.github.io/FamilyHub/app" className="w-full md:w-auto bg-blue-600 text-white px-12 py-6 rounded-3xl text-xl font-bold hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1 transition-all active:scale-95 text-center">
                            Im Web starten 🌐
                        </a>
                        <div className="relative group w-full md:w-auto">
                            <button className="w-full md:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-12 py-6 rounded-3xl text-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-slate-200/50 dark:shadow-none">
                                <Download size={24} /> Installieren
                            </button>
                            {/* Dropdown with high Z-Index and better visibility */}
                            <div className="absolute top-[calc(100%+15px)] left-0 right-0 md:left-1/2 md:-translate-x-1/2 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-700 overflow-hidden opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[100] w-full md:w-80 p-2">
                                <a href="#install" className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all text-left">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600">
                                        <Globe size={24} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm">PWA (Web-App)</div>
                                        <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">iPhone & Android</div>
                                    </div>
                                </a>
                                <a href="https://hjkmfodzhradtkeiyele.supabase.co/storage/v1/object/public/apps/FamilyHub.apk" className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all text-left mt-1">
                                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center text-orange-500">
                                        <Smartphone size={24} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm">Android (APK)</div>
                                        <div className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mt-0.5">Vollversion v1.0.0</div>
                                    </div>
                                </a>
                                <a href="https://hjkmfodzhradtkeiyele.supabase.co/storage/v1/object/public/apps/FamilyHub.exe" className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all text-left mt-1">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/60 rounded-xl flex items-center justify-center text-slate-600">
                                        <Smartphone size={24} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm">Windows (.exe)</div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Desktop Build</div>
                                    </div>
                                </a>
                                <a href="https://hjkmfodzhradtkeiyele.supabase.co/storage/v1/object/public/apps/FamilyHub.swift.zip" className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all text-left mt-1">
                                    <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/40 rounded-xl flex items-center justify-center text-pink-500">
                                        <Smartphone size={24} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm">iOS / iPadOS</div>
                                        <div className="text-[10px] text-pink-500 font-bold uppercase tracking-widest mt-0.5">Swift Playground</div>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto mt-24 relative animate-fade-in animation-delay-700 z-0">
                    <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2.5rem] shadow-2xl overflow-hidden group">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                             <div className="bg-white/20 backdrop-blur-xl p-8 rounded-full border border-white/20 active:scale-90 transition-transform cursor-pointer">
                                <Logo size={100} />
                             </div>
                        </div>
                    </div>
                    {/* Decorative Blobs */}
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-400/20 rounded-full blur-[80px] -z-10"></div>
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-400/20 rounded-full blur-[80px] -z-10"></div>
                </div>
            </main>

            {/* Features */}
            <section id="features" className="py-20 bg-white dark:bg-gray-950 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="space-y-4">
                            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                                <Droplets size={30} />
                            </div>
                            <h3 className="text-2xl font-black">Liquid Glass UI</h3>
                            <p className="text-gray-500 dark:text-gray-400">Elegantes Glas-Design mit Light/Dark Mode und ruhiger Ansicht ohne Wobble, wenn deaktiviert.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                                <Database size={30} />
                            </div>
                            <h3 className="text-2xl font-black">Supabase Sync</h3>
                            <p className="text-gray-500 dark:text-gray-400">Live-Sync mit LocalStorage-Fallback. Laeuft stabil auch offline.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center">
                                <Shield size={30} />
                            </div>
                            <h3 className="text-2xl font-black">Admin-Sicherheit</h3>
                            <p className="text-gray-500 dark:text-gray-400">Passwort-Reset nur durch Admin, plus Sicherheits-Screen beim naechsten Login.</p>
                        </div>
                    </div>
                </div>
            </section>
            {/* Changelog Section */}
            <section className="py-20 bg-slate-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="h-12 w-1.5 bg-blue-600 rounded-full"></div>
                        <h2 className="text-4xl font-black tracking-tight">Was ist neu? <span className="text-blue-600">v1.0.0</span></h2>
                    </div>
                    <div className="grid gap-6">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <Droplets size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-xl mb-2">Liquid Glass UI</h4>
                                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">Neues Glas-Design mit Light/Dark Mode. Ohne Liquid-Modus gibt es eine ruhige, klare Navigation.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                    <Bell size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-xl mb-2">Stundliche Wetter-Updates</h4>
                                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">Die stündliche Wetter-Benachrichtigung bleibt aktiv, auch wenn die App geschlossen ist.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl">
                                    <Shield size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-xl mb-2">Admin Only Security</h4>
                                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">Passwort-Reset nur durch Admin und optionaler Sicherheits-Screen beim naechsten Login.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Install Section */}
            <section id="install" className="py-24 px-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-blue-600 rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl shadow-blue-500/40">
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                            <div className="flex-1">
                                <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight italic">FamilyHub am Handy</h2>
                                <p className="text-blue-100 text-lg mb-8">Installiere FamilyHub als Web-App (PWA) direkt auf deinem Home-Bildschirm für das beste App-Erlebnis.</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="bg-blue-500 p-1.5 rounded-lg shadow-sm"><Globe size={16} /></div>
                                            <h4 className="font-black uppercase tracking-widest text-xs">PWA (Web-App)</h4>
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
                                            <h4 className="font-black uppercase tracking-widest text-xs">Android (APK)</h4>
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
                                            <div className="bg-pink-500 p-1.5 rounded-lg shadow-sm"><Smartphone size={16} /></div>
                                            <h4 className="font-black uppercase tracking-widest text-xs">iOS (Swift)</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
                                                <p className="flex-1 text-xs font-medium italic">Lade <span className="underline decoration-pink-400">Swift Playground</span>.</p>
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

                                <a 
                                    href="https://SuperYoshi6.github.io/FamilyHub/app" 
                                    className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-transform"
                                >
                                    <Globe size={20} /> App im Browser öffnen
                                </a>
                            </div>
                            <div className="w-64 h-96 bg-gray-900 rounded-[3rem] border-[8px] border-gray-800 shadow-2xl flex items-center justify-center relative transform rotate-6 hover:rotate-0 transition-transform hidden md:flex">
                                <Logo size={80} />
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-800 rounded-b-xl"></div>
                            </div>
                        </div>
                        {/* Decorative background shapes */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-200 dark:border-gray-800 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center space-x-2">
                        <Logo size={30} />
                        <span className="font-bold opacity-50">© 2026 FamilyHub</span>
                    </div>
                    <div className="flex space-x-6 text-sm font-medium text-gray-500">
                        <a href="https://github.com/SuperYoshi6/FamilyHub" className="hover:text-blue-500 transition-colors">GitHub</a>
                        <a href="#" className="hover:text-blue-500 transition-colors">Privacy</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
