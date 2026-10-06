
import React from 'react';
import { AppNotification } from './types';

export const NotificationContext = React.createContext<{
    notifications: AppNotification[];
    markAllRead: () => void;
    clearAll: () => void;
}>({
    notifications: [],
    markAllRead: () => {},
    clearAll: () => {}
});
