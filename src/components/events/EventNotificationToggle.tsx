import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EventNotificationToggleProps {
  eventId: string;
  userId: string;
}

const EventNotificationToggle = ({ eventId, userId }: EventNotificationToggleProps) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from("event_subscriptions")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;
        setIsSubscribed(!!data);
      } catch (error) {
        console.error("Error checking subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [eventId, userId]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isSubscribed) {
        const { error } = await supabase
          .from("event_subscriptions")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", userId);

        if (error) throw error;
        setIsSubscribed(false);
        toast.success("Notifikace o změnách vypnuty");
      } else {
        const { error } = await supabase
          .from("event_subscriptions")
          .insert({ event_id: eventId, user_id: userId });

        if (error) throw error;
        setIsSubscribed(true);
        toast.success("Budete informováni o změnách této vyjížďky");
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
      toast.error("Nepodařilo se změnit odběr notifikací");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isSubscribed ? "secondary" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <Bell className="w-4 h-4" />
          Sledujete
        </>
      ) : (
        <>
          <BellOff className="w-4 h-4" />
          Sledovat
        </>
      )}
    </Button>
  );
};

export default EventNotificationToggle;
