import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, Calendar, AlertCircle, Info, ArrowLeft, Filter, ExternalLink } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import { formatDistanceToNow, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import logoDark from "@/assets/logo-horizontal-dark.png";
import logoWhite from "@/assets/logo-horizontal-white.png";

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

const NotificationCard = ({ 
  notification, 
  onMarkAsRead,
  onDelete,
  onClick 
}: { 
  notification: Notification;
  onMarkAsRead: () => void;
  onDelete: () => void;
  onClick: () => void;
}) => {
  const Icon = getNotificationIcon(notification.type);
  
  return (
    <div 
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        !notification.is_read 
          ? 'bg-primary/5 border-primary/20 hover:border-primary/40' 
          : 'border-border/40 hover:border-border'
      }`}
      onClick={onClick}
    >
      <div className="flex gap-4">
        <div className={`mt-0.5 p-2 rounded-full shrink-0 ${
          !notification.is_read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm leading-snug ${!notification.is_read ? 'font-medium' : ''}`}>
              {notification.title}
            </p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(notification.created_at), 'd. M. yyyy', { locale: cs })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground/70">
              {formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true, 
                locale: cs 
              })}
            </p>
            <div className="flex items-center gap-1">
              {notification.url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Zobrazit
                </Button>
              )}
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead();
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Přečteno
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    deleteAllRead
  } = useNotifications();

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.url) {
      navigate(notification.url);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={ROUTES.DASHBOARD}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Zpět
              </Button>
            </Link>
            <Link to={ROUTES.HOME}>
              <img src={logoDark} alt="ESKO.cc" className="h-8 dark:hidden" />
              <img src={logoWhite} alt="ESKO.cc" className="h-8 hidden dark:block" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3">
                <Bell className="w-6 h-6" />
                Notifikace
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {unreadCount > 0 
                  ? `${unreadCount} nepřečtených`
                  : 'Všechny přečtené'
                }
              </p>
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant={filter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Všechny
              </Button>
              <Button
                variant={filter === 'unread' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('unread')}
                className="gap-1"
              >
                <Filter className="w-3.5 h-3.5" />
                Nepřečtené
                {unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  className="gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Označit vše
                </Button>
              )}
              {notifications.some(n => n.is_read) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteAllRead()}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Smazat přečtené
                </Button>
              )}
            </div>
          </div>

          {/* Notifications list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/40 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-medium mb-1">
                {filter === 'unread' ? 'Žádné nepřečtené notifikace' : 'Žádné notifikace'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {filter === 'unread' 
                  ? 'Všechny notifikace byly přečteny.'
                  : 'Zatím jste neobdrželi žádné notifikace.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={() => markAsRead(notification.id)}
                  onDelete={() => deleteNotification(notification.id)}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;
