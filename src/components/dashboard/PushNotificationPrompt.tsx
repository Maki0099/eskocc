import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationPromptProps {
  userId: string;
}

const PushNotificationPrompt = ({ userId }: PushNotificationPromptProps) => {
  const [isDismissed, setIsDismissed] = useState(true);
  const { isSupported, isSubscribed, permission, subscribe, isLoading } = usePushNotifications();

  const dismissKey = `push_prompt_dismissed_${userId}`;
  const laterKey = `push_prompt_later_${userId}`;

  useEffect(() => {
    // Check if should show prompt
    const permanentlyDismissed = localStorage.getItem(dismissKey);
    const laterUntil = localStorage.getItem(laterKey);
    
    if (permanentlyDismissed) {
      setIsDismissed(true);
      return;
    }
    
    if (laterUntil) {
      const until = new Date(laterUntil);
      if (until > new Date()) {
        setIsDismissed(true);
        return;
      }
      // Expired, remove the key
      localStorage.removeItem(laterKey);
    }
    
    // Show prompt if supported, not subscribed, and permission not denied
    if (isSupported && !isSubscribed && permission !== 'denied') {
      setIsDismissed(false);
    }
  }, [isSupported, isSubscribed, permission, dismissKey, laterKey]);

  const handleSubscribe = async () => {
    await subscribe();
    setIsDismissed(true);
  };

  const handleLater = () => {
    // Dismiss for 7 days
    const later = new Date();
    later.setDate(later.getDate() + 7);
    localStorage.setItem(laterKey, later.toISOString());
    setIsDismissed(true);
  };

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, 'true');
    setIsDismissed(true);
  };

  if (isDismissed || !isSupported || isSubscribed || permission === 'denied') {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-background/50"
        aria-label="Zavřít"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-4 pr-6">
        <div className="p-2 rounded-full bg-primary/10">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium mb-1">
            Zapni si notifikace
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Budeš informován/a o nových vyjížďkách a důležitých zprávách z klubu.
          </p>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={handleSubscribe}
              disabled={isLoading}
            >
              {isLoading ? 'Povolování...' : 'Povolit notifikace'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLater}
            >
              Později
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
