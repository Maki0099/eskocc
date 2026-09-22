import { useEffect, useState } from "react";
import { Copy, Check, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createShareLink,
  findShareLink,
  getShareUrl,
  revokeShareLink,
  setShareBiometrics,
  type ShareKind,
  type ShareLink,
} from "@/lib/share-links";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  kind: ShareKind;
  activityId?: string | null;
}

const ShareLinkDialog = ({ open, onOpenChange, ownerId, kind, activityId }: Props) => {
  const [link, setLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    findShareLink(ownerId, kind, activityId ?? null)
      .then((existing) => !cancelled && setLink(existing))
      .catch(() => !cancelled && toast.error("Odkaz se nepodařilo načíst"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, ownerId, kind, activityId]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const created = await createShareLink(ownerId, kind, activityId ?? null, true);
      setLink(created);
      toast.success("Odkaz vytvořen");
    } catch {
      toast.error("Odkaz se nepodařilo vytvořit");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    const url = getShareUrl(link.token);
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "ESKO.cc" });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Odkaz zkopírován");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* uživatel sdílení zrušil */
    }
  };

  const handleToggleBio = async (value: boolean) => {
    if (!link) return;
    setLink({ ...link, include_biometrics: value });
    try {
      await setShareBiometrics(link.id, value);
    } catch {
      setLink({ ...link, include_biometrics: !value });
      toast.error("Nastavení se nepodařilo uložit");
    }
  };

  const handleRevoke = async () => {
    if (!link) return;
    setLoading(true);
    try {
      await revokeShareLink(link.id);
      setLink(null);
      toast.success("Odkaz zrušen");
    } catch {
      toast.error("Odkaz se nepodařilo zrušit");
    } finally {
      setLoading(false);
    }
  };

  const label = kind === "profile" ? "profilu" : "jízdy";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sdílet {kind === "profile" ? "profil" : "jízdu"}</DialogTitle>
          <DialogDescription>
            Vytvoř veřejný odkaz na svoje {kind === "profile" ? "jízdy" : "data jízdy"}. Otevře ho
            kdokoli, komu ho pošleš – i bez účtu. Platí, dokud ho nezrušíš.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input readOnly value={getShareUrl(link.token)} onFocus={(e) => e.target.select()} />
              <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Zkopírovat odkaz">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="bio-switch">Zveřejnit i tep a výkon</Label>
                <p className="text-xs text-muted-foreground">
                  Ve výchozím stavu zapnuto – kdykoli můžeš vypnout.
                </p>
              </div>
              <Switch
                id="bio-switch"
                checked={link.include_biometrics}
                onCheckedChange={handleToggleBio}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Zobrazeno {link.view_count}×. Ze sdíleného {label} se nikdy nezobrazí e-mail, telefon
              ani datum narození.
            </p>

            <Button variant="outline" className="w-full gap-2" onClick={handleRevoke} disabled={loading}>
              <Trash2 className="w-4 h-4" />
              Zrušit odkaz
            </Button>
          </div>
        ) : (
          <Button className="w-full gap-2" onClick={handleCreate} disabled={loading}>
            <Share2 className="w-4 h-4" />
            {loading ? "Pracuji…" : "Vytvořit odkaz"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareLinkDialog;
