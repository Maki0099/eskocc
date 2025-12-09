import { Bell, BellOff, Loader2, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, isLoading, permission, error, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <BellOff className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Push notifikace</p>
          <p className="text-xs text-muted-foreground">
            Váš prohlížeč nepodporuje push notifikace
          </p>
        </div>
      </div>
    );
  }

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const success = await subscribe();
      if (success) {
        toast.success('Push notifikace zapnuty');
      } else if (permission === 'denied') {
        toast.error('Notifikace jsou zablokované v nastavení prohlížeče. Povolte je v nastavení a zkuste znovu.');
      } else {
        toast.error(error || 'Nepodařilo se zapnout notifikace');
      }
    } else {
      const success = await unsubscribe();
      if (success) {
        toast.success('Push notifikace vypnuty');
      } else {
        toast.error('Nepodařilo se vypnout notifikace');
      }
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
      {isSubscribed ? (
        <Bell className="h-5 w-5 text-primary" />
      ) : permission === 'denied' ? (
        <AlertCircle className="h-5 w-5 text-destructive" />
      ) : (
        <BellOff className="h-5 w-5 text-muted-foreground" />
      )}
      <div className="flex-1">
        <Label htmlFor="push-toggle" className="text-sm font-medium cursor-pointer">
          Push notifikace
        </Label>
        <p className="text-xs text-muted-foreground">
          {isSubscribed 
            ? 'Dostáváte upozornění na nové vyjížďky'
            : permission === 'denied'
              ? 'Povolte notifikace v nastavení prohlížeče'
              : 'Zapněte upozornění na nové vyjížďky'
          }
        </p>
        {error && !isSubscribed && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <Switch
          id="push-toggle"
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={permission === 'denied'}
        />
      )}
    </div>
  );
}
