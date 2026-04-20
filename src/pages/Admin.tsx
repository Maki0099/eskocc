import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CafeAdmin from "@/components/admin/CafeAdmin";
import ChallengeAdmin from "@/components/admin/ChallengeAdmin";
import CronJobsAdmin from "@/components/admin/CronJobsAdmin";
import { PushNotificationsAdmin } from "@/components/admin/PushNotificationsAdmin";
import { RoutesImportAdmin } from "@/components/admin/RoutesImportAdmin";
import { GpxBulkUploadAdmin } from "@/components/admin/GpxBulkUploadAdmin";
import { StravaEventsSyncAdmin } from "@/components/admin/StravaEventsSyncAdmin";
import { AiSettingsAdmin } from "@/components/admin/AiSettingsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, Shield, Loader2, Coffee, Target, Clock, KeyRound, Bell, Route, Sparkles, Trash2, Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ClubStravaAdmin } from "@/components/admin/ClubStravaAdmin";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import type { AppRole } from "@/lib/types";
import { ROLE_LABELS, ROLE_BADGE_VARIANTS } from "@/lib/constants";
import { getInitials } from "@/lib/user-utils";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole;
  clubAthlete: { firstname: string; lastnameInitial: string | null; athleteKey?: string } | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("users");
  const [preselectedAthleteKey, setPreselectedAthleteKey] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Nemáte oprávnění k přístupu do admin panelu");
    }
  }, [isAdmin, roleLoading, navigate]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const { data: mappings, error: mappingsError } = await supabase
        .from("club_athlete_mappings")
        .select("matched_user_id, athlete_key, athlete_firstname, athlete_lastname_initial, ignored")
        .not("matched_user_id", "is", null)
        .eq("ignored", false);

      if (mappingsError) throw mappingsError;

      const mappingByUser = new Map(
        (mappings || []).map((m) => [
          m.matched_user_id as string,
          { athleteKey: m.athlete_key, firstname: m.athlete_firstname, lastnameInitial: m.athlete_lastname_initial },
        ])
      );

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role as AppRole) || "pending",
          clubAthlete: mappingByUser.get(profile.id) || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Nepodařilo se načíst uživatele");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingUserId(userId);
    try {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({
          user_id: userId,
          role: newRole,
        });

        if (error) throw error;
      }

      toast.success("Role byla změněna");
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error(error.message || "Nepodařilo se změnit roli");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handlePasswordReset = async (email: string, userId: string) => {
    setResettingPasswordUserId(userId);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success(`Email pro reset hesla byl odeslán na ${email}`);
    } catch (error: any) {
      console.error("Error sending password reset:", error);
      toast.error(error.message || "Nepodařilo se odeslat reset hesla");
    } finally {
      setResettingPasswordUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setDeletingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Uživatel ${userName} byl smazán`);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Nepodařilo se smazat uživatele");
    } finally {
      setDeletingUserId(null);
    }
  };

  const pendingCount = users.filter((u) => u.role === "pending").length;

  if (roleLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Správa uživatelů a kavárny</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex-wrap">
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                Uživatelé
                {pendingCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-1 h-5 min-w-5 px-1.5 text-xs font-bold"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="cafe" className="gap-2">
                <Coffee className="w-4 h-4" />
                Kavárna
              </TabsTrigger>
              <TabsTrigger value="challenge" className="gap-2">
                <Target className="w-4 h-4" />
                Výzva roku
              </TabsTrigger>
              <TabsTrigger value="cron" className="gap-2">
                <Clock className="w-4 h-4" />
                Úlohy
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Notifikace
              </TabsTrigger>
              <TabsTrigger value="routes" className="gap-2">
                <Route className="w-4 h-4" />
                Trasy
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI
              </TabsTrigger>
              <TabsTrigger value="club-strava" className="gap-2">
                <Activity className="w-4 h-4" />
                Strava klub
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6">
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Celkem
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Čeká na schválení
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-500">{pendingCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Aktivní členové
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users.filter((u) => u.role === "active_member").length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Administrátoři
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users.filter((u) => u.role === "admin").length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      Propojeno se Stravou
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users.filter((u) => u.clubAthlete).length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Seznam uživatelů
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : users.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Žádní uživatelé
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Uživatel</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Registrace</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="hidden md:table-cell">Strava klub</TableHead>
                            <TableHead className="text-right">Akce</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    {user.avatar_url && (
                                      <AvatarImage src={user.avatar_url} alt={user.full_name || "Avatar"} />
                                    )}
                                    <AvatarFallback className="text-xs">
                                      {getInitials(user.full_name, user.email)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">
                                    {user.full_name || "Bez jména"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {user.email}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(user.created_at), "d. M. yyyy", {
                                  locale: cs,
                                })}
                              </TableCell>
                              <TableCell>
                                <Badge variant={ROLE_BADGE_VARIANTS[user.role]}>
                                  {ROLE_LABELS[user.role]}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      {user.clubAthlete ? (
                                        <Badge 
                                          variant="secondary" 
                                          className="gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 cursor-pointer"
                                          onClick={() => {
                                            if (user.clubAthlete?.athleteKey) {
                                              setPreselectedAthleteKey(user.clubAthlete.athleteKey);
                                              setActiveTab("club-strava");
                                            }
                                          }}
                                        >
                                          <Activity className="w-3 h-3" />
                                          {user.clubAthlete.firstname}
                                          {user.clubAthlete.lastnameInitial ? ` ${user.clubAthlete.lastnameInitial}.` : ""}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-muted-foreground">
                                          Nepropojeno
                                        </Badge>
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {user.clubAthlete
                                        ? "Kliknutím přejdi na Strava klub se předvybraným atletem"
                                        : "Uživatel není napárovaný na žádného atleta v klubu"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePasswordReset(user.email, user.id)}
                                    disabled={resettingPasswordUserId === user.id}
                                    title="Odeslat reset hesla"
                                  >
                                    {resettingPasswordUserId === user.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <KeyRound className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Select
                                    value={user.role}
                                    onValueChange={(value) =>
                                      handleRoleChange(user.id, value as AppRole)
                                    }
                                    disabled={updatingUserId === user.id}
                                  >
                                    <SelectTrigger className="w-[140px]">
                                      {updatingUserId === user.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <SelectValue />
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">
                                        {ROLE_LABELS.pending}
                                      </SelectItem>
                                      <SelectItem value="member">
                                        {ROLE_LABELS.member}
                                      </SelectItem>
                                      <SelectItem value="active_member">
                                        {ROLE_LABELS.active_member}
                                      </SelectItem>
                                      <SelectItem value="admin">
                                        {ROLE_LABELS.admin}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        disabled={user.id === currentUser?.id || deletingUserId === user.id}
                                        title={user.id === currentUser?.id ? "Nemůžeš smazat sám sebe" : "Smazat uživatele"}
                                      >
                                        {deletingUserId === user.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Smazat uživatele?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Opravdu chceš smazat uživatele <strong>{user.full_name || user.email}</strong>?
                                          <br />
                                          <span className="text-muted-foreground">{user.email}</span>
                                          <br /><br />
                                          Tato akce je nevratná. Budou smazány všechny údaje uživatele včetně profilu, rolí a účasti na akcích.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Smazat
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cafe">
              <CafeAdmin />
            </TabsContent>

            <TabsContent value="challenge">
              <ChallengeAdmin />
            </TabsContent>

            <TabsContent value="cron">
              <CronJobsAdmin />
            </TabsContent>

            <TabsContent value="notifications">
              <PushNotificationsAdmin />
            </TabsContent>

            <TabsContent value="routes" className="space-y-6">
              <StravaEventsSyncAdmin />
              <GpxBulkUploadAdmin />
              <RoutesImportAdmin />
            </TabsContent>

            <TabsContent value="ai">
              <AiSettingsAdmin />
            </TabsContent>

            <TabsContent value="club-strava">
              <ClubStravaAdmin preselectedAthleteKey={preselectedAthleteKey} onAthleteSelected={() => setPreselectedAthleteKey(null)} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
