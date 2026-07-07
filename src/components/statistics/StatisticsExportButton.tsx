import { useState, type RefObject } from "react";
import { toBlob } from "html-to-image";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface StatisticsExportButtonProps {
  targetRef: RefObject<HTMLElement>;
  year: number;
}

const StatisticsExportButton = ({ targetRef, year }: StatisticsExportButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    const node = targetRef.current;
    if (!node) return;

    setLoading(true);
    const root = document.documentElement;
    root.setAttribute("data-exporting", "true");

    try {
      const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: bg,
        cacheBust: true,
        skipFonts: false,
        filter: (el) => {
          if (!(el instanceof HTMLElement)) return true;
          return el.dataset.exportIgnore !== "true";
        },
      });

      if (!blob) throw new Error("Nepodařilo se vytvořit obrázek");

      const filename = `esko-statistiky-${year}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };

      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Statistiky klubu ESKO.cc ${year}`,
            text: `Statistiky klubu ESKO.cc ${year}`,
          });
          toast({ title: "Obrázek připraven ke sdílení" });
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Obrázek uložen", description: filename });
    } catch (err) {
      console.error("Export failed:", err);
      toast({
        variant: "destructive",
        title: "Export se nezdařil",
        description: "Zkus to prosím znovu.",
      });
    } finally {
      root.removeAttribute("data-exporting");
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      data-export-ignore="true"
      className="gap-2 font-display uppercase tracking-[0.18em] text-xs text-accent hover:text-foreground hover:bg-warm"
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Připravuji…
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5" />
          Export PNG
        </>
      )}
    </Button>
  );
};

export default StatisticsExportButton;
