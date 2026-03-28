import React from 'react';
import { AppNotification } from '../types';
import { X, Bell, Info, AlertTriangle, CheckCircle, Trash2, Clock } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onClearAll: () => void;
  onMarkRead: (id: string) => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen, onClose, notifications, onClearAll, onMarkRead
}) => {
  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="text-red-500" size={20} />;
      case 'success': return <CheckCircle className="text-green-500" size={20} />;
      case 'warning': return <AlertTriangle className="text-orange-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  const sortedNotifications = [...notifications].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden border border-slate-100 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
           <div className="flex items-center space-x-3">
             <div className="bg-blue-500 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
               <Bell size={20} />
             </div>
             <h3 className="text-xl font-black text-slate-800 dark:text-white">Mitteilungen</h3>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
             <X size={24} />
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {sortedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30 text-slate-400">
               <Bell size={64} strokeWidth={1} />
               <p className="mt-4 font-bold">Keine neuen Nachrichten</p>
            </div>
          ) : (
            sortedNotifications.map(notif => (
              <div 
                key={notif.id} 
                className={`p-4 rounded-2xl border transition-all relative group ${notif.read ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900 shadow-sm ring-1 ring-blue-50 dark:ring-blue-900/20'}`}
                onClick={() => onMarkRead(notif.id)}
              >
                <div className="flex items-start space-x-4">
                   <div className="mt-1">{getIcon(notif.type)}</div>
                   <div className="flex-1">
                      <div className="flex justify-between items-start">
                         <h4 className={`font-bold text-sm ${notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>{notif.title}</h4>
                         <span className="text-[10px] text-slate-400 font-medium flex items-center">
                            <Clock size={10} className="mr-1" /> {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${notif.read ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{notif.message}</p>
                   </div>
                </div>
                {!notif.read && <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full"></div>}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {sortedNotifications.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <button 
              onClick={onClearAll}
              className="w-full py-4 text-xs font-black text-red-500 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-colors"
            >
              <Trash2 size={16} /> Alle löschen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationModal;
