import { useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { cs } from "date-fns/locale";
import { Copy, Trash2, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateShareToken } from "@/lib/share-links";

interface GuestLink {
  id: string;
  token: string;
  label: string;
  expires_at: string;
  revoked_at: string | null;
  use_count: number;
  last_used_at: string | null;
}

const toLocalInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
const guestUrl = (t: string) => `${window.location.origin}/host/${t}`;
const fmt = (d: string) => format(new Date(d), "d. M. yyyy H:mm", { locale: cs });

const GuestAccessAdmin = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<GuestLink[]>([]);
  const [label, setLabel] = useState("");
  const [expires, setExpires] = useState(toLocalInput(addDays(new Date(), 7)));
  const [busy, setBusy] = useState(false);

  const [visits, setVisits] = useState<Record<string, { guest_name: string; created_at: string }[]>>({});

  const load = async () => {
    const { data, error } = await supabase
      .from("guest_access_links")
      .select("id, token, label, expires_at, revoked_at, use_count, last_used_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (error) toast.error("Odkazy se nepodařilo načíst");
    setLinks((data ?? []) as GuestLink[]);
    const ids = (data ?? []).map((l) => l.id);
    if (ids.length) {
      const { data: v } = await supabase
        .from("guest_access_visits")
        .select("link_id, guest_name, created_at")
        .in("link_id", ids)
        .order("created_at", { ascending: false })
        .limit(500);
      const map: Record<string, { guest_name: string; created_at: string }[]> = {};
      (v ?? []).forEach((r) => (map[r.link_id] ??= []).push(r));
      setVisits(map);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!label.trim()) return toast.error("Vyplň popis");
    const exp = new Date(expires);
    if (!(exp > new Date())) return toast.error("Platnost musí být v budoucnu");
    setBusy(true);
    const token = generateShareToken() + generateShareToken();
    const { error } = await supabase.from("guest_access_links").insert({
      token: token.slice(0, 40),
      label: label.trim().slice(0, 100),
      expires_at: exp.toISOString(),
      created_by: user?.id,
    });
    setBusy(false);
    if (error) return toast.error("Odkaz se nepodařilo vytvořit");
    setLabel("");
    toast.success("Odkaz vytvořen");
    load();
  };

  const copy = async (t: string) => {
    await navigator.clipboard.writeText(guestUrl(t));
    toast.success("Odkaz zkopírován");
  };

  const extend = async (l: GuestLink) => {
    const base = new Date(l.expires_at) > new Date() ? new Date(l.expires_at) : new Date();
    const { error } = await supabase
      .from("guest_access_links")
      .update({ expires_at: addDays(base, 7).toISOString() })
      .eq("id", l.id);
    if (error) return toast.error("Nepodařilo se prodloužit");
    toast.success("Prodlouženo o 7 dní");
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase
      .from("guest_access_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error("Nepodařilo se zrušit");
    toast.success("Přístup zrušen");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hostovské přístupy</CardTitle>
        <CardDescription>
          Odkaz otevře aplikaci bez registrace. Host vidí vše jako člen, ale nic nemůže měnit.
          Kdo odkaz má, ten vstoupí – nastav proto krátkou platnost.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="guest-label">Popis</Label>
            <Input id="guest-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Petr – soustředění" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="guest-exp">Platí do</Label>
            <Input id="guest-exp" type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </div>
          <Button onClick={create} disabled={busy}>Vytvořit odkaz</Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[1, 7, 30].map((d) => (
            <Button key={d} variant="outline" size="sm" onClick={() => setExpires(toLocalInput(addDays(new Date(), d)))}>
              {d === 1 ? "1 den" : `${d} dní`}
            </Button>
          ))}
        </div>

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žádné aktivní odkazy.</p>
        ) : (
          <div className="space-y-3">
            {links.map((l) => {
              const expired = new Date(l.expires_at) <= new Date();
              return (
                <div key={l.id} className="rounded-xl border border-border p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{l.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {expired ? "Vypršelo" : "Platí do"} {fmt(l.expires_at)} · otevřeno {l.use_count}×
                      {l.last_used_at ? ` · naposledy ${fmt(l.last_used_at)}` : ""}
                    </p>
                    {visits[l.id]?.length ? (
                      <details className="mt-1 text-xs">
                        <summary className="cursor-pointer text-foreground">
                          Kdo se díval ({new Set(visits[l.id].map((v) => v.guest_name)).size})
                        </summary>
                        <ul className="mt-1 space-y-0.5 text-muted-foreground">
                          {visits[l.id].map((v, i) => (
                            <li key={i}><span className="text-foreground">{v.guest_name}</span> · {fmt(v.created_at)}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => copy(l.token)} aria-label="Kopírovat">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => extend(l)} aria-label="Prodloužit o 7 dní">
                      <CalendarPlus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => revoke(l.id)} aria-label="Zrušit">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GuestAccessAdmin;
