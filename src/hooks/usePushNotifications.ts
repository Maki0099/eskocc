import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
        await checkSubscription();
      } else {
        console.log('Push notifications not supported in this browser');
        setIsLoading(false);
      }
    };

    checkSupport();
  }, [user]);

  const checkSubscription = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      
      if (subscription) {
        console.log('Existing push subscription found');
      }
    } catch (err) {
      console.error('Error checking push subscription:', err);
      setError('Nepodařilo se zkontrolovat stav notifikací');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) {
      console.log('Cannot subscribe: user=', !!user, 'supported=', isSupported);
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Make sure service worker is registered
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.ready;
        console.log('Service worker ready:', registration.active?.state);
      } catch (swError) {
        console.error('Service worker not ready:', swError);
        setError('Service worker není připraven');
        return false;
      }

      // Request permission
      console.log('Requesting notification permission...');
      const perm = await Notification.requestPermission();
      setPermission(perm);
      console.log('Permission result:', perm);

      if (perm !== 'granted') {
        console.log('Push notification permission denied');
        setError('Notifikace jsou zablokované v nastavení prohlížeče');
        return false;
      }

      // Get VAPID public key
      console.log('Fetching VAPID key...');
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('push-vapid-keys');
      
      if (vapidError) {
        console.error('Error getting VAPID key:', vapidError);
        setError('Nepodařilo se získat VAPID klíč');
        return false;
      }
      
      if (!vapidData?.publicKey) {
        console.error('No VAPID key in response:', vapidData);
        setError('VAPID klíč nebyl vrácen');
        return false;
      }

      console.log('VAPID key received, creating subscription...');

      // Convert base64url to Uint8Array
      const publicKey = vapidData.publicKey;
      const padding = '='.repeat((4 - publicKey.length % 4) % 4);
      const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) {
        applicationServerKey[i] = rawData.charCodeAt(i);
      }

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      console.log('Push subscription created, saving to server...');

      // Save to server
      const { error: subError } = await supabase.functions.invoke('push-subscribe', {
        body: { subscription: subscription.toJSON() }
      });

      if (subError) {
        console.error('Error saving subscription:', subError);
        await subscription.unsubscribe();
        setError('Nepodařilo se uložit subscription');
        return false;
      }

      console.log('Push subscription saved successfully');
      setIsSubscribed(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    try {
      setIsLoading(true);
      setError(null);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from server
        await supabase.functions.invoke('push-subscribe', {
          body: { 
            subscription: subscription.toJSON(),
            action: 'unsubscribe'
          }
        });

        // Unsubscribe locally
        await subscription.unsubscribe();
        console.log('Push subscription removed');
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Error unsubscribing from push:', err);
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    error,
    subscribe,
    unsubscribe
  };
}
