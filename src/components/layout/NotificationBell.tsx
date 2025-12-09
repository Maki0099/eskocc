import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Calendar, AlertCircle, Info, X } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_event':
    case 'event_updated':
    case 'event_reminder':
      return Calendar;
    case 'system':
      return AlertCircle;
    default:
      return Info;
  }
};

const NotificationItem = ({ 
  notification, 
  onMarkAsRead,
  onClick 
}: { 
  notification: Notification;
  onMarkAsRead: () => void;
  onClick: () => void;
}) => {
  const Icon = getNotificationIcon(notification.type);
  
  return (
    <div 
      className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
        !notification.is_read ? 'bg-primary/5' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex gap-3">
        <div className={`mt-0.5 p-1.5 rounded-full ${
          !notification.is_read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${!notification.is_read ? 'font-medium' : ''}`}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { 
              addSuffix: true, 
              locale: cs 
            })}
          </p>
        </div>
        {!notification.is_read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
            className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
            title="Označit jako přečtené"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
    // Always navigate to notifications page
    navigate(ROUTES.NOTIFICATIONS);
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Notifikace"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-medium text-sm">Notifikace</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-1"
                  title="Označit vše jako přečtené"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Načítám...
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Žádné notifikace
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={() => markAsRead(notification.id)}
                    onClick={() => handleNotificationClick(notification)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-border">
              <Link 
                to={ROUTES.NOTIFICATIONS}
                onClick={() => setIsOpen(false)}
              >
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Zobrazit vše
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
