import Seo from "@/components/Seo";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, Ruler, Mountain, Gauge, Flame } from "lucide-react";
import { getInitials } from "@/lib/user-utils";
import { ROUTES } from "@/lib/routes";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface RecordRow {
  record_key: string;
  label: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  value: string;
  activity_date: string;
  activity_name: string | null;
}

const RECORD_ICONS: Record<string, typeof Trophy> = {
  longest: Ruler,
  elevation: Mountain,
  fastest: Gauge,
  calories: Flame,
};

const ClubRecords = () => {
  const { isMember, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!isMember) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        if (!active) return;
        setLoadError("Vypadá to, že nejsi online. Rekordy se nepodařilo načíst.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_club_records" as any, { _year: year });
      if (!active) return;
      if (error) {
        setLoadError("Data se nepodařilo načíst. Zkontroluj připojení k internetu.");
        setRecords([]);
      } else {
        setRecords((data as any as RecordRow[]) || []);
      }
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [isMember, year, reloadKey]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Rekordy klubu | ESKO.cc"
        description="Klubové rekordy v jízdách členů cyklistického klubu ESKO.cc."
        path="/rekordy-klubu"
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <Link
            to={ROUTES.STATISTICS}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zpět na statistiky
          </Link>

          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">Rekordy {year}</span>
            </div>
            <h1 className="text-display font-bold">Rekordy klubu</h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Nejlepší jednotlivé jízdy členů v aktuálním roce
            </p>
          </div>

          {!isMember && !roleLoading ? (
            <MemberOnlyContent
              title="Rekordy pro členy"
              description="Pro zobrazení klubových rekordů se staň členem."
            />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Zatím nejsou k dispozici žádné rekordy.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {records.map((record) => {
                const Icon = RECORD_ICONS[record.record_key] ?? Trophy;
                return (
                  <Card key={record.record_key} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon className="w-5 h-5 text-primary" />
                        {record.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarImage src={record.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(record.full_name, null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link
                            to={`/member/${record.user_id}`}
                            className="font-semibold text-sm hover:underline truncate block"
                          >
                            {record.full_name || "Bez jména"}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {record.activity_date
                              ? format(new Date(record.activity_date), "d. M. yyyy", { locale: cs })
                              : ""}
                          </p>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-primary mb-1">{record.value}</p>
                      <p className="text-sm text-muted-foreground truncate">{record.activity_name || ""}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex justify-center">
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zpět
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ClubRecords;
