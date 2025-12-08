import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Loader2, RefreshCw, Play } from "lucide-react";
import { toast } from "sonner";

interface CronJob {
  jobid: number;
  schedule: string;
  command: string;
  nodename: string;
  nodeport: number;
  database: string;
  username: string;
  active: boolean;
  jobname: string | null;
}

const CronJobsAdmin = () => {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingStats, setRefreshingStats] = useState(false);

  const fetchCronJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_cron_jobs');
      
      if (error) {
        console.error("Error fetching cron jobs:", error);
        // Fallback: try direct query (may fail due to permissions)
        toast.error("Nepodařilo se načíst cron jobs");
        setJobs([]);
      } else {
        setJobs(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCronJobs();
  }, []);

  const handleForceRefresh = async () => {
    setRefreshingStats(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-stats-batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ refreshAll: true }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to refresh stats");
      }

      const result = await response.json();
      toast.success(`Statistiky aktualizovány pro ${Object.keys(result.stats || {}).length} uživatelů`);
    } catch (error) {
      console.error("Error refreshing stats:", error);
      toast.error("Nepodařilo se aktualizovat statistiky");
    } finally {
      setRefreshingStats(false);
    }
  };

  const formatSchedule = (schedule: string): string => {
    // Parse cron expression to human-readable format
    const parts = schedule.split(" ");
    if (parts.length !== 5) return schedule;
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    if (minute === "*" && hour === "*") return "Každou minutu";
    if (minute !== "*" && hour === "*") return `Každou hodinu v ${minute}. minutě`;
    if (dayOfWeek === "*" && dayOfMonth === "*" && month === "*") {
      return `Denně v ${hour}:${minute.padStart(2, "0")}`;
    }
    
    return schedule;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Naplánované úlohy
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCronJobs}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Obnovit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Žádné naplánované úlohy</p>
              <p className="text-sm mt-2">
                Cron job pro aktualizaci Strava statistik byl nastaven na 4:00 denně.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Název</TableHead>
                    <TableHead>Plán</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Příkaz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.jobid}>
                      <TableCell className="font-medium">
                        {job.jobname || `Job #${job.jobid}`}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {job.schedule}
                        </code>
                        <span className="text-muted-foreground text-sm ml-2">
                          ({formatSchedule(job.schedule)})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={job.active ? "default" : "secondary"}>
                          {job.active ? "Aktivní" : "Neaktivní"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <code className="text-xs text-muted-foreground truncate block">
                          {job.command.substring(0, 100)}...
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Manuální akce
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Aktualizovat Strava statistiky</h4>
              <p className="text-sm text-muted-foreground">
                Vynuceně aktualizuje statistiky všech uživatelů s připojenou Stravou
              </p>
            </div>
            <Button
              onClick={handleForceRefresh}
              disabled={refreshingStats}
            >
              {refreshingStats ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aktualizuji...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Spustit nyní
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CronJobsAdmin;
