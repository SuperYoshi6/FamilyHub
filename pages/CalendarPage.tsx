import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import SlidingTabs from '../components/SlidingTabs';
import { CalendarEvent, FamilyMember, NewsItem, Poll } from '../types';
import { MapPin, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, Trash2, Plus, Edit2, Layout, FileText, Camera, Loader2, Hash, Users, User, Share2, Pin } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { compressImage } from '../services/imageUtils';
import { NativeCalendarService } from '../services/nativeCalendar';
import ImageCarousel from '../components/ImageCarousel';
interface CalendarPageProps {
    events: CalendarEvent[];
    news: NewsItem[];
    polls?: Poll[];
    family: FamilyMember[];
    currentUser: FamilyMember;
    onAddEvent: (event: CalendarEvent) => void;
    onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
    onDeleteEvent: (id: string) => void;
    onAddNews: (item: NewsItem) => void;
    onUpdateNews?: (id: string, updates: Partial<NewsItem>) => void;
    onDeleteNews: (id: string) => void;
    onAddPoll?: (poll: Poll) => void;
    onUpdatePoll?: (id: string, updates: Partial<Poll>) => void;
    onDeletePoll?: (id: string) => void;
    onProfileClick: () => void;
    initialTab?: 'calendar' | 'news';
    onMarkNewsRead?: (id: string) => void;
    liquidGlass?: boolean;
    unreadNotifications?: number;
    onNotificationClick?: () => void;
    easterEnabled?: boolean;
}
const CalendarPage: React.FC<CalendarPageProps> = ({
    events, news, polls, family, currentUser,
    onAddEvent, onUpdateEvent, onDeleteEvent,
    onAddNews, onUpdateNews, onDeleteNews,
    onAddPoll, onUpdatePoll, onDeletePoll,
    onProfileClick, initialTab = 'calendar', liquidGlass = false,
    unreadNotifications = 0, onNotificationClick, easterEnabled = false
}) => {
    // Main Tab Categories (calendar | board)
    const [activeTab, setActiveTab] = useState<'calendar' | 'board'>(() => {
        const saved = localStorage.getItem('fh_calendar_main_tab');
        if (saved === 'calendar' || saved === 'board') return saved;
        return initialTab === 'news' ? 'board' : 'calendar';
    });

    // Sub-filters
    const [calendarFilter, setCalendarFilter] = useState<'all' | 'private'>(() => {
        const saved = localStorage.getItem('fh_calendar_filter');
        return (saved === 'all' || saved === 'private') ? saved : 'all';
    });

    const [boardFilter, setBoardFilter] = useState<'news' | 'polls'>(() => {
        const saved = localStorage.getItem('fh_board_filter');
        return (saved === 'news' || saved === 'polls') ? saved : 'news';
    });

    useEffect(() => {
        localStorage.setItem('fh_calendar_main_tab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        localStorage.setItem('fh_calendar_filter', calendarFilter);
    }, [calendarFilter]);

    useEffect(() => {
        localStorage.setItem('fh_board_filter', boardFilter);
    }, [boardFilter]);

    // Swipe Navigation Logic
    const touchStartX = useRef<number | null>(null);
    const mainTabsOrder: ('calendar' | 'board')[] = ['calendar', 'board'];

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;

        if (Math.abs(deltaX) > 70) {
            const currentIndex = mainTabsOrder.indexOf(activeTab);
            if (deltaX > 0 && currentIndex > 0) {
                setActiveTab(mainTabsOrder[currentIndex - 1]);
            } else if (deltaX < 0 && currentIndex < mainTabsOrder.length - 1) {
                setActiveTab(mainTabsOrder[currentIndex + 1]);
            }
        }
    };

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    // Event Form State
    const [manualTitle, setManualTitle] = useState('');
    const [manualDate, setManualDate] = useState('');
    const [manualEndDate, setManualEndDate] = useState('');
    const [manualStartTime, setManualStartTime] = useState('12:00');
    const [manualEndTime, setManualEndTime] = useState('13:00');
    const [manualLocation, setManualLocation] = useState('');
    const [manualDescription, setManualDescription] = useState('');
    const [manualAssignedTo, setManualAssignedTo] = useState<string[]>([currentUser.id]);

    // News State
    const [showNewsForm, setShowNewsForm] = useState(false);
    const [newsTitle, setNewsTitle] = useState('');
    const [newsDesc, setNewsDesc] = useState('');
    const [newsTag, setNewsTag] = useState('');
    const [newsImages, setNewsImages] = useState<string[]>([]);
    const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
    const [newsImageUrlInput, setNewsImageUrlInput] = useState('');
    const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
    const newsFileInputRef = useRef<HTMLInputElement>(null);
    const [processingImage, setProcessingImage] = useState(false);

    const safeEvents = events || [];
    const safeNews = news || [];

    const publicNews = [...safeNews]
        .filter(n => !n.tag?.startsWith('PRIVATE:'))
        .sort((a, b) => {
            if (a.pinned !== b.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    const [showPollForm, setShowPollForm] = useState(false);
    const [editingPollId, setEditingPollId] = useState<string | null>(null);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollDesc, setPollDesc] = useState('');
    const [pollOptions, setPollOptions] = useState<{ id: string, text: string, description: string, votes?: string[] }[]>([
        { id: '1', text: '', description: '', votes: [] },
        { id: '2', text: '', description: '', votes: [] }
    ]);
    const [pollStartTime, setPollStartTime] = useState('');
    const [pollEndTime, setPollEndTime] = useState('');
    const [pollAllowMulti, setPollAllowMulti] = useState(false);
    const [pollImages, setPollImages] = useState<string[]>([]);
    const pollFileInputRef = useRef<HTMLInputElement>(null);

    // Filter events before grouping
    const filteredEvents = events.filter(e => {
        if (calendarFilter === 'private') {
            return e.assignedTo.includes(currentUser.id);
        }
        return true;
    });

    // Group events by date (including multi-day ranges)
    const groupedEvents = filteredEvents.reduce((acc, event) => {
        const start = new Date(event.date);
        const end = event.endDate ? new Date(event.endDate) : start;

        // Iterate through each day in the range
        const current = new Date(start);
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(event);
            current.setDate(current.getDate() + 1);
        }
        return acc;
    }, {} as Record<string, CalendarEvent[]>);

    // --- Logic ---
    const handleDayClick = (dateStr: string) => {
        setSelectedDate(dateStr);
        setIsFormOpen(false);
    };

    const closeModal = () => {
        setSelectedDate(null);
        setIsFormOpen(false);
        setEditingEventId(null);
    };

    const openAddFormInModal = () => {
        setEditingEventId(null);
        setManualTitle('');
        const d = selectedDate || new Date().toISOString().split('T')[0];
        setManualDate(d);
        setManualEndDate(d);
        setManualStartTime('12:00');
        setManualEndTime('13:00');
        setManualLocation('');
        setManualDescription('');
        setManualAssignedTo([currentUser.id]);
        setIsFormOpen(true);
    }

    const handleEditEvent = (event: CalendarEvent) => {
        setEditingEventId(event.id);
        setManualTitle(event.title);
        setManualDate(event.date);
        setManualEndDate(event.endDate || event.date);
        setManualStartTime(event.time);
        setManualEndTime(event.endTime || '');
        setManualLocation(event.location || '');
        setManualDescription(event.description || '');
        setManualAssignedTo(event.assignedTo);
        setIsFormOpen(true);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualTitle.trim()) return;

        if (editingEventId) {
            onUpdateEvent(editingEventId, {
                title: manualTitle,
                date: manualDate,
                endDate: manualEndDate,
                time: manualStartTime,
                endTime: manualEndTime,
                location: manualLocation,
                description: manualDescription,
                assignedTo: manualAssignedTo
            });
        } else {
            const newEvent: CalendarEvent = {
                id: Date.now().toString(),
                title: manualTitle,
                date: manualDate,
                endDate: manualEndDate,
                time: manualStartTime,
                endTime: manualEndTime,
                location: manualLocation,
                description: manualDescription,
                assignedTo: manualAssignedTo
            };
            onAddEvent(newEvent);
        }
        setSelectedDate(manualDate);
        setIsFormOpen(false);
        setEditingEventId(null);
    };

    const handleDelete = () => {
        if (editingEventId) {
            onDeleteEvent(editingEventId);
            setIsFormOpen(false);
            setEditingEventId(null);
        }
    };

    const toggleAssignee = (id: string) => {
        if (manualAssignedTo.includes(id)) {
            setManualAssignedTo(manualAssignedTo.filter(aid => aid !== id));
        } else {
            setManualAssignedTo([...manualAssignedTo, id]);
        }
    };

    const getMonthData = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        return { year, month, daysInMonth, startOffset };
    };

    const pad = (n: number) => n.toString().padStart(2, '0');
    const addDays = (dateStr: string, days: number) => {
        const d = new Date(`${dateStr}T00:00:00`);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };
    const toBase64 = (input: string) => {
        return btoa(unescape(encodeURIComponent(input)));
    };
    const escapeICS = (val: string) => {
        return val
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;');
    };

    const formatToICSDateTime = (date: string, time?: string) => {
        if (!date) return '';
        if (!time) {
            // All-day event (UID: Value Date)
            return `${date.replace(/-/g, '')}`;
        }
        const [h, m] = time.split(':');
        return `${date.replace(/-/g, '')}T${pad(Number(h))}${pad(Number(m))}00`;
    };

    const generateICS = () => {
        const dtstamp = formatToICSDateTime(new Date().toISOString().split('T')[0], new Date().toTimeString().slice(0, 5));
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';

        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'CALSCALE:GREGORIAN',
            'PRODID:-//FamilyHub//DE',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:FamilyHub ${calendarFilter === 'private' ? 'Privat' : 'Familie'}`,
            `X-WR-TIMEZONE:${tz}`,
        ];

        filteredEvents.forEach((event) => {
            const start = formatToICSDateTime(event.date, event.time);
            const endDate = event.endDate || event.date;
            const end = formatToICSDateTime(endDate, event.endTime || event.time);

            if (!start) return;

            const isAllDay = !event.time;
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${event.id}@familyhub`);
            lines.push(`DTSTAMP:${dtstamp}`);
            if (isAllDay) {
                lines.push(`DTSTART;VALUE=DATE:${start}`);
                const endExclusive = addDays(endDate, 1);
                lines.push(`DTEND;VALUE=DATE:${formatToICSDateTime(endExclusive)}`);
            } else {
                lines.push(`DTSTART;TZID=${tz}:${start}`);
                lines.push(`DTEND;TZID=${tz}:${end}`);
            }
            lines.push(`SUMMARY:${escapeICS(event.title || 'Termin')}`);
            if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`);
            if (event.description) lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
            if (event.assignedTo?.length) lines.push(`CATEGORIES:${event.assignedTo.join(',')}`);
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');

        return lines.join('\r\n');
    };

    const exportCalendarAsICS = () => {
        const icsBlob = new Blob([generateICS()], { type: 'text/calendar;charset=utf-8' });
        const filename = `familyhub-${calendarFilter === 'private' ? 'private' : 'family'}.ics`;
        const file = new File([icsBlob], filename, { type: 'text/calendar' });
        const canShare = typeof navigator !== 'undefined' && !!navigator.share && (!!navigator.canShare ? navigator.canShare({ files: [file] }) : true);

        const url = URL.createObjectURL(icsBlob);
        if (Capacitor.isNativePlatform()) {
            (async () => {
                try {
                    const data = generateICS();
                    await Filesystem.writeFile({
                        path: filename,
                        data: toBase64(data),
                        directory: Directory.Cache,
                    });
                    const fileUri = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
                    await Share.share({
                        title: `FamilyHub Kalender (${calendarFilter === 'private' ? 'Privat' : 'Familie'})`,
                        text: 'FamilyHub Termine exportieren',
                        url: fileUri.uri,
                    });
                } catch (e) {
                    // fallback to web download
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.location.href = url;
                }
            })();
            return;
        }
        if (canShare) {
            navigator.share({ files: [file], title: `FamilyHub Kalender (${calendarFilter === 'private' ? 'Privat' : 'Familie'})`, text: 'FamilyHub Termine exportieren' }).catch(() => { });
            return;
        }
        if (navigator.share) {
            navigator.share({ url, title: `FamilyHub Kalender (${calendarFilter === 'private' ? 'Privat' : 'Familie'})`, text: 'FamilyHub Termine exportieren' }).catch(() => { });
        }

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (typeof window !== 'undefined') {
            window.location.href = url;
        }
        URL.revokeObjectURL(url);
    };

    const parseEventStartEnd = (event: CalendarEvent) => {
        const toDateTime = (date: string, time?: string) => {
            if (!date) return null;
            if (!time) {
                return new Date(`${date}T00:00:00`);
            }
            return new Date(`${date}T${time}:00`);
        };

        const start = toDateTime(event.date, event.time);
        let end: Date | null;

        if (event.endDate || event.endTime) {
            end = toDateTime(event.endDate || event.date, event.endTime || event.time || '23:59');
        } else if (event.time) {
            const d = start ? new Date(start) : null;
            if (d) {
                d.setHours(d.getHours() + 1);
                end = d;
            } else {
                end = null;
            }
        } else {
            end = toDateTime(event.date, '23:59');
        }

        return { start, end };
    };

    // Kalender und ICS Export in einem

    const changeMonth = (delta: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
    };

    // --- Renderers ---
    const renderCalendar = () => {
        return (
            <div className="space-y-6">
                {renderMonthView()}
            </div>
        );
    };

    const renderMonthView = () => {
        const { year, month, daysInMonth, startOffset } = getMonthData(currentMonth);
        const monthName = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        const emptySlots = Array.from({ length: startOffset });
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

        return (
            <div className={`rounded-xl border overflow-hidden animate-fade-in transition-colors mb-6 ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                <div className={`flex justify-between items-center p-4 border-b ${liquidGlass ? 'border-white/20 bg-white/10' : 'border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800'}`}>
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition"><ChevronLeft size={20} /></button>
                    <span className={`font-bold text-lg capitalize ${liquidGlass ? 'text-slate-800 dark:text-white' : 'text-gray-800 dark:text-white'}`}>{monthName}</span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition"><ChevronRight size={20} /></button>
                        <button
                            onClick={exportCalendarAsICS}
                            title="Termine in Samsung/Google Kalender exportieren"
                            className={`p-2 rounded-full transition active:scale-90 ${liquidGlass ? 'hover:bg-white/20 text-slate-700 dark:text-white' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}
                        >
                            <Share2 size={18} />
                        </button>
                    </div>
                </div>

                <div className={`grid grid-cols-7 border-b ${liquidGlass ? 'border-white/20 bg-white/5' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700'}`}>
                    {weekDays.map(d => (
                        <div key={d} className="py-3 text-center text-xs font-bold opacity-60 uppercase tracking-wider">{d}</div>
                    ))}
                </div>

                <div className={`grid grid-cols-7 auto-rows-[minmax(80px,auto)] divide-x divide-y ${liquidGlass ? 'divide-white/20 border-b border-white/20' : 'divide-gray-100 dark:divide-gray-700 border-b dark:border-gray-700'}`}>
                    {emptySlots.map((_, i) => <div key={`empty-${i}`} className="bg-black/5 dark:bg-white/5" />)}
                    {days.map(day => {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayEvents = groupedEvents[dateStr] || [];
                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                        return (
                            <div
                                key={day}
                                onClick={() => handleDayClick(dateStr)}
                                className={`relative flex flex-col items-center justify-start pt-2 pb-1 cursor-pointer transition-colors hover:bg-blue-500/10 active:bg-blue-500/20`}
                            >
                                <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white' : (liquidGlass ? 'text-slate-800 dark:text-white' : 'text-gray-700 dark:text-gray-300')}`}>
                                    {day}
                                </span>

                                <div className="flex flex-col space-y-1 w-full px-1 items-center overflow-hidden">
                                    {dayEvents.slice(0, 3).map((ev) => (
                                        <div
                                            key={ev.id}
                                            className="w-full max-w-[80%] h-1.5 rounded-full bg-blue-400 dark:bg-blue-500/80 transition-colors"
                                        ></div>
                                    ))}
                                    {dayEvents.length > 3 && <div className="text-[9px] opacity-60 leading-none font-bold">+ {dayEvents.length - 3}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const handleNewsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setProcessingImage(true);
            const newImages: string[] = [];
            for (const file of files) {
                const reader = new FileReader();
                const base64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    const myBlob = file as Blob;
                    reader.readAsDataURL(myBlob);
                });
                const compressed = await compressImage(base64, 800, 0.7);
                newImages.push(compressed);
            }
            setNewsImages(prev => [...prev, ...newImages]);
            setProcessingImage(false);
        }
    };

    const handlePollFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setProcessingImage(true);
            const newImages: string[] = [];
            for (const file of files) {
                const reader = new FileReader();
                const base64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    const myBlob = file as Blob;
                    reader.readAsDataURL(myBlob);

                });
                const compressed = await compressImage(base64, 800, 0.7);
                newImages.push(compressed);
            }
            setPollImages(prev => [...prev, ...newImages]);
            setProcessingImage(false);
        }
    };

    const submitNews = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newsTitle.trim()) return;
        const finalImages = imageMode === 'url' && newsImageUrlInput ? [...newsImages, newsImageUrlInput] : newsImages;

        if (editingNewsId) {
            onUpdateNews?.(editingNewsId, {
                title: newsTitle,
                description: newsDesc,
                tag: newsTag.startsWith('#') ? newsTag : (newsTag ? `#${newsTag}` : undefined),
                image: finalImages.length > 0 ? finalImages[0] : undefined,
                images: finalImages
            });
            setEditingNewsId(null);
        } else {
            const newItem: NewsItem = {
                id: Date.now().toString(),
                title: newsTitle,
                description: newsDesc,
                tag: newsTag.startsWith('#') ? newsTag : (newsTag ? `#${newsTag}` : undefined),
                image: finalImages.length > 0 ? finalImages[0] : undefined,
                images: finalImages,
                createdAt: new Date().toISOString(),
                authorId: currentUser.id
            };
            onAddNews(newItem);
        }

        setShowNewsForm(false);
        setNewsTitle('');
        setNewsDesc('');
        setNewsTag('');
        setNewsImages([]);
        setNewsImageUrlInput('');
    };

    const handleEditNews = (item: NewsItem) => {
        setEditingNewsId(item.id);
        setNewsTitle(item.title);
        setNewsDesc(item.description || '');
        setNewsTag(item.tag?.replace('#', '') || '');
        setNewsImages(item.images || (item.image ? [item.image] : []));
        setImageMode('upload');
        setShowNewsForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submitPoll = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pollQuestion.trim() || pollOptions.some(o => !o.text.trim()) || (!onAddPoll && !editingPollId)) return;

        if (editingPollId) {
            onUpdatePoll?.(editingPollId, {
                question: pollQuestion,
                description: pollDesc,
                images: pollImages,
                options: pollOptions.map(o => ({ ...o, votes: o.votes || [] })),
                startsAt: pollStartTime || undefined,
                expiresAt: pollEndTime || undefined,
                allowMultipleSelection: pollAllowMulti
            });
            setEditingPollId(null);
        } else {
            const newPoll: Poll = {
                id: Date.now().toString(),
                question: pollQuestion,
                description: pollDesc,
                images: pollImages,
                options: pollOptions.map(o => ({ ...o, votes: [] })),
                authorId: currentUser.id,
                createdAt: new Date().toISOString(),
                startsAt: pollStartTime || undefined,
                expiresAt: pollEndTime || undefined,
                allowMultipleSelection: pollAllowMulti
            };
            onAddPoll?.(newPoll);
        }

        setShowPollForm(false);
        setPollQuestion('');
        setPollDesc('');
        setPollOptions([{ id: '1', text: '', description: '', votes: [] }, { id: '2', text: '', description: '', votes: [] }]);
        setPollStartTime('');
        setPollEndTime('');
        setPollAllowMulti(false);
        setPollImages([]);
    };

    const handleEditPoll = (poll: Poll) => {
        setEditingPollId(poll.id);
        setPollQuestion(poll.question);
        setPollDesc(poll.description || '');
        setPollImages(poll.images || []);
        setPollOptions(poll.options);
        setPollAllowMulti(poll.allowMultipleSelection || false);
        setPollStartTime(poll.startsAt || '');
        setPollEndTime(poll.expiresAt || '');
        setShowPollForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleVote = (pollId: string, optionId: string) => {
        if (!onUpdatePoll || !polls) return;
        const poll = polls.find(p => p.id === pollId);
        if (!poll) return;

        const newOptions = poll.options.map(opt => {
            if (opt.id === optionId) {
                const hasVoted = opt.votes.includes(currentUser.id);
                if (hasVoted) {
                    return { ...opt, votes: opt.votes.filter(id => id !== currentUser.id) };
                } else {
                    return { ...opt, votes: [...opt.votes, currentUser.id] };
                }
            }
            // If not multiple selection, remove vote from others
            if (!poll.allowMultipleSelection && opt.id !== optionId) {
                return { ...opt, votes: opt.votes.filter(id => id !== currentUser.id) };
            }
            return opt;
        });

        onUpdatePoll(pollId, { options: newOptions });
    };

    const renderNewsBoard = () => {
        return (
            <div className="animate-fade-in space-y-6">

                {boardFilter === 'news' ? (
                    <>
                        {!showNewsForm && (
                            <div className="flex justify-center">
                                <button
                                    onClick={() => setShowNewsForm(true)}
                                    className={`${easterEnabled ? 'bg-pink-500 hover:bg-pink-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition active:scale-95`}
                                >
                                    <Plus size={20} /> <span>News erstellen</span>
                                </button>
                            </div>
                        )}

                        {showNewsForm && (
                            <div className={`rounded-xl p-4 animate-slide-in ${liquidGlass ? 'liquid-shimmer-card border border-white/40' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className={`font-bold ${liquidGlass ? 'text-slate-900 dark:text-white' : 'text-gray-800 dark:text-white'}`}>Neue News</h3>
                                    <button onClick={() => setShowNewsForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                                </div>
                                <form onSubmit={submitNews} className="space-y-4">
                                    <input type="text" placeholder="Titel" value={newsTitle} onChange={(e) => setNewsTitle(e.target.value)} className={`w-full rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${liquidGlass ? 'bg-white/40 border-white/30 text-slate-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'}`} required />
                                    <textarea placeholder="Beschreibung..." value={newsDesc} onChange={(e) => setNewsDesc(e.target.value)} className={`w-full rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none ${liquidGlass ? 'bg-white/40 border-white/30 text-slate-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'}`} rows={3} />
                                    <div className="relative"><Hash size={16} className="absolute left-3 top-3.5 text-gray-400" /><input type="text" placeholder="Tag (#Sommer)" value={newsTag} onChange={(e) => setNewsTag(e.target.value)} className={`w-full rounded-xl p-3 pl-9 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${liquidGlass ? 'bg-white/40 border-white/30 text-slate-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'}`} /></div>

                                    <div className={`p-3 rounded-xl border border-dashed ${liquidGlass ? 'bg-white/30 border-white/40' : 'bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-gray-600'}`}>
                                        <div className="flex gap-2 mb-2">
                                            <button type="button" onClick={() => setImageMode('upload')} className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${imageMode === 'upload' ? 'bg-white dark:bg-gray-600' : 'text-gray-400'}`}>Foto</button>
                                            <button type="button" onClick={() => setImageMode('url')} className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${imageMode === 'url' ? 'bg-white dark:bg-gray-600' : 'text-gray-400'}`}>URL</button>
                                        </div>
                                        {imageMode === 'upload' ? (
                                            <div className="text-center py-2">
                                                <input type="file" multiple ref={newsFileInputRef} onChange={handleNewsFileChange} accept="image/*" className="hidden" />
                                                {newsImages.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2 justify-center">
                                                        {newsImages.map((img, idx) => (
                                                            <div key={idx} className="relative inline-block">
                                                                <img src={img} className="h-20 w-20 object-cover rounded-lg" />
                                                                <button type="button" onClick={() => setNewsImages(newsImages.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12} /></button>
                                                            </div>
                                                        ))}
                                                        <button type="button" onClick={() => newsFileInputRef.current?.click()} className="flex items-center justify-center h-20 w-20 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 transition text-gray-400">+</button>
                                                    </div>
                                                ) : (<button type="button" onClick={() => newsFileInputRef.current?.click()} className="flex flex-col items-center justify-center w-full py-4 text-gray-400 hover:text-indigo-500 transition">{processingImage ? <Loader2 className="animate-spin mb-1" size={24} /> : <Camera size={24} className="mb-1" />}<span className="text-xs">Fotos wählen</span></button>)}
                                            </div>
                                        ) : (
                                            <input type="text" placeholder="https://..." value={newsImageUrlInput} onChange={(e) => setNewsImageUrlInput(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-xs" />
                                        )}
                                    </div>
                                    <button type="submit" disabled={!newsTitle.trim() || processingImage} className={`w-full ${easterEnabled ? 'bg-pink-500 hover:bg-pink-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold py-3 rounded-xl active:scale-95 transition disabled:opacity-50`}>Veröffentlichen</button>
                                </form>
                            </div>
                        )}

                        <div className="grid gap-4">
                            {publicNews.length === 0 && !showNewsForm && <div className="text-center py-10 opacity-50"><FileText size={48} className="mx-auto mb-2" /><p>Die Pinnwand ist leer.</p></div>}
                            {publicNews.map(item => {
                                const author = family.find(f => f.id === item.authorId);
                                return (
                                    <div key={item.id} className={`rounded-2xl overflow-hidden group ${liquidGlass ? 'liquid-shimmer-card border border-white/40' : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700'}`}>
                                        <ImageCarousel images={item.images} fallbackImage={item.image} />
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    {item.tag && <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md mb-2 inline-block">{item.tag}</span>}
                                                    <h3 className={`font-bold text-lg leading-tight ${liquidGlass ? 'text-slate-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>{item.title}</h3>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {(currentUser.role === 'admin' || currentUser.role === 'parent') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onUpdateNews?.(item.id, { pinned: !item.pinned }) }}
                                                            className={`p-1.5 rounded-lg transition ${item.pinned ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' : 'text-gray-300 hover:text-indigo-500'}`}
                                                            title={item.pinned ? "Abpinnen" : "Anpinnen"}
                                                        >
                                                            <Pin size={16} className={item.pinned ? "fill-current rotate-45" : ""} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => onDeleteNews(item.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            {item.description && <p className={`text-sm mb-4 whitespace-pre-line ${liquidGlass ? 'text-slate-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-300'}`}>{item.description}</p>}
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100/50 dark:border-gray-700">
                                                <div className="flex items-center space-x-2">
                                                    {author ? (<><img src={author.avatar} className="w-6 h-6 rounded-full" /><span className="text-xs font-medium opacity-70">{author.name}</span></>) : (<span className="text-xs text-gray-400">Unbekannt</span>)}
                                                </div>
                                                <span className="text-[10px] opacity-60">{new Date(item.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <>
                        {!showPollForm && (
                            <div className="flex justify-center">
                                <button
                                    onClick={() => setShowPollForm(true)}
                                    className={`${easterEnabled ? 'bg-pink-500 hover:bg-pink-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition active:scale-95`}
                                >
                                    <Plus size={20} /> <span>Umfrage erstellen</span>
                                </button>
                            </div>
                        )}

                        {showPollForm && (
                            <div className={`rounded-xl p-4 animate-slide-in ${liquidGlass ? 'liquid-shimmer-card border border-white/40' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className={`font-bold ${liquidGlass ? 'text-slate-900 dark:text-white' : 'text-gray-800 dark:text-white'}`}>Neue Umfrage</h3>
                                    <button onClick={() => setShowPollForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                                </div>
                                <form onSubmit={submitPoll} className="space-y-4">
                                    <input type="text" placeholder="Frage" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} className={`w-full rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${liquidGlass ? 'bg-white/40 border-white/30 text-slate-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'}`} required />
                                    <textarea placeholder="Beschreibung (Optional)" value={pollDesc} onChange={(e) => setPollDesc(e.target.value)} className={`w-full rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none ${liquidGlass ? 'bg-white/40 border-white/30 text-slate-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'}`} rows={2} />

                                    <div className={`p-3 rounded-xl border border-dashed ${liquidGlass ? 'bg-white/30 border-white/40' : 'bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-gray-600'}`}>
                                        <div className="text-center py-2">
                                            <input type="file" multiple ref={pollFileInputRef} onChange={handlePollFileChange} accept="image/*" className="hidden" />
                                            {pollImages.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 justify-center">
                                                    {pollImages.map((img, idx) => (
                                                        <div key={idx} className="relative inline-block">
                                                            <img src={img} className="h-20 w-20 object-cover rounded-lg" />
                                                            <button type="button" onClick={() => setPollImages(pollImages.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12} /></button>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => pollFileInputRef.current?.click()} className="flex items-center justify-center h-20 w-20 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 transition text-gray-400">+</button>
                                                </div>
                                            ) : (<button type="button" onClick={() => pollFileInputRef.current?.click()} className="flex flex-col items-center justify-center w-full py-2 text-gray-400 hover:text-indigo-500 transition">{processingImage ? <Loader2 className="animate-spin mb-1" size={24} /> : <Camera size={20} className="mb-1" />}<span className="text-xs">Bilder hinzufügen (Optional)</span></button>)}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500 ml-1">Antworten</label>
                                        {pollOptions.map((opt, idx) => (
                                            <div key={opt.id} className="space-y-1">
                                                <div className="flex gap-2">
                                                    <input type="text" placeholder={`Option ${idx + 1}`} value={opt.text} onChange={(e) => {
                                                        const newOpts = [...pollOptions];
                                                        newOpts[idx].text = e.target.value;
                                                        setPollOptions(newOpts);
                                                    }} className={`flex-1 rounded-xl p-2.5 text-xs outline-none ${liquidGlass ? 'bg-white/20 border-white/20 text-slate-900 dark:text-white' : 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white'}`} />
                                                    {pollOptions.length > 2 && (
                                                        <button type="button" onClick={() => setPollOptions(pollOptions.filter(o => o.id !== opt.id))} className="text-red-400 p-1"><X size={16} /></button>
                                                    )}
                                                </div>
                                                <input type="text" placeholder="Kuze Beschreibung (Optional)" value={opt.description} onChange={(e) => {
                                                    const newOpts = [...pollOptions];
                                                    newOpts[idx].description = e.target.value;
                                                    setPollOptions(newOpts);
                                                }} className={`w-full rounded-xl p-2 text-[10px] outline-none ${liquidGlass ? 'bg-white/10 border-white/10 text-slate-700 dark:text-gray-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`} />
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setPollOptions([...pollOptions, { id: Date.now().toString(), text: '', description: '' }])} className="text-blue-500 text-xs font-bold p-1 hover:underline">+ Option hinzufügen</button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Start (Optional)</label>
                                            <input type="datetime-local" value={pollStartTime} onChange={(e) => setPollStartTime(e.target.value)} className={`w-full rounded-xl p-2 text-xs outline-none ${liquidGlass ? 'bg-white/20 border-white/20' : 'bg-gray-50 dark:bg-gray-700 dark:text-white'}`} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Ende (Optional)</label>
                                            <input type="datetime-local" value={pollEndTime} onChange={(e) => setPollEndTime(e.target.value)} className={`w-full rounded-xl p-2 text-xs outline-none ${liquidGlass ? 'bg-white/20 border-white/20' : 'bg-gray-50 dark:bg-gray-700 dark:text-white'}`} />
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3 p-1">
                                        <input type="checkbox" id="multiVote" checked={pollAllowMulti} onChange={(e) => setPollAllowMulti(e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
                                        <label htmlFor="multiVote" className="text-xs font-medium cursor-pointer">Mehrfachauswahl erlauben</label>
                                    </div>

                                    <button type="submit" disabled={!pollQuestion.trim() || pollOptions.some(o => !o.text.trim())} className={`w-full ${easterEnabled ? 'bg-pink-500 hover:bg-pink-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold py-3 rounded-xl active:scale-95 transition disabled:opacity-50`}>Umfrage starten</button>
                                </form>
                            </div>
                        )}

                        <div className="grid gap-4">
                            {(polls || []).length === 0 && !showPollForm && <div className="text-center py-10 opacity-50"><Users size={48} className="mx-auto mb-2" /><p>Keine Umfragen aktiv.</p></div>}
                            {(polls || []).map(poll => {
                                const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);
                                const author = family.find(f => f.id === poll.authorId);
                                const isTimed = poll.startsAt || poll.expiresAt;
                                const now = new Date();
                                const hasStarted = poll.startsAt ? now >= new Date(poll.startsAt) : true;
                                const hasExpired = poll.expiresAt ? now > new Date(poll.expiresAt) : false;

                                return (
                                    <div key={poll.id} className={`rounded-2xl overflow-hidden border transition-all ${liquidGlass ? 'liquid-shimmer-card border-white/40' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'} ${(!hasStarted || hasExpired) ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                        <ImageCarousel images={poll.images} />
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <h3 className={`font-bold text-lg leading-tight ${liquidGlass ? 'text-slate-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>{poll.question}</h3>
                                                    {poll.description && <p className="text-xs text-gray-500 mt-1">{poll.description}</p>}
                                                </div>
                                                <div className="flex gap-2">
                                                    {poll.allowMultipleSelection && <span className="bg-blue-50 dark:bg-blue-900/30 text-[10px] font-bold text-blue-600 px-2 py-0.5 rounded-full">Multi</span>}
                                                    {onDeletePoll && <button onClick={() => onDeletePoll(poll.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>}
                                                </div>
                                            </div>

                                            {isTimed && (
                                                <div className="flex items-center gap-2 mb-4 text-[10px] font-bold">
                                                    <Clock size={12} className="text-indigo-500" />
                                                    {!hasStarted ? (
                                                        <span className="text-orange-500">Startet am {new Date(poll.startsAt!).toLocaleString()}</span>
                                                    ) : hasExpired ? (
                                                        <span className="text-red-500">Beendet</span>
                                                    ) : (
                                                        <span className="text-emerald-500">Aktiv bis {poll.expiresAt ? new Date(poll.expiresAt).toLocaleString() : 'Open End'}</span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-3 mt-4">
                                                {poll.options.map(opt => {
                                                    const vPercentage = totalVotes > 0 ? (opt.votes.length / totalVotes) * 100 : 0;
                                                    const hasVoted = opt.votes.includes(currentUser.id);

                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => (hasStarted && !hasExpired) && handleVote(poll.id, opt.id)}
                                                            disabled={!hasStarted || hasExpired}
                                                            className={`w-full group relative rounded-xl p-3 text-left transition-all border ${hasVoted ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-gray-100 dark:border-gray-700'} ${(!hasStarted || hasExpired) ? 'cursor-not-allowed' : 'hover:border-indigo-300'}`}
                                                        >
                                                            <div className="relative z-10 flex flex-col">
                                                                <div className="flex justify-between items-center">
                                                                    <span className={`text-sm font-bold ${hasVoted ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>{opt.text}</span>
                                                                    <span className="text-xs font-mono opacity-60">{opt.votes.length}</span>
                                                                </div>
                                                                {opt.description && <span className="text-[10px] opacity-60 mt-0.5 leading-tight">{opt.description}</span>}
                                                            </div>
                                                            <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-900/20 z-0 rounded-xl overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all duration-1000 ${hasVoted ? 'bg-indigo-500/10' : 'bg-gray-100/50 dark:bg-gray-700/20'}`}
                                                                    style={{ width: `${vPercentage}%` }}
                                                                />
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100/50 dark:border-gray-700">
                                                <div className="flex -space-x-1.5 overflow-hidden">
                                                    {poll.options.flatMap(o => o.votes).slice(0, 5).map((id, i) => {
                                                        const voter = family.find(f => f.id === id);
                                                        return voter ? <img key={i} src={voter.avatar} className="inline-block h-4 w-4 rounded-full ring-2 ring-white dark:ring-gray-800" /> : null;
                                                    })}
                                                    {totalVotes > 5 && <span className="text-[8px] font-bold text-gray-400 pl-2 self-center">+{totalVotes - 5}</span>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {author && <span className="text-[10px] font-medium opacity-50">Von {author.name}</span>}
                                                    <span className="text-[10px] opacity-40 font-mono italic">{new Date(poll.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <>
            <main className="p-0 pb-24">
                {/* Header / Tabs Section (Sticky) */}
                <div className={`sticky top-0 z-40 transition-all duration-500 ${liquidGlass ? 'backdrop-blur-xl bg-white/5 border-b border-white/20' : 'bg-white/95 dark:bg-gray-900/95 border-b border-gray-100 dark:border-gray-800'}`}>
                    <div className="relative">
                        <Header
                            title={activeTab === 'calendar' ? 'Kalender' : 'Pinnwand'}
                            currentUser={currentUser}
                            onProfileClick={onProfileClick}
                            liquidGlass={liquidGlass}
                            unreadNotifications={unreadNotifications}
                            onNotificationClick={onNotificationClick}
                        />
                    </div>
                    
                    {/* Tab 1: Haupttabs – integriert in sticky section */}
                    <div className="px-4 pb-4">
                        <SlidingTabs
                            tabs={[
                                { id: 'calendar', label: 'Kalender', icon: CalendarIcon },
                                { id: 'board', label: 'Pinnwand', icon: Layout }
                            ]}
                            activeTabId={activeTab}
                            onTabChange={(id) => setActiveTab(id as 'calendar' | 'board')}
                            liquidGlass={liquidGlass}
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="px-4 py-2">
                    {/* Tab 2: Sub-Filter */}
                    <div className="mb-4">
                    {activeTab === 'calendar' ? (
                        <SlidingTabs
                            tabs={[
                                { id: 'all', label: 'Familie', icon: Users },
                                { id: 'private', label: 'Privat', icon: User }
                            ]}
                            activeTabId={calendarFilter}
                            onTabChange={(id) => setCalendarFilter(id as 'all' | 'private')}
                            liquidGlass={liquidGlass}
                            className="w-full"
                        />
                    ) : (
                        <SlidingTabs
                            tabs={[
                                { id: 'news', label: 'News', icon: FileText },
                                { id: 'polls', label: 'Umfragen', icon: Layout }
                            ]}
                            activeTabId={boardFilter}
                            onTabChange={(id) => setBoardFilter(id as 'news' | 'polls')}
                            liquidGlass={liquidGlass}
                            className="w-full"
                        />
                    )}
                </div>

                {/* Nur der Inhalt ist swipeable – keine Tabs drin */}
                <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                    {activeTab === 'calendar' ? (
                        <div key={calendarFilter} className="animate-fade-in">
                            {renderCalendar()}
                        </div>
                    ) : (
                        <div key={boardFilter} className="animate-fade-in">
                            {renderNewsBoard()}
                        </div>
                    )}
                </div>
            </div>

                {/* Calendar Detail Modal */}
                {selectedDate && activeTab === 'calendar' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={closeModal}></div>
                        <div className={`w-full max-w-md rounded-2xl pointer-events-auto transform transition-transform duration-300 max-h-[85vh] flex flex-col animate-slide-up ${liquidGlass ? 'liquid-shimmer-card' : 'bg-white dark:bg-gray-800'}`}>
                            <div className={`flex justify-between items-center p-4 border-b rounded-t-2xl flex-shrink-0 ${liquidGlass ? 'border-white/20 bg-white/10' : 'border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'}`}>
                                <div>
                                    {isFormOpen ? (
                                        <button onClick={() => setIsFormOpen(false)} className="flex items-center text-blue-600 text-sm font-bold hover:bg-blue-50 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition"><ChevronLeft size={16} className="mr-1" /> Zurück</button>
                                    ) : (
                                        <h3 className={`text-lg font-bold capitalize ${liquidGlass ? 'text-slate-900 dark:text-white' : 'text-gray-800 dark:text-white'}`}>
                                            {new Date(selectedDate).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </h3>
                                    )}
                                </div>
                                <button onClick={closeModal} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {!isFormOpen ? (
                                    <div className="space-y-4">
                                        {(groupedEvents[selectedDate] || []).length === 0 ? (
                                            <div className="text-center py-12 flex flex-col items-center">
                                                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-3"><CalendarIcon className="w-8 h-8 text-gray-400" /></div>
                                                <p className="text-gray-500 dark:text-gray-400 font-medium">Nichts geplant.</p>
                                                <p className="text-xs text-gray-400 mt-1">Tippe auf "+", um einen Termin zu erstellen.</p>
                                            </div>
                                        ) : (
                                            (groupedEvents[selectedDate] || []).map(event => (
                                                <div key={event.id} className={`p-4 rounded-xl border-l-4 border-blue-500 relative group transition-all ${liquidGlass ? 'bg-white/40 border border-white/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <h4 className={`font-bold text-base ${liquidGlass ? 'text-slate-900 dark:text-white' : 'text-gray-800 dark:text-white'}`}>{event.title}</h4>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center"><Clock size={14} className="mr-1.5 text-blue-500" /> {event.time} - {event.endTime}</div>
                                                            {event.location && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`, '_blank');
                                                                    }}
                                                                    className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 mt-1 flex items-center hover:underline text-left"
                                                                >
                                                                    <MapPin size={14} className="mr-1.5 text-red-500 shrink-0" /> <span className="line-clamp-1">{event.location}</span>
                                                                </button>
                                                            )}
                                                            {event.description && (
                                                                <div className={`mt-2 p-2.5 rounded-lg text-sm border-l-2 border-blue-400 whitespace-pre-line ${liquidGlass ? 'bg-white/30 text-slate-700 dark:text-gray-300' : 'bg-gray-100/50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300'}`}>
                                                                    {event.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={() => handleEditEvent(event)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition"><Edit2 size={18} /></button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    <form id="eventForm" onSubmit={handleManualSubmit} className="space-y-5">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Ereignis</label>
                                            <input type="text" required placeholder="Titel" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className={`w-full rounded-xl p-3.5 text-base outline-none ${liquidGlass ? 'bg-white/40 border border-white/30 text-slate-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white'}`} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Beginn</label>
                                                <input type="date" required value={manualDate} onChange={(e) => {
                                                    setManualDate(e.target.value);
                                                    if (!manualEndDate || manualEndDate < e.target.value) setManualEndDate(e.target.value);
                                                }} className={`w-full rounded-xl p-3 text-sm outline-none ${liquidGlass ? 'bg-white/40 border border-white/30' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white'}`} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Ende</label>
                                                <input type="date" required value={manualEndDate} onChange={(e) => setManualEndDate(e.target.value)} min={manualDate} className={`w-full rounded-xl p-3 text-sm outline-none ${liquidGlass ? 'bg-white/40 border border-white/30' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white'}`} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Uhrzeit Start</label>
                                                <input type="time" required value={manualStartTime} onChange={(e) => setManualStartTime(e.target.value)} className={`w-full rounded-xl p-3 outline-none ${liquidGlass ? 'bg-white/40 border border-white/30' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white'}`} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Uhrzeit Ende</label>
                                                <input type="time" required value={manualEndTime} onChange={(e) => setManualEndTime(e.target.value)} className={`w-full rounded-xl p-3 outline-none ${liquidGlass ? 'bg-white/40 border border-white/30' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white'}`} />
                                            </div>
                                        </div>

                                        <div className="space-y-1 relative">
                                            <div className="flex justify-between items-center ml-1">
                                                <label className="text-[10px] font-bold uppercase text-gray-500">Ort</label>
                                                <button 
                                                    type="button" 
                                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(manualLocation || 'Aktueller Standort')}`, '_blank')}
                                                    className={`text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 px-2 py-0.5 rounded-full ${liquidGlass ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' : 'text-blue-500 hover:text-blue-600'}`}
                                                >
                                                    <Search size={10} /> Auf Karte suchen
                                                </button>
                                            </div>
                                            <div className="relative group">
                                                <MapPin size={16} className={`absolute left-3.5 top-3.5 transition-colors ${manualLocation ? 'text-red-500' : 'text-gray-400 group-focus-within:text-red-400'}`} />
                                                <input type="text" placeholder="Wo findet es statt?" value={manualLocation} onChange={(e) => setManualLocation(e.target.value)} className={`w-full rounded-xl p-3.5 pl-10 text-sm outline-none transition-all ${liquidGlass ? 'bg-white/40 border border-white/30 focus:border-white/60 focus:bg-white/50 text-slate-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white focus:ring-1 focus:ring-blue-500'}`} />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Wer nimmt teil?</label>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {family.filter(member => member.role !== 'admin').map(member => (
                                                    <button
                                                        key={member.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (manualAssignedTo.includes(member.id)) {
                                                                if (manualAssignedTo.length > 1) setManualAssignedTo(prev => prev.filter(id => id !== member.id));
                                                            } else {
                                                                setManualAssignedTo(prev => [...prev, member.id]);
                                                            }
                                                        }}
                                                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all border ${manualAssignedTo.includes(member.id) ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-transparent hover:border-gray-300'}`}
                                                    >
                                                        <img src={member.avatar} className="w-5 h-5 rounded-full" />
                                                        <span className="text-xs font-bold">{member.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <textarea placeholder="Notizen / Beschreibung..." value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} className={`w-full rounded-xl p-3 text-sm outline-none resize-none ${liquidGlass ? 'bg-white/40 border border-white/30 text-slate-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white'}`} rows={3} />
                                        </div>

                                        <button type="submit" className="hidden">Submit</button>
                                    </form>
                                )}
                            </div>
                            <div className={`p-4 border-t rounded-b-2xl flex-shrink-0 ${liquidGlass ? 'border-white/20 bg-white/20' : 'border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80'}`}>
                                {!isFormOpen ? (
                                    <button onClick={openAddFormInModal} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition flex items-center justify-center hover:bg-blue-700"><Plus size={20} className="mr-2" /> Termin hinzufügen</button>
                                ) : (
                                    <div className="flex space-x-3">
                                        {editingEventId && (<button type="button" onClick={handleDelete} className="bg-red-50 dark:bg-red-900/20 text-red-500 p-3.5 rounded-xl hover:bg-red-100 transition"><Trash2 size={22} /></button>)}
                                        <button type="submit" form="eventForm" className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition hover:bg-blue-700">{editingEventId ? 'Speichern' : 'Erstellen'}</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
};

export default React.memo(CalendarPage);
