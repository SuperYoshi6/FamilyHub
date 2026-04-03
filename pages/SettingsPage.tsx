import React, { useState, useRef } from 'react';
import { FamilyMember, FeedbackItem, NewsItem, AppRoute } from '../types';
import { ArrowLeft, ArrowRight, Save, LogOut, Moon, Sun, Wand2, Loader2, Info, MessageSquare, Star, ChevronRight, Check, Globe, Users, KeyRound, Image as ImageIcon, Link as LinkIcon, Camera, LayoutList, Mail, UserPlus, Send, Inbox, Trash2, CreditCard as Edit, Bell, Lock, Database, Download, Activity, CreditCard as Edit2, PenTool, X, Droplets, Zap, Gift, Smartphone, Calendar, ShoppingCart, Eye, EyeOff, LayoutGrid as Layout, Shield, FileText, ExternalLink, Wrench, Snowflake, RotateCcw, Egg, Utensils } from 'lucide-react';
import { generateAvatar } from '../services/gemini';
import { compressImage } from '../services/imageUtils';
import Logo from '../components/Logo';
import { t, Language } from '../services/translations';

// --- CONFIG & UPDATE ANLEITUNG ---
const APK_DOWNLOAD_LINK: string = "https://hjkmfodzhradtkeiyele.supabase.co/storage/v1/object/public/apps/FamilyHub.apk";
const WEBSITE_LINK: string = "https://superyoshi6.github.io/FamilyHub/install";
const APP_VERSION = "1.0.0";

interface SettingsPageProps {
    currentUser: FamilyMember;
    onUpdateUser: (updates: Partial<FamilyMember>) => void;
    onUpdateFamilyMember?: (id: string, updates: Partial<FamilyMember>) => void;
    onLogout: () => void;
    onClose?: () => void;
    darkMode: boolean;
    onToggleDarkMode: () => void;
    enableSwipe: boolean;
    onToggleSwipe: () => void;
    christmasMode?: boolean;
    onToggleChristmasMode?: () => void;
    easterMode?: boolean;
    onToggleEasterMode?: () => void;
    liquidGlass?: boolean;
    onToggleLiquidGlass?: () => void;
    globalEasterEnabled?: boolean;
    onToggleGlobalEaster?: () => void;
    globalLiquidGlassEnabled?: boolean;
    onToggleGlobalLiquidGlass?: () => void;
    onTriggerSecurityScreen?: (id: string) => void;
    disabledTabs?: Record<string, boolean>;
    onToggleTabDisabled?: (route: AppRoute) => void;
    maintenanceMode?: boolean;
    onToggleMaintenance?: () => void;
    maintenanceStart?: string;
    maintenanceEnd?: string;
    onChangeMaintenanceStart?: (value: string) => void;
    onChangeMaintenanceEnd?: (value: string) => void;
    lang: Language;
    setLang: (l: Language) => void;
    family?: FamilyMember[];
    onSendFeedback?: (item: FeedbackItem) => void;
    allFeedbacks?: FeedbackItem[];
    onMarkFeedbackRead?: (ids: string[]) => void;
    onAddNews?: (item: NewsItem) => void;
    onAddFamilyMember?: (name: string, role: 'parent' | 'child', mustChangePassword?: boolean, password?: string) => Promise<FamilyMember | null>;
    onDeleteUser: (id: string) => void;
    news?: NewsItem[];
    onDeleteNews?: (id: string) => void;
    systemStats?: any;
    backupData?: any;
    onResetPassword?: (member: FamilyMember) => void;
    onMarkNewsRead?: (id: string) => void;
    onSendAdminNotification?: (title: string, message: string) => void;
    onNavigate?: (route: AppRoute) => void;
}

const EXPANDED_COLORS = [
    { val: 'bg-red-100 text-red-700', hex: '#fee2e2' },
    { val: 'bg-orange-100 text-orange-700', hex: '#ffedd5' },
    { val: 'bg-amber-100 text-amber-700', hex: '#fef3c7' },
    { val: 'bg-yellow-100 text-yellow-700', hex: '#fef9c3' },
    { val: 'bg-lime-100 text-lime-700', hex: '#ecfccb' },
    { val: 'bg-green-100 text-green-700', hex: '#dcfce7' },
    { val: 'bg-emerald-100 text-emerald-700', hex: '#d1fae5' },
    { val: 'bg-teal-100 text-teal-700', hex: '#ccfbf1' },
    { val: 'bg-cyan-100 text-cyan-700', hex: '#cffafe' },
    { val: 'bg-sky-100 text-sky-700', hex: '#e0f2fe' },
    { val: 'bg-blue-100 text-blue-700', hex: '#dbeafe' },
    { val: 'bg-indigo-100 text-indigo-700', hex: '#e0e7ff' },
    { val: 'bg-violet-100 text-violet-700', hex: '#ede9fe' },
    { val: 'bg-purple-100 text-purple-700', hex: '#f3e8ff' },
    { val: 'bg-fuchsia-100 text-fuchsia-700', hex: '#fae8ff' },
    { val: 'bg-pink-100 text-pink-700', hex: '#fce7f3' },
    { val: 'bg-rose-100 text-rose-700', hex: '#ffe4e6' },
    { val: 'bg-slate-100 text-slate-700', hex: '#f1f5f9' },
];

