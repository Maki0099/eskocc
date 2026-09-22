import { useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  getShareUrl,
  listShareLinks,
  revokeShareLink,
  type ShareLink,
} from "@/lib/share-links";

const ShareLinksManager = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listShareLinks(user.id)
      .then((rows) => !cancelled && setLinks(rows))
      .catch(() => !cancelled && toast.error("Odkazy se nepodařilo načíst"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(getShareUrl(token));
    toast.success("Odkaz zkopírován");
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeShareLink(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success("Odkaz zrušen");
    } catch {
      toast.error("Odkaz se nepodařilo zrušit");
    }
  };

  if (loading) return <Skeleton className="h-20 w-full rounded-xl" />;

  if (links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Zatím nemáš žádné veřejné odkazy. Vytvoříš je na svém profilu u tlačítka Sdílet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div
          key={link.id}
          className="rounded-xl border border-border p-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {link.kind === "profile" ? "Celý profil" : "Jedna jízda"}
              {link.include_biometrics ? " · s tepem a výkonem" : ""}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Vytvořeno {format(new Date(link.created_at), "d. M. yyyy", { locale: cs })} ·
              zobrazeno {link.view_count}×
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(link.token)}
              aria-label="Zkopírovat odkaz"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRevoke(link.id)}
              aria-label="Zrušit odkaz"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ShareLinksManager;
