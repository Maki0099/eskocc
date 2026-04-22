import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { pluralizeGoing } from "@/lib/event-utils";

interface Participant {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

interface ParticipantAvatarsProps {
  eventId: string;
  count: number;
  max?: number;
  className?: string;
}

const initials = (p: Participant) => {
  const name = p.nickname || p.full_name || "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
};

const ParticipantAvatars = ({ eventId, count, max = 3, className }: ParticipantAvatarsProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (loaded) return;
    const { data: parts } = await supabase
      .from("event_participants")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("status", "going")
      .limit(50);
    const userIds = (parts || []).map((p: any) => p.user_id);
    if (userIds.length === 0) {
      setLoaded(true);
      return;
    }
    const { data: profiles } = await supabase
      .from("member_profiles_public")
      .select("id, full_name, nickname, avatar_url")
      .in("id", userIds);
    setParticipants((profiles || []) as Participant[]);
    setLoaded(true);
  };

  useEffect(() => {
    if (count > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, count]);

  if (count === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Users className="w-3.5 h-3.5" />
        Zatím nikdo
      </span>
    );
  }

  const visible = participants.slice(0, max);
  const overflow = Math.max(0, count - visible.length);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-full hover:bg-muted/50 px-1 py-0.5 transition-colors",
            className,
          )}
          aria-label={`${pluralizeGoing(count)} – zobrazit účastníky`}
        >
          <div className="flex -space-x-2">
            {visible.length === 0 ? (
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
                <Users className="w-3 h-3" />
              </span>
            ) : (
              visible.map((p) => (
                <Avatar key={p.id} className="h-6 w-6 ring-2 ring-background">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.nickname || p.full_name || ""} />}
                  <AvatarFallback className="text-[10px] font-semibold bg-primary/15 text-primary">
                    {initials(p)}
                  </AvatarFallback>
                </Avatar>
              ))
            )}
            {overflow > 0 && (
              <span className="inline-flex items-center justify-center h-6 min-w-6 px-1 rounded-full bg-muted text-[10px] font-medium ring-2 ring-background text-foreground">
                +{overflow}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{pluralizeGoing(count)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Účastníci ({count})
        </div>
        <div className="max-h-64 overflow-y-auto">
          {participants.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">Načítám…</div>
          ) : (
            participants.map((p) => (
              <Link
                key={p.id}
                to={`/member/${p.id}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm"
                onClick={() => setOpen(false)}
              >
                <Avatar className="h-7 w-7">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.nickname || p.full_name || ""} />}
                  <AvatarFallback className="text-[10px] font-semibold bg-primary/15 text-primary">
                    {initials(p)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{p.nickname || p.full_name || "Člen"}</span>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ParticipantAvatars;