const SettingsPage: React.FC<SettingsPageProps> = ({
    currentUser, onUpdateUser, onUpdateFamilyMember, onLogout, onClose, darkMode, onToggleDarkMode, enableSwipe, onToggleSwipe, christmasMode, onToggleChristmasMode, easterMode, onToggleEasterMode, liquidGlass, onToggleLiquidGlass, globalEasterEnabled, onToggleGlobalEaster, globalLiquidGlassEnabled, onToggleGlobalLiquidGlass, onTriggerSecurityScreen, disabledTabs, onToggleTabDisabled, maintenanceMode, onToggleMaintenance, maintenanceStart, maintenanceEnd, onChangeMaintenanceStart, onChangeMaintenanceEnd, lang, setLang, family, onSendFeedback, allFeedbacks, onMarkFeedbackRead, onAddNews, onAddFamilyMember, onDeleteUser, news = [], onDeleteNews, systemStats, backupData, onResetPassword, onMarkNewsRead, onSendAdminNotification, onNavigate
}) => {
    const [name, setName] = useState(currentUser.name);
    const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=1e293b&color=fff&bold=true`);
    const [selectedColor, setSelectedColor] = useState(currentUser.color);
    const [generatingAvatar, setGeneratingAvatar] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [changePassword, setChangePassword] = useState('');
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [avatarBroken, setAvatarBroken] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const adminFileInputRef = useRef<HTMLInputElement>(null);

    // Modal States
    const [activeModal, setActiveModal] = useState<'none' | 'about' | 'feedback' | 'reset-confirm' | 'admin-feedback' | 'compose' | 'inbox' | 'edit-user' | 'add-user'>('none');
    const [feedbackText, setFeedbackText] = useState('');
    const [rating, setRating] = useState(0);
    const [feedbackSent, setFeedbackSent] = useState(false);

    // Message States
    const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
    const [messageText, setMessageText] = useState('');
    const [messageSent, setMessageSent] = useState(false);

    // Admin Action States
    const [targetUser, setTargetUser] = useState<FamilyMember | null>(null);

    // Admin Edit User States
    const [editTargetUser, setEditTargetUser] = useState<FamilyMember | null>(null);
    const [editName, setEditName] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState('');
    const [isTempPassword, setIsTempPassword] = useState(false);
    const [editGenerating, setEditGenerating] = useState(false);
    const [showEditUrlInput, setShowEditUrlInput] = useState(false);
    const [editUrlInput, setEditUrlInput] = useState('');

    // Admin Add User States
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState<'parent' | 'child'>('parent');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [isAddingUser, setIsAddingUser] = useState(false);

    // Admin Broadcast Notification States
    const [broadcastTitle, setBroadcastTitle] = useState('Update verfügbar!');
    const [broadcastMessage, setBroadcastMessage] = useState('Wir haben ein Update oder eine Wartung. Bitte prüfen.');
    const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const isAdmin = currentUser.role === 'admin';
    const isEasterLocked = !isAdmin && globalEasterEnabled === false;
    const isLiquidLocked = !isAdmin && globalLiquidGlassEnabled === false;
    const tabOptions = [
        { route: AppRoute.WEATHER, label: 'Wetter', icon: Droplets },
        { route: AppRoute.CALENDAR, label: 'Kalender', icon: Calendar },
        { route: AppRoute.MEALS, label: 'Mahlzeiten', icon: Utensils },
        { route: AppRoute.LISTS, label: 'Listen', icon: ShoppingCart },
        { route: AppRoute.ACTIVITIES, label: 'Aktivitäten', icon: Activity },
    ];
    const unreadFeedbacks: FeedbackItem[] = allFeedbacks?.filter(f => !f.read) || [];
    const unreadCount = unreadFeedbacks.length;

    const myMessages = news?.filter(n => n.tag === `PRIVATE:${currentUser.id}`).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

    // --- STYLES HELPER ---
    const modalBgClass = 'bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-2xl';

    const modalBorderClass = '';

    const closeBtnClass = 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800';

    const titleClass = 'text-gray-900 dark:text-white';

    const sectionBgClass = 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700';

    const handleSave = () => {
        const updates: Partial<FamilyMember> = { name, avatar: avatarUrl, color: selectedColor };
        if (changePassword.trim()) {
            if (!isAdmin) {
                alert("Nur Admins dürfen Passwörter setzen.");
                return;
            }
            if (changePassword.trim().length < 4) {
                alert("Das Passwort muss mindestens 4 Zeichen lang sein.");
                return;
            }
            updates.password = changePassword.trim();
            updates.mustChangePassword = false;
        }

        if (onUpdateFamilyMember) {
            onUpdateFamilyMember(currentUser.id, updates);
        }
        onUpdateUser(updates);

        if (changePassword.trim()) setChangePassword('');
        if (onClose) onClose();
    };

    const handleGenerateAvatar = async () => {
        setGeneratingAvatar(true);
        setShowUrlInput(false);
        const newAvatar = await generateAvatar();
        if (newAvatar) {
            const compressed = await compressImage(newAvatar, 300, 0.7);
            setAvatarUrl(compressed);
        } else {
            const randomId = Math.floor(Math.random() * 1000);
            setAvatarUrl(`https://picsum.photos/200/200?random=${randomId}`);
        }
        setGeneratingAvatar(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setGeneratingAvatar(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                const compressed = await compressImage(base64, 400, 0.7);
                setAvatarUrl(compressed);
                setGeneratingAvatar(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUrlSubmit = () => {
        if (urlInput.trim()) {
            setAvatarBroken(false);
            setAvatarUrl(urlInput.trim());
            setShowUrlInput(false);
            setUrlInput('');
        }
    };

    const handleResetClick = (member: FamilyMember) => {
        setTargetUser(member);
        setActiveModal('reset-confirm');
    };

    const openEditModal = (user: FamilyMember) => {
        setEditTargetUser(user);
        setEditName(user.name);
        setEditAvatarUrl(user.avatar || '');
        setIsTempPassword(user.mustChangePassword || false);
        setShowEditUrlInput(false); // Reset URL input visibility
        setEditUrlInput(''); // Clear URL input
        setActiveModal('edit-user');
    };

    const handleAdminGenerateAvatar = async () => {
        setEditGenerating(true);
        setShowEditUrlInput(false);
        const newAvatar = await generateAvatar();
        if (newAvatar) {
            const compressed = await compressImage(newAvatar, 300, 0.7);
            setEditAvatarUrl(compressed);
        } else {
            const randomId = Math.floor(Math.random() * 1000);
            setEditAvatarUrl(`https://picsum.photos/200/200?random=${randomId}`);
        }
        setEditGenerating(false);
    };

    const handleAdminFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEditGenerating(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                const compressed = await compressImage(base64, 400, 0.7);
                setEditAvatarUrl(compressed);
                setEditGenerating(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAdminUrlSubmit = () => {
        if (editUrlInput.trim()) {
            setEditAvatarUrl(editUrlInput.trim());
            setShowEditUrlInput(false);
            setEditUrlInput('');
        }
    }

    const saveUserEdit = () => {
        if (!editTargetUser || !onUpdateFamilyMember) return;
        onUpdateFamilyMember(editTargetUser.id, {
            name: editName,
            avatar: editAvatarUrl,
            mustChangePassword: isTempPassword
        });
        setActiveModal('none');
        setEditTargetUser(null);
    };

    const openCompose = () => {
        setMessageText('');
        if (family && family.length > 1) {
            const firstOther = family.find(f => f.id !== currentUser.id);
            if (firstOther) setSelectedRecipientId(firstOther.id);
        }
        setActiveModal('compose');
    };

    const handleSendMessage = () => {
        if (!messageText.trim() || !onAddNews || !selectedRecipientId) return;
        const title = `Nachricht von ${currentUser.name}`;
        const newItem: NewsItem = {
            id: Date.now().toString(),
            title: title,
            description: messageText,
            tag: `PRIVATE:${selectedRecipientId}`,
            image: undefined,
            createdAt: new Date().toISOString(),
            authorId: currentUser.id,
            readBy: []
        };
        onAddNews(newItem);
        setMessageSent(true);
        setTimeout(() => {
            setMessageSent(false);
            setMessageText('');
            setActiveModal('none');
        }, 2000);
    };

    const confirmReset = () => {
        if (targetUser && onResetPassword) {
            onResetPassword(targetUser);
            setActiveModal('none');
            setTargetUser(null);
            alert("Reset aktiviert. Nutzer setzt sein Passwort beim nächsten Login.");
        }
    };

    const handleAddUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newUserName.trim() && onAddFamilyMember) {
            if (isTempPassword && !newUserPassword.trim()) {
                alert("Bitte geben Sie ein temporäres Passwort ein.");
                return;
            }
            const password = isTempPassword ? newUserPassword.trim() : undefined;
            onAddFamilyMember(newUserName, newUserRole, isTempPassword, password);
            setNewUserName('');
            setNewUserRole('parent');
            setNewUserPassword('');
            setActiveModal('none');
            setIsTempPassword(false);
        }
    };

    const submitFeedback = (e: React.FormEvent) => {
        e.preventDefault();
        if (onSendFeedback) {
            onSendFeedback({
                id: Date.now().toString(),
                userId: currentUser.id,
                userName: currentUser.name,
                text: feedbackText,
                rating: rating,
                createdAt: new Date().toISOString()
            });
        }
        setFeedbackSent(true);
        setTimeout(() => {
            setFeedbackSent(false);
            setFeedbackText('');
            setRating(0);
            setActiveModal('none');
        }, 2000);
    };

    const openAdminFeedback = () => {
        setActiveModal('admin-feedback');
        if (unreadCount > 0 && onMarkFeedbackRead) {
            const ids = unreadFeedbacks.map(f => f.id);
            onMarkFeedbackRead(ids);
        }
    };

    const handleDownloadUpdate = () => {
        if (APK_DOWNLOAD_LINK && APK_DOWNLOAD_LINK !== '#') {
            const link = APK_DOWNLOAD_LINK as string;
            const separator = link.includes('?') ? '&' : '?';
            const freshLink = `${link}${separator}t=${Date.now()}`;
            window.open(freshLink, '_blank');
        } else {
            alert("Der Update-Server ist noch nicht eingerichtet (Link fehlt).");
        }
    };

    return (
        <div className="flex flex-col min-h-full">
            <div className={`px-4 py-4 flex items-center shadow-sm sticky top-0 z-10 border-b bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800`}>
                <button onClick={onClose} className="mr-4 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition">
                    <ArrowLeft size={24} />
                </button>
                <span className={`font-bold text-xl text-gray-800 dark:text-white`}>{t('settings.title', lang)}</span>
            </div>

            <div className="flex-1 p-6 space-y-6 max-w-md mx-auto w-full">
                {/* Profile Section */}
                <section className="space-y-6">
                    <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('settings.profile', lang)}</h2>

                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-md relative bg-gray-200">
                                {generatingAvatar ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                        <Loader2 className="animate-spin text-blue-500" size={32} />
                                    </div>
                                ) : (
                                    <img src={avatarBroken ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e293b&color=fff&bold=true` : (avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e293b&color=fff&bold=true`)} alt="Profil" className="w-full h-full object-cover" onError={() => setAvatarBroken(true)} />
                                )}
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            <button onClick={handleGenerateAvatar} disabled={generatingAvatar} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition" title="KI Avatar"><Wand2 size={20} /></button>
                            <button onClick={() => fileInputRef.current?.click()} disabled={generatingAvatar} className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-2.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 transition" title="Upload"><Camera size={20} /></button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                            <button onClick={() => setShowUrlInput(!showUrlInput)} disabled={generatingAvatar} className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 p-2.5 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/40 transition" title="URL"><LinkIcon size={20} /></button>
                        </div>

                        {showUrlInput && (
                            <div className="flex w-full space-x-2 animate-fade-in">
                                <input type="text" placeholder="Bild URL einfügen..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                                <button onClick={handleUrlSubmit} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-bold">OK</button>
                            </div>
                        )}
                    </div>

                    <div className={`p-4 rounded-2xl shadow-sm space-y-4 ${sectionBgClass}`}>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('settings.display_name', lang)}</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        {isAdmin ? (
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Passwort ändern</label>
                                <input
                                    type={showChangePassword ? 'text' : 'password'}
                                    value={changePassword}
                                    onChange={(e) => setChangePassword(e.target.value)}
                                    placeholder="Neues Passwort"
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button type="button" onClick={() => setShowChangePassword(!showChangePassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">
                                    {showChangePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500 dark:text-gray-400">

                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('settings.your_color', lang)}</label>
                            <div className="grid grid-cols-6 gap-3">
                                {EXPANDED_COLORS.map((c) => (
                                    <button key={c.val} onClick={() => setSelectedColor(c.val)} className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm hover:shadow-md relative overflow-hidden" style={{ backgroundColor: c.hex }}>
                                        {selectedColor === c.val && <div className="bg-black/20 w-full h-full flex items-center justify-center"><Check size={16} className="text-white drop-shadow-md" /></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* App Settings */}
                <section className="space-y-4">
                    <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('settings.app_settings', lang)}</h2>
                    <div className={`p-4 rounded-2xl shadow-sm space-y-2 ${sectionBgClass}`}>

                        {/* 1. Nachrichten */}
                        <button onClick={() => setActiveModal('inbox')} className="flex items-center justify-between w-full py-2 group">
                            <div className="flex items-center space-x-3">
                                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-full text-indigo-600 dark:text-indigo-400">
                                    <Mail size={20} />
                                </div>
                                <span className="font-bold text-gray-800 dark:text-white">Nachrichten</span>
                            </div>
                            <div className="flex items-center">
                                {myMessages.length > 0 && <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mr-2">{myMessages.length}</span>}
                                <ChevronRight size={20} className="text-gray-400 group-hover:text-indigo-500 transition" />
                            </div>
                        </button>


                        {/* 2. Dark Mode */}
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full text-gray-600 dark:text-gray-300">
                                    {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                                </div>
                                <span className="font-bold text-gray-800 dark:text-white">{t('settings.dark_mode', lang)}</span>
                            </div>
                            <button onClick={onToggleDarkMode} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* 3. Swipe Navigation */}
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center space-x-3">
                                <div className="bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded-full text-cyan-600 dark:text-cyan-400">
                                    <ArrowRight size={20} />
                                </div>
                                <span className="font-bold text-gray-800 dark:text-white">Wischen zum Wechseln</span>
                            </div>
                            <button onClick={onToggleSwipe} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none border-none ring-0 ${enableSwipe ? 'bg-cyan-500' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${enableSwipe ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* 4. Christmas Mode (Global) */}
                        {onToggleChristmasMode && (
                            <>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full text-red-600 dark:text-red-400">
                                            <Snowflake size={20} />
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white">Weihnachts-Modus</span>
                                    </div>
                                    <button onClick={onToggleChristmasMode} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none border-none ring-0 ${christmasMode ? 'bg-red-500' : 'bg-gray-300'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${christmasMode ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </>
                        )}

                        {/* 5. Easter Mode (Global) */}
                        {onToggleEasterMode && (
                            <>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-full text-pink-600 dark:text-pink-400">
                                            <Egg size={20} />
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white">Ostermodus</span>
                                    </div>
                                    <button onClick={() => { if (!isEasterLocked) onToggleEasterMode(); }} disabled={isEasterLocked} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none border-none ring-0 ${easterMode ? 'bg-pink-500' : 'bg-gray-300'} ${isEasterLocked ? 'opacity-40 cursor-not-allowed' : ''}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${easterMode ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                {isEasterLocked && (
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 ml-12">Vom Admin deaktiviert</div>
                                )}
                            </>
                        )}

                        {/* 6. Liquid Glass Mode (Interactive) */}
                        {onToggleLiquidGlass && (
                            <>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                                            <Droplets size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 dark:text-white leading-none">Liquid Glass</span>
                                            <span className="text-[10px] text-gray-500 mt-0.5">Glaseffekte & Gesten</span>
                                        </div>
                                    </div>
                                    <button onClick={() => { if (!isLiquidLocked) onToggleLiquidGlass(); }} disabled={isLiquidLocked} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none border-none ring-0 ${liquidGlass ? 'bg-blue-500' : 'bg-gray-300'} ${isLiquidLocked ? 'opacity-40 cursor-not-allowed' : ''}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${liquidGlass ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                {isLiquidLocked && (
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 ml-12">Vom Admin deaktiviert</div>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* Admin Panel (Admin Only) */}
                {currentUser.role === 'admin' && (
                    <section className="space-y-4">
                        <div className="flex justify-between items-end px-1">
                            <h2 className="text-sm font-bold text-red-600 dark:text-red-300 uppercase tracking-wider">Admin Panel</h2>
                            <span className="text-[10px] text-white bg-red-600 dark:bg-red-500 px-2 py-0.5 rounded-full font-bold">Sicherheitsmodus</span>
                        </div>
                        <div className="p-3 rounded-xl border border-red-400 bg-red-100 dark:bg-red-950/60 dark:border-red-700 text-red-800 dark:text-red-200 mb-3">
                            <strong>Achtung:</strong> Dieser Bereich ist kritisch. Bearbeite Nutzer/Passwörter nur, wenn du wirklich weißt, was du tust.
                        </div>
                        <div className="rounded-2xl shadow-lg border border-red-500/40 overflow-hidden bg-red-50/40 dark:bg-red-900/40">
                            {/* Global Feature Gates */}
                            {(onToggleGlobalEaster || onToggleGlobalLiquidGlass) && (
                                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                        <Layout size={16} className="mr-2 text-blue-500" />
                                        Feature-Freigaben
                                    </h3>
                                    <div className="space-y-3">
                                        {onToggleGlobalEaster && (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-full text-pink-600 dark:text-pink-400">
                                                        <Egg size={16} />
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Ostermodus für alle</span>
                                                </div>
                                                <button onClick={onToggleGlobalEaster} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none border-none ring-0 ${globalEasterEnabled ? 'bg-pink-500' : 'bg-gray-300'}`}>
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${globalEasterEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        )}
                                        {onToggleGlobalLiquidGlass && (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                                                        <Droplets size={16} />
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Liquid Glass für alle</span>
                                                </div>
                                                <button onClick={onToggleGlobalLiquidGlass} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none border-none ring-0 ${globalLiquidGlassEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${globalLiquidGlassEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab Locks + Maintenance */}
                            {onToggleTabDisabled && disabledTabs && (
                                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                        <Lock size={16} className="mr-2 text-blue-500" />
                                        Tabs sperren
                                    </h3>
                                    <div className="space-y-3">
                                        {tabOptions.map((t) => {
                                            const Icon = t.icon;
                                            const isClosed = !!disabledTabs[t.route];
                                            return (
                                                <div key={t.route} className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-600 dark:text-slate-300">
                                                            <Icon size={16} />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.label}</span>
                                                    </div>
                                                    <button onClick={() => onToggleTabDisabled(t.route)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none border-none ring-0 ${isClosed ? 'bg-red-500' : 'bg-gray-300'}`}>
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isClosed ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">Gesperrte Tabs zeigen den Hinweis: „Der Admin hat diesen Tab vorübergehend geschlossen“.</div>

                                    {onToggleMaintenance && (
                                        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <Wrench size={16} className="text-yellow-600" />
                                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Wartungsmodus</span>
                                                </div>
                                                <button onClick={onToggleMaintenance} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none border-none ring-0 ${maintenanceMode ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            {maintenanceMode && (onChangeMaintenanceStart || onChangeMaintenanceEnd) && (
                                                <div className="mt-3 grid grid-cols-1 gap-3">
                                                    {onChangeMaintenanceStart && (
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Start (optional)</label>
                                                            <input
                                                                type="datetime-local"
                                                                value={maintenanceStart || ''}
                                                                onChange={(e) => onChangeMaintenanceStart(e.target.value)}
                                                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                                            />
                                                        </div>
                                                    )}
                                                    {onChangeMaintenanceEnd && (
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Ende (optional)</label>
                                                            <input
                                                                type="datetime-local"
                                                                value={maintenanceEnd || ''}
                                                                onChange={(e) => onChangeMaintenanceEnd(e.target.value)}
                                                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">Nutzer sehen nur Wartung + Update-Download.</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Family Management Sub-Section */}
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                    <Users size={16} className="mr-2 text-blue-500" />
                                    Nutzer-Verwaltung
                                </h3>
                                <div className="space-y-3">
                                    {/* Add User Button */}
                                    <button
                                        onClick={() => setActiveModal('add-user')}
                                        className="w-full flex items-center justify-center p-3 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-blue-600 dark:text-blue-400 font-bold text-sm"
                                    >
                                        <UserPlus size={18} className="mr-2" /> Neuen Nutzer hinzufügen
                                    </button>

                                    {/* Existing Users */}
                                    {family && family.filter(f => f.id !== currentUser.id && f.role !== 'admin').map(member => (
                                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <div className="flex items-center space-x-3">
                                                <img src={member.avatar} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600" />
                                                <span className="font-medium text-gray-800 dark:text-white">{member.name}</span>
                                            </div>
                                            <div className="flex space-x-2">
                                                {onTriggerSecurityScreen && (
                                                    <button
                                                        onClick={() => onTriggerSecurityScreen(member.id)}
                                                        className="p-2 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                                        title="Sicherheits-Screen beim nächsten Login"
                                                    >
                                                        <Shield size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openEditModal(member)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                                    title="Bearbeiten"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleResetClick(member)}
                                                    className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center"
                                                >
                                                    <KeyRound size={12} className="mr-1.5" />
                                                    Passwort
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {family && family.filter(f => f.id !== currentUser.id && f.role !== 'admin').length === 0 && (
                                        <div className="text-center py-4 text-gray-400 text-sm italic">Keine anderen Nutzer vorhanden.</div>
                                    )}
                                </div>
                            </div>

                            {/* Admin Broadcast Sub-Section */}
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                    <Bell size={16} className="mr-2 text-green-500" />
                                    Broadcast-Nachricht
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Titel</label>
                                        <input
                                            type="text"
                                            value={broadcastTitle}
                                            onChange={(e) => setBroadcastTitle(e.target.value)}
                                            placeholder="z.B. Update verfügbar!"
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Nachricht</label>
                                        <textarea
                                            value={broadcastMessage}
                                            onChange={(e) => setBroadcastMessage(e.target.value)}
                                            placeholder="Ihre Broadcast-Nachricht..."
                                            rows={3}
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                        />
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (broadcastMessage.trim().length === 0) {
                                                alert('Bitte Nachricht eingeben.');
                                                return;
                                            }
                                            setBroadcastStatus('sending');
                                            try {
                                                await onSendAdminNotification?.(broadcastTitle, broadcastMessage);
                                                setBroadcastStatus('sent');
                                                setTimeout(() => setBroadcastStatus('idle'), 3000);
                                            } catch (err) {
                                                console.error(err);
                                                setBroadcastStatus('error');
                                                setTimeout(() => setBroadcastStatus('idle'), 3000);
                                            }
                                        }}
                                        disabled={broadcastStatus === 'sending'}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition disabled:opacity-50"
                                    >
                                        <Send size={16} />
                                        {broadcastStatus === 'sending' ? 'Wird gesendet...' : 'Broadcast senden'}
                                    </button>
                                    {broadcastStatus === 'sent' && <p className="text-xs text-green-600 mt-2 flex items-center"><Check size={14} className="mr-1" /> Broadcast erfolgreich gesendet!</p>}
                                    {broadcastStatus === 'error' && <p className="text-xs text-red-600 mt-2">Fehler beim Versand. Bitte erneut versuchen.</p>}
                                </div>
                            </div>

                            {/* Admin Feedback Sub-Section */}
                            <div className="p-4">
                                <button onClick={openAdminFeedback} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition bg-yellow-50/50 dark:bg-yellow-900/10">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 p-2 rounded-full">
                                            <Inbox size={18} />
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white">Feedback-Posteingang</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
                                        <ChevronRight size={18} className="text-gray-400" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* Support & Info */}
                {/* Support & Info + App Info Section */}
                <div className="space-y-6">
                    <section className="space-y-4">
                        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('settings.info_help', lang)}</h2>
                        <div className={`rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden bg-white dark:bg-gray-800`}>
                            <button onClick={() => setActiveModal('feedback')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 p-2 rounded-full"><MessageSquare size={18} /></div>
                                    <span className="font-medium text-gray-800 dark:text-white">Feedback</span>
                                </div>
                                <ChevronRight size={18} className="text-gray-400" />
                            </button>

                            <button onClick={() => setActiveModal('about')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2 rounded-full"><Info size={18} /></div>
                                    <span className="text-sm font-medium text-gray-800 dark:text-white">App Info & Updates</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">v{APP_VERSION}</span>
                                    <ChevronRight size={18} className="text-gray-400" />
                                </div>
                            </button>
                        </div>
                    </section>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4">
                    <button onClick={handleSave} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 active:scale-[0.98] transition hover:bg-blue-700">
                        <Save size={20} /><span>{t('settings.save', lang)}</span>
                    </button>
                    <button onClick={onLogout} className="w-full bg-white dark:bg-gray-800 text-red-500 font-bold py-4 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 flex items-center justify-center space-x-2 active:scale-[0.98] transition hover:bg-red-50 dark:hover:bg-red-900/20">
                        <LogOut size={20} /><span>{t('settings.logout', lang)}</span>
                    </button>
                </div>
            </div>

            {/* --- Modals --- */}

            {/* Inbox Modal */}
            {activeModal === 'inbox' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
                    <div className={`${modalBgClass} w-full max-w-sm rounded-3xl p-6 relative max-h-[80vh] flex flex-col ${modalBorderClass}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-2xl font-bold ${titleClass}`}>Nachrichten</h3>
                            <button onClick={() => setActiveModal('none')} className={closeBtnClass}><X size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-6 min-h-[200px]">
                            {myMessages.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center h-full space-y-2 text-gray-400 opacity-60`}>
                                    <Inbox size={48} strokeWidth={1} />
                                    <p className="text-sm font-medium">Keine Nachrichten</p>
                                </div>
                            ) : (
                                myMessages.map(msg => {
                                    const sender = family?.find(f => f.id === msg.authorId);
                                    const isRead = msg.readBy?.includes(currentUser.id);

                                    const cardBg = `bg-gray-50 dark:bg-gray-800 border ${!isRead ? 'border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-100 dark:ring-indigo-900' : 'border-gray-100 dark:border-gray-700'}`;

                                    const textColor = 'text-gray-800 dark:text-gray-200';
                                    const subTextColor = 'text-gray-700 dark:text-gray-300';

                                    return (
                                        <div key={msg.id} className={`${cardBg} p-4 rounded-2xl relative border transition-all`}>
                                            <div className="flex items-center space-x-2 mb-2">
                                                {sender ? (
                                                    <>
                                                        <img src={sender.avatar} className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600" />
                                                        <span className={`text-xs font-bold ${subTextColor}`}>{sender.name}</span>
                                                    </>
                                                ) : (
                                                    <span className={`text-xs font-bold ${subTextColor}`}>{msg.title?.replace('Nachricht von ', '') || 'Unbekannt'}</span>
                                                )}
                                                <span className={`text-[10px] ml-auto opacity-70 ${subTextColor}`}>{new Date(msg.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className={`text-sm ${textColor}`}>{msg.description}</p>

                                            <div className="flex justify-end gap-2 mt-2">
                                                {!isRead && onMarkNewsRead && (
                                                    <button onClick={() => onMarkNewsRead(msg.id)} className="text-blue-500 hover:text-blue-700 p-1" title="Als gelesen markieren">
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                                {onDeleteNews && (
                                                    <button onClick={() => onDeleteNews(msg.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <button onClick={openCompose} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition">
                            <Edit size={18} /> <span>Neue Nachricht</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Compose Message Modal */}
            {activeModal === 'compose' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
                    <div className={`${modalBgClass} w-full max-w-sm rounded-3xl p-6 relative ${modalBorderClass}`}>
                        <div className="flex items-center mb-6">
                            {!messageSent && (
                                <button onClick={() => setActiveModal('inbox')} className="text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center mr-auto hover:underline">
                                    <ArrowLeft size={16} className="mr-1" /> Zurück
                                </button>
                            )}
                            <h3 className={`text-lg font-bold ${titleClass} ${messageSent ? 'w-full text-center' : 'absolute left-1/2 transform -translate-x-1/2'}`}>
                                {messageSent ? 'Gesendet' : 'Neue Nachricht'}
                            </h3>
                            {!messageSent && (
                                <button onClick={() => setActiveModal('none')} className={`ml-auto ${closeBtnClass}`}><X size={24} /></button>
                            )}
                        </div>

                        {!messageSent ? (
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2`}>Empfänger</label>
                                    <select
                                        value={selectedRecipientId}
                                        onChange={(e) => setSelectedRecipientId(e.target.value)}
                                        className={`w-full rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white border-gray-200 dark:border-gray-700`}
                                    >
                                        <option value="" disabled>Wähle jemanden...</option>
                                        {family?.filter(f => f.id !== currentUser.id).map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <textarea
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder="Deine Nachricht..."
                                        className={`w-full rounded-xl p-4 text-sm outline-none resize-none h-32 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white border-gray-200 dark:border-gray-700`}
                                    />
                                </div>

                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageText.trim() || !selectedRecipientId}
                                    className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:shadow-none active:scale-95 transition"
                                >
                                    <Send size={18} />
                                    <span>Senden</span>
                                </button>
                            </div>
                        ) : (
                            <div className="py-8 flex flex-col items-center text-center animate-fade-in">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                                    <Check size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Danke!</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Deine Nachricht wurde verschickt.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* About Modal */}
            {activeModal === 'about' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className={`${modalBgClass} w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col ${modalBorderClass} transition-colors`}>

                        {/* Header Gradient */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-center relative shrink-0">
                            <button onClick={() => setActiveModal('none')} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 p-1.5 rounded-full backdrop-blur-sm transition"><X size={20} /></button>
                            <div className="bg-white p-3 rounded-2xl shadow-lg inline-block mb-3">
                                <Logo size={48} />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">FamilyHub</h2>
                            <p className="text-blue-100 text-sm font-medium opacity-90">Version {APP_VERSION}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">

                            {/* What's New Section - RESTORED HERE */}
                            <section>
                                <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-gray-400 dark:text-gray-500`}>
                                    <Zap size={14} className="text-yellow-500" /> Neu in {APP_VERSION}
                                </h3>
                                <div className="space-y-3">
                                    <div className={`bg-cyan-50 dark:bg-cyan-900/10 border-cyan-100 p-3 rounded-xl border dark:border-cyan-800 flex gap-3 items-start`}>
                                        <div className={`bg-cyan-100 dark:bg-cyan-800 text-cyan-600 p-2 rounded-full dark:text-cyan-300 shrink-0`}><RotateCcw size={16} /></div>
                                        <div>
                                            <h4 className={`font-bold text-sm text-gray-800 dark:text-white`}>Wiederherstellung</h4>
                                            <p className={`text-xs mt-0.5 text-gray-600 dark:text-gray-400`}>Dashboard, Kalender und Listen zeigen wieder alle Inhalte an.</p>
                                        </div>
                                    </div>
                                    <div className={`bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 p-3 rounded-xl border dark:border-indigo-800 flex gap-3 items-start`}>
                                        <div className={`bg-indigo-100 dark:bg-indigo-800 text-indigo-600 p-2 rounded-full dark:text-indigo-300 shrink-0`}><Droplets size={16} /></div>
                                        <div>
                                            <h4 className={`font-bold text-sm text-gray-800 dark:text-white`}>Liquid Exklusiv</h4>
                                            <p className={`text-xs mt-0.5 text-gray-600 dark:text-gray-400`}>Slider-Animationen und Gestensteuerung sind nur noch im Liquid-Modus aktiv.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Website Card */}
                            <div
                                className={`p-4 rounded-3xl border flex items-center justify-between cursor-pointer transition active:scale-[0.98] group bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md`}
                                onClick={() => window.open(WEBSITE_LINK, '_blank')}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                        <Globe size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-base">Webseite</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 truncate">superyoshi6.github.io/FamilyHub</p>
                                    </div>
                                </div>
                                <ExternalLink size={20} className="text-gray-400 group-hover:text-purple-500 transition ml-2" />
                            </div>

                            {/* Update Card */}
                            <div
                                className={`p-6 rounded-3xl cursor-pointer transition active:scale-[0.98] flex items-center justify-between group bg-[#0f172a] text-white shadow-xl`}
                                onClick={handleDownloadUpdate}
                            >
                                <div>
                                    <h3 className="font-bold text-xl text-white mb-1">App Update</h3>
                                    <p className="text-gray-400 text-sm">Neueste Version laden.</p>
                                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-gray-300">
                                        v{APP_VERSION}
                                    </div>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white group-hover:bg-white/20 transition">
                                    <Download size={28} />
                                </div>
                            </div>

                            <div className="text-center pt-8 space-y-1">
                                <p className={`text-[10px] font-medium text-gray-400`}>&copy; 2026 FamilyHub. Alle Rechte vorbehalten.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Confirmation Modal */}
            {activeModal === 'reset-confirm' && targetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
                    <div className={`${modalBgClass} w-full max-w-sm rounded-2xl shadow-2xl p-6 relative ${modalBorderClass}`}>
                        <h3 className={`text-lg font-bold ${titleClass} mb-2`}>{t('Passwort zurücksetzen', lang)}?</h3>
                        <p className={`text-gray-600 dark:text-gray-300 mb-6`}>Der Nutzer kann sich noch mit seinem aktuellen Passwort anmelden und muss danach ein neues setzen.</p>
                        <div className="flex space-x-3">
                            <button onClick={() => setActiveModal('none')} className={`flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`}>Abbrechen</button>
                            <button onClick={confirmReset} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold shadow-lg">Reset aktivieren</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal (ADMIN) */}
            {activeModal === 'edit-user' && editTargetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
                    <div className={`${modalBgClass} w-full max-w-sm rounded-2xl shadow-2xl p-6 relative ${modalBorderClass}`}>
                        <button onClick={() => setActiveModal('none')} className={`absolute top-4 right-4 ${closeBtnClass}`}><X size={24} /></button>
                        <h3 className={`text-lg font-bold ${titleClass} mb-6`}>Benutzer bearbeiten</h3>

                        <div className="flex flex-col items-center space-y-4 mb-6">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 dark:border-gray-700 relative bg-gray-100 dark:bg-gray-700">
                                {editGenerating ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                        <Loader2 className="animate-spin text-blue-500" size={24} />
                                    </div>
                                ) : (
                                    <img src={editAvatarUrl} className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={handleAdminGenerateAvatar} disabled={editGenerating} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition" title="KI Generieren"><Wand2 size={16} /></button>
                                <button onClick={() => adminFileInputRef.current?.click()} disabled={editGenerating} className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 transition" title="Datei Upload"><Camera size={16} /></button>
                                <input type="file" ref={adminFileInputRef} onChange={handleAdminFileUpload} accept="image/*" className="hidden" />
                                <button onClick={() => setShowEditUrlInput(!showEditUrlInput)} disabled={editGenerating} className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 p-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/40 transition" title="Link"><LinkIcon size={16} /></button>
                            </div>

                            {showEditUrlInput && (
                                <div className="flex w-full space-x-2 animate-fade-in">
                                    <input
                                        type="text"
                                        placeholder="Bild URL einfügen..."
                                        value={editUrlInput}
                                        onChange={(e) => setEditUrlInput(e.target.value)}
                                        className={`flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border-gray-200 dark:border-gray-600`}
                                    />
                                    <button onClick={handleAdminUrlSubmit} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-bold">OK</button>
                                </div>
                            )}
                        </div>

                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Name"
                            className={`w-full rounded-xl p-3 mb-4 text-sm outline-none font-bold text-center bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border-gray-200 dark:border-gray-600`}
                        />

                        <div className="flex items-center justify-between mb-6 px-2">
                            <span className="text-sm font-medium">Temporäres Passwort</span>
                            <button
                                onClick={() => setIsTempPassword(!isTempPassword)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${isTempPassword ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isTempPassword ? 'right-1' : 'left-1'}`}></div>
                            </button>
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={() => {
                                    if (confirm(`Benutzer ${editTargetUser.name} wirklich löschen?`)) {
                                        onDeleteUser(editTargetUser.id);
                                        setActiveModal('none');
                                    }
                                }}
                                className="flex-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-bold py-3 rounded-xl hover:bg-red-100 transition"
                            >
                                Löschen
                            </button>
                            <button onClick={saveUserEdit} disabled={!editName.trim()} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition disabled:opacity-50">Speichern</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal (ADMIN) */}
            {activeModal === 'add-user' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className={`${modalBgClass} w-full max-w-sm rounded-2xl shadow-2xl p-6 relative ${modalBorderClass}`}>
                        <button onClick={() => setActiveModal('none')} className={`absolute top-4 right-4 ${closeBtnClass}`}><X size={24} /></button>
                        <h3 className={`text-lg font-bold ${titleClass} mb-4`}>Nutzer hinzufügen</h3>

                        <form onSubmit={handleAddUserSubmit} className="space-y-4">
                            <input
                                type="text"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                placeholder="Name"
                                className={`w-full rounded-xl p-3 text-sm outline-none font-bold bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border-gray-200 dark:border-gray-600`}
                                autoFocus
                            />
                            <div className={`flex gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-700/50`}>
                                <button
                                    type="button"
                                    onClick={() => setNewUserRole('parent')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newUserRole === 'parent' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
                                >
                                    Elternteil
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewUserRole('child')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newUserRole === 'child' ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-300 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
                                >
                                    Kind
                                </button>
                            </div>

                            <div className="flex items-center justify-between mb-2 px-2">
                                <span className="text-sm font-medium">Temporäres Passwort</span>
                                <button
                                    type="button"
                                    onClick={() => setIsTempPassword(!isTempPassword)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${isTempPassword ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isTempPassword ? 'right-1' : 'left-1'}`}></div>
                                </button>
                            </div>
                            {isTempPassword && (
                                <input
                                    type="password"
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                    placeholder="Einfaches Passwort (z.B. 1234)"
                                    className={`w-full rounded-xl p-3 text-sm outline-none font-bold bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border-gray-200 dark:border-gray-600`}
                                />
                            )}
                            <button
                                type="submit"
                                disabled={!newUserName.trim() || isAddingUser}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center"
                            >
                                {isAddingUser ? <Loader2 className="animate-spin" size={20} /> : "Erstellen"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Feedback Modal */}
            {activeModal === 'feedback' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
                    <div className={`${modalBgClass} w-full max-w-sm rounded-2xl shadow-2xl p-6 relative ${modalBorderClass}`}>
                        <button onClick={() => setActiveModal('none')} className={`absolute top-4 right-4 ${closeBtnClass}`}><X size={24} /></button>
                        {!feedbackSent ? (
                            <form onSubmit={submitFeedback} className="space-y-4">
                                <h3 className={`text-lg font-bold ${titleClass} flex items-center`}><MessageSquare size={20} className="mr-2 text-pink-500" /> {t('settings.feedback', lang)}</h3>
                                <div className="flex justify-center space-x-2 py-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none transition transform hover:scale-110">
                                            <Star size={32} className={`${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    placeholder="Wie findest du die App?"
                                    rows={4}
                                    required
                                    className={`w-full rounded-xl p-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none resize-none bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border-gray-200 dark:border-gray-600`}
                                />
                                <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-[0.98] transition">Absenden</button>
                            </form>
                        ) : (
                            <div className="py-8 flex flex-col items-center text-center animate-fade-in">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600"><Check size={32} /></div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Danke!</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ADMIN Feedback View Modal */}
            {activeModal === 'admin-feedback' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className={`${modalBgClass} w-full max-w-md rounded-2xl shadow-2xl p-6 relative max-h-[80vh] flex flex-col ${modalBorderClass}`}>
                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                            <h3 className={`text-lg font-bold ${titleClass}`}>Nutzer Feedback</h3>
                            <button onClick={() => setActiveModal('none')} className={closeBtnClass}><X size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                            {allFeedbacks && allFeedbacks.length > 0 ? (
                                allFeedbacks.map(fb => (
                                    <div key={fb.id} className={`p-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`font-bold text-sm text-gray-800 dark:text-white`}>{fb.userName}</span>
                                            <div className="flex">
                                                {Array.from({ length: fb.rating }).map((_, i) => <Star key={i} size={10} className="fill-yellow-400 text-yellow-400" />)}
                                            </div>
                                        </div>
                                        <p className={`text-sm mb-2 text-gray-600 dark:text-gray-300`}>{fb.text}</p>
                                        <div className="text-[10px] text-gray-400 text-right">{new Date(fb.createdAt).toLocaleString()}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400">Kein Feedback vorhanden.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
