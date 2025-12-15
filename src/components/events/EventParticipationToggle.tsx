import { useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EventParticipationToggleProps {
  eventId: string;
  userId: string;
  isParticipating: boolean;
  onToggle: () => void;
}

const EventParticipationToggle = ({ 
  eventId, 
  userId, 
  isParticipating, 
  onToggle 
}: EventParticipationToggleProps) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    try {
      if (isParticipating) {
        const { error } = await supabase
          .from("event_participants")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", userId);

        if (error) throw error;
        toast.success("Odhlášeno z vyjížďky");
      } else {
        const { error } = await supabase
          .from("event_participants")
          .insert({ event_id: eventId, user_id: userId, status: "going" });

        if (error) throw error;
        toast.success("Přihlášeno na vyjížďku");
      }
      onToggle();
    } catch (error: any) {
      console.error("Error toggling participation:", error);
      toast.error(isParticipating ? "Nepodařilo se odhlásit" : "Nepodařilo se přihlásit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isParticipating ? "secondary" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="gap-1.5 shrink-0"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isParticipating ? (
        <>
          <UserMinus className="w-4 h-4" />
          <span className="hidden sm:inline">Odhlásit</span>
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Přihlásit</span>
        </>
      )}
    </Button>
  );
};

export default EventParticipationToggle;
