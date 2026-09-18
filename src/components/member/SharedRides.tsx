import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { getInitials } from "@/lib/user-utils";

interface SharedRide {
  activity_date: string;
  own_distance_km: number;
  partner_id: string;
  partner_name: string | null;
  partner_avatar: string | null;
  partner_distance_km: number;
}

const SharedRides = ({ userId }: { userId: string }) => {
  const [rides, setRides] = useState<SharedRide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_shared_rides" as any, { _user_id: userId });
      if (!active) return;
      setRides((data as any as SharedRide[]) || []);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Společné jízdy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (rides.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Společné jízdy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rides.slice(0, 10).map((ride, i) => (
          <div
            key={`${ride.activity_date}-${ride.partner_id}-${i}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/40"
          >
            <Link to={`/member/${ride.partner_id}`} className="shrink-0 hover:opacity-80 transition-opacity">
              <Avatar className="w-9 h-9 border-2 border-background shadow-sm">
                <AvatarImage src={ride.partner_avatar || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  {getInitials(ride.partner_name, null)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                s {ride.partner_name || "členem klubu"}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(ride.activity_date), "d. MMMM yyyy", { locale: cs })}
              </p>
            </div>
            <span className="text-sm font-semibold whitespace-nowrap">
              {Number(ride.own_distance_km).toLocaleString("cs-CZ")} km
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SharedRides;
