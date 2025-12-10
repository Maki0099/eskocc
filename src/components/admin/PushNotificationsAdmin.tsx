import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, BellOff, Trash2, Loader2, RefreshCw, Send, MessageSquare, Search, Users, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/user-utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserSubscription {
  user_id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  push_notifications_enabled: boolean;
  subscription_count: number;
}

export function PushNotificationsAdmin() {
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sending, setSending] = useState(false);
  
  // Recipient selection
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("all");
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [recipientFilter, setRecipientFilter] = useState("");
  
  // Individual notification dialog state
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSubscription | null>(null);
  const [individualTitle, setIndividualTitle] = useState("");
  const [individualMessage, setIndividualMessage] = useState("");
  const [sendingIndividual, setSendingIndividual] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all members with their push preferences and subscription counts
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, nickname, avatar_url, push_notifications_enabled");

      if (profilesError) throw profilesError;

      // Get member user IDs
      const { data: memberRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["member", "active_member", "admin"]);

      const memberIds = new Set((memberRoles || []).map(r => r.user_id));

      // Get subscription counts
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("user_id");

      const subscriptionCounts = (subscriptions || []).reduce((acc, sub) => {
        acc[sub.user_id] = (acc[sub.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Combine data
      const usersData: UserSubscription[] = (profiles || [])
        .filter(p => memberIds.has(p.id))
        .map(p => ({
          user_id: p.id,
          full_name: p.full_name,
          nickname: p.nickname,
          avatar_url: p.avatar_url,
          push_notifications_enabled: p.push_notifications_enabled ?? true,
          subscription_count: subscriptionCounts[p.id] || 0
        }))
        .sort((a, b) => b.subscription_count - a.subscription_count);

      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Nepodařilo se načíst uživatele");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleUserNotifications = async (userId: string, enabled: boolean) => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ push_notifications_enabled: enabled })
        .eq("id", userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.user_id === userId ? { ...u, push_notifications_enabled: enabled } : u
      ));
      
      toast.success(enabled ? "Notifikace zapnuty" : "Notifikace vypnuty");
    } catch (error) {
      console.error("Error updating notifications:", error);
      toast.error("Nepodařilo se změnit nastavení");
    } finally {
      setUpdating(null);
    }
  };

  const deleteUserSubscriptions = async (userId: string) => {
    if (!confirm("Opravdu smazat všechny subscriptions tohoto uživatele?")) return;
    
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.user_id === userId ? { ...u, subscription_count: 0 } : u
      ));
      
      toast.success("Subscriptions smazány");
    } catch (error) {
      console.error("Error deleting subscriptions:", error);
      toast.error("Nepodařilo se smazat subscriptions");
    } finally {
      setUpdating(null);
    }
  };

  // Filter users with subscriptions for recipient selection
  const usersWithSubs = useMemo(() => 
    users.filter(u => u.subscription_count > 0),
    [users]
  );

  const filteredRecipients = useMemo(() => {
    if (!recipientFilter.trim()) return usersWithSubs;
    const filter = recipientFilter.toLowerCase();
    return usersWithSubs.filter(u => 
      (u.full_name?.toLowerCase().includes(filter)) ||
      (u.nickname?.toLowerCase().includes(filter))
    );
  }, [usersWithSubs, recipientFilter]);

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAllRecipients = () => {
    setSelectedRecipients(new Set(usersWithSubs.map(u => u.user_id)));
  };

  const deselectAllRecipients = () => {
    setSelectedRecipients(new Set());
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Vyplňte titulek a zprávu");
      return;
    }

    if (recipientMode === "selected" && selectedRecipients.size === 0) {
      toast.error("Vyberte alespoň jednoho příjemce");
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        type: "broadcast",
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim()
      };

      // If selected mode, pass array of user IDs
      if (recipientMode === "selected") {
        payload.targetUserIds = Array.from(selectedRecipients);
      }

      const { data, error } = await supabase.functions.invoke("push-send", { body: payload });

      if (error) throw error;

      toast.success(`Odesláno: ${data?.sent || 0} notifikací`);
      setBroadcastTitle("");
      setBroadcastMessage("");
      setSelectedRecipients(new Set());
      setRecipientMode("all");
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error("Nepodařilo se odeslat notifikace");
    } finally {
      setSending(false);
    }
  };

  const openNotifyDialog = (user: UserSubscription) => {
    setSelectedUser(user);
    setIndividualTitle("");
    setIndividualMessage("");
    setNotifyDialogOpen(true);
  };

  const sendIndividualNotification = async () => {
    if (!selectedUser || !individualMessage.trim()) {
      toast.error("Vyplňte zprávu");
      return;
    }

    setSendingIndividual(true);
    try {
      const { data, error } = await supabase.functions.invoke("push-send", {
        body: {
          type: "broadcast",
          title: individualTitle.trim() || "Zpráva z klubu",
          message: individualMessage.trim(),
          targetUserId: selectedUser.user_id
        }
      });

      if (error) throw error;

      if (data?.sent === 0) {
        toast.error("Uživatel nemá aktivní subscription");
      } else {
        toast.success(`Notifikace odeslána`);
        setNotifyDialogOpen(false);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Nepodařilo se odeslat notifikaci");
    } finally {
      setSendingIndividual(false);
    }
  };

  const totalSubscriptions = users.reduce((acc, u) => acc + u.subscription_count, 0);
  const usersWithSubscriptions = users.filter(u => u.subscription_count > 0).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Celkem členů</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{usersWithSubscriptions}</div>
            <p className="text-xs text-muted-foreground">S aktivní subscription</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Celkem subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users.filter(u => u.push_notifications_enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">S povolenými notifikacemi</p>
          </CardContent>
        </Card>
      </div>

      {/* Broadcast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Hromadná notifikace
          </CardTitle>
          <CardDescription>
            Odešlete notifikaci členům s aktivní subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recipient mode selector */}
          <div className="space-y-3">
            <Label>Příjemci</Label>
            <RadioGroup
              value={recipientMode}
              onValueChange={(v) => setRecipientMode(v as "all" | "selected")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="mode-all" />
                <Label htmlFor="mode-all" className="flex items-center gap-2 cursor-pointer font-normal">
                  <Users className="h-4 w-4" />
                  Všem členům ({usersWithSubscriptions})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="mode-selected" />
                <Label htmlFor="mode-selected" className="flex items-center gap-2 cursor-pointer font-normal">
                  <UserCheck className="h-4 w-4" />
                  Vybraným členům
                  {selectedRecipients.size > 0 && (
                    <Badge variant="secondary">{selectedRecipients.size}</Badge>
                  )}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Recipient selector (shown only in selected mode) */}
          {recipientMode === "selected" && (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat členy..."
                  value={recipientFilter}
                  onChange={(e) => setRecipientFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {usersWithSubs.length} členů s aktivní subscription
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllRecipients}
                  >
                    Vybrat vše
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllRecipients}
                    disabled={selectedRecipients.size === 0}
                  >
                    Zrušit výběr
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-48 rounded border">
                <div className="p-2 space-y-1">
                  {filteredRecipients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Žádní členové nenalezeni
                    </p>
                  ) : (
                    filteredRecipients.map((user) => (
                      <label
                        key={user.user_id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedRecipients.has(user.user_id)}
                          onCheckedChange={() => toggleRecipient(user.user_id)}
                        />
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.full_name || user.nickname || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm truncate">
                          {user.full_name || user.nickname || "Bez jména"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          <Bell className="h-3 w-3 mr-1" />
                          {user.subscription_count}
                        </Badge>
                      </label>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          <Input
            placeholder="Titulek notifikace"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
          />
          <Textarea
            placeholder="Text notifikace"
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            rows={3}
          />
          <Button 
            onClick={sendBroadcast} 
            disabled={sending || (recipientMode === "selected" && selectedRecipients.size === 0)}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Odesílám...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {recipientMode === "all" 
                  ? `Odeslat všem (${usersWithSubscriptions})`
                  : `Odeslat vybraným (${selectedRecipients.size})`
                }
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Členové</CardTitle>
            <CardDescription>Správa push notifikací uživatelů</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Obnovit
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uživatel</TableHead>
                  <TableHead className="text-center">Subscriptions</TableHead>
                  <TableHead className="text-center">Povoleno</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.full_name || user.nickname || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || user.nickname || "Bez jména"}</p>
                          {user.nickname && user.full_name && (
                            <p className="text-xs text-muted-foreground">{user.nickname}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.subscription_count > 0 ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          <Bell className="h-3 w-3 mr-1" />
                          {user.subscription_count}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <BellOff className="h-3 w-3 mr-1" />
                          0
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={user.push_notifications_enabled}
                        onCheckedChange={(checked) => toggleUserNotifications(user.user_id, checked)}
                        disabled={updating === user.user_id}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openNotifyDialog(user)}
                          disabled={user.subscription_count === 0}
                          title="Odeslat notifikaci"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteUserSubscriptions(user.user_id)}
                          disabled={updating === user.user_id || user.subscription_count === 0}
                          className="text-destructive hover:text-destructive"
                          title="Smazat subscriptions"
                        >
                          {updating === user.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Individual notification dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odeslat notifikaci</DialogTitle>
            <DialogDescription>
              Odeslat notifikaci uživateli {selectedUser?.full_name || selectedUser?.nickname || ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notify-title">Titulek (volitelný)</Label>
              <Input
                id="notify-title"
                placeholder="Zpráva z klubu"
                value={individualTitle}
                onChange={(e) => setIndividualTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-message">Zpráva</Label>
              <Textarea
                id="notify-message"
                placeholder="Text notifikace..."
                value={individualMessage}
                onChange={(e) => setIndividualMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={sendIndividualNotification} disabled={sendingIndividual || !individualMessage.trim()}>
              {sendingIndividual ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Odesílám...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Odeslat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}