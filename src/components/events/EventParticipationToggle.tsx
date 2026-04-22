import { useState } from "react";
import { UserPlus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EventParticipationToggleProps {
  eventId: string;
  userId: string;
  isParticipating: boolean;
  onToggle: () => void;
  fullWidth?: boolean;
  size?: "sm" | "default" | "lg";
  showFullText?: boolean;
  className?: string;
}

const EventParticipationToggle = ({
  eventId,
  userId,
  isParticipating,
  onToggle,
  fullWidth = false,
  size = "sm",
  showFullText = false,
  className,
}: EventParticipationToggleProps) => {
  const [loading, setLoading] = useState(false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const effective = optimistic ?? isParticipating;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const next = !effective;
    setOptimistic(next);
    setLoading(true);
    // Haptic feedback on supported devices
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate?.(next ? 15 : 8); } catch { /* ignore */ }
    }

    try {
      if (effective) {
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
      // Clear optimistic once parent state catches up on next render
      setOptimistic(null);
    } catch (error: any) {
      console.error("Error toggling participation:", error);
      toast.error(effective ? "Nepodařilo se odhlásit" : "Nepodařilo se přihlásit");
      setOptimistic(null); // rollback
    } finally {
      setLoading(false);
    }
  };

  const labelGoing = "Jdeš ✓ — odhlásit";
  const labelJoin = "Jdu na vyjížďku";

  return (
    <Button
      variant={isParticipating ? "secondary" : "default"}
      size={size}
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "gap-2 shrink-0 transition-colors",
        fullWidth && "w-full",
        isParticipating &&
          "bg-green-500/10 hover:bg-green-500/15 ring-2 ring-green-500/60 text-green-700 dark:text-green-400 dark:bg-green-500/15",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isParticipating ? (
        <>
          <Check className="w-4 h-4" />
          <span className={showFullText ? "inline" : "hidden sm:inline"}>
            {showFullText ? labelGoing : "Odhlásit"}
          </span>
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          <span className={showFullText ? "inline" : "hidden sm:inline"}>
            {showFullText ? labelJoin : "Přihlásit"}
          </span>
        </>
      )}
    </Button>
  );
};

export default EventParticipationToggle;
