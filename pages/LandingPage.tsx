import React from 'react';
import { Smartphone, Download, Globe, Shield, Calendar, ShoppingCart, Utensils } from 'lucide-react';
import Logo from '../components/Logo';

const LandingPage: React.FC = () => {
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
            <main className="pt-32 pb-20 px-6">
                <div className="max-w-6xl mx-auto text-center">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-xs font-black uppercase tracking-widest mb-8 animate-fade-in">
                        Neu: FamilyHub 1.0.0
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter leading-[0.9] animate-slide-up">
                        Eure Familie.<br/><span className="text-blue-600">Perfekt organisiert.</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400 mb-12 animate-slide-up animation-delay-300">
                        Einkaufslisten, Kalender, Essenspläne und Aufgaben – alles an einem Ort, synchronisiert für die ganze Familie.
                    </p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-slide-up animation-delay-500">
                        <a href="https://SuperYoshi6.github.io/FamilyHub/app" className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 rounded-3xl text-xl font-bold hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/40 active:scale-95">
                            Im Web starten 🌐
                        </a>
                        <div className="relative group">
                            <button className="w-full md:w-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-10 py-5 rounded-3xl text-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-750 transition-all active:scale-95 flex items-center justify-center gap-2">
                                <Download size={24} /> Installieren
                            </button>
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all z-20 w-64 md:left-1/2 md:-translate-x-1/2">
                                <a href="#install" className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 text-left">
                                    <Globe className="text-blue-500" />
                                    <div>
                                        <div className="font-bold">PWA (Web-App)</div>
                                        <div className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">Google Chrome</div>
                                        <div className="text-xs opacity-50">Browser-Installation</div>
                                    </div>
                                </a>
                                <a href="https://hjkmfodzhradtkeiyele.supabase.co/storage/v1/object/public/apps/FamilyHub.apk" className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 text-left">
                                    <Smartphone className="text-orange-500" />
                                    <div>
                                        <div className="font-bold">Android (APK)</div>
                                        <div className="text-[10px] text-orange-500 font-bold uppercase tracking-tight">Chrome benötigt</div>
                                        <div className="text-xs opacity-50">Direkte Installation</div>
                                    </div>
                                </a>
                                <a href="https://hjkmfodzhradtkeiyele.supabase.co/storage/v1/object/public/apps/FamilyHub.swift" className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                                    <Smartphone className="text-pink-500" />
                                    <div>
                                        <div className="font-bold">iOS / iPadOS</div>
                                        <div className="text-[10px] text-pink-500 font-bold uppercase tracking-tight">Swift Playground</div>
                                        <div className="text-xs opacity-50">App-Projekt öffnen</div>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Video/Mockup Mock */}
                <div className="max-w-4xl mx-auto mt-20 relative animate-fade-in animation-delay-700">
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
                            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                                <ShoppingCart size={30} />
                            </div>
                            <h3 className="text-2xl font-black">Einkaufslisten</h3>
                            <p className="text-gray-500 dark:text-gray-400">Vergesst nie wieder was. In Echtzeit synchronisierte Listen für alle Familienmitglieder.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                                <Calendar size={30} />
                            </div>
                            <h3 className="text-2xl font-black">Familienkalender</h3>
                            <p className="text-gray-500 dark:text-gray-400">Termine für alle im Überblick. Mit intelligenten Benachrichtigungen direkt aufs Handy.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center">
                                <Utensils size={30} />
                            </div>
                            <h3 className="text-2xl font-black">Essensplaner</h3>
                            <p className="text-gray-500 dark:text-gray-400">Plant eure Woche, speichert Rezepte und schickt Essenswünsche direkt an die Eltern.</p>
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
