import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, ImageIcon, AlertCircle, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type TextProvider = "lovable" | "openai" | "none";
type ImageProvider = "lovable" | "openai" | "huggingface" | "none";

interface AiSettings {
  text_provider: TextProvider;
  image_provider: ImageProvider;
}

const TEXT_PROVIDER_INFO: Record<TextProvider, { name: string; description: string; requiresKey: boolean }> = {
  lovable: {
    name: "Lovable AI",
    description: "Google Gemini 2.5 Flash - zahrnuté kredity",
    requiresKey: false,
  },
  openai: {
    name: "OpenAI",
    description: "GPT-4o-mini - vyžaduje API klíč",
    requiresKey: true,
  },
  none: {
    name: "Bez AI",
    description: "Fallback generování z geokódování",
    requiresKey: false,
  },
};

const IMAGE_PROVIDER_INFO: Record<ImageProvider, { name: string; description: string; requiresKey: boolean }> = {
  lovable: {
    name: "Lovable AI",
    description: "Google Gemini 3 Pro Image - zahrnuté kredity",
    requiresKey: false,
  },
  openai: {
    name: "OpenAI DALL-E",
    description: "GPT-Image-1 - vyžaduje API klíč",
    requiresKey: true,
  },
  huggingface: {
    name: "Hugging Face",
    description: "FLUX.1-schnell - zdarma s limity",
    requiresKey: true,
  },
  none: {
    name: "Bez AI",
    description: "Statická mapa z OpenStreetMap",
    requiresKey: false,
  },
};

export const AiSettingsAdmin = () => {
  const [settings, setSettings] = useState<AiSettings>({
    text_provider: "lovable",
    image_provider: "lovable",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secrets, setSecrets] = useState<string[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchSecrets();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      const settingsMap: Partial<AiSettings> = {};
      data?.forEach((row) => {
        if (row.setting_key === "text_provider") {
          settingsMap.text_provider = row.setting_value as TextProvider;
        } else if (row.setting_key === "image_provider") {
          settingsMap.image_provider = row.setting_value as ImageProvider;
        }
      });

      setSettings({
        text_provider: settingsMap.text_provider || "lovable",
        image_provider: settingsMap.image_provider || "lovable",
      });
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      toast.error("Nepodařilo se načíst nastavení AI");
    } finally {
      setLoading(false);
    }
  };

  const fetchSecrets = async () => {
    // We can't directly read secrets, but we can check which ones are configured
    // by checking the edge function response or admin metadata
    // For now, we'll check common patterns
    try {
      const { data } = await supabase.functions.invoke("generate-route-metadata", {
        body: { routes: [], checkConfig: true },
      });
      if (data?.configuredProviders) {
        setSecrets(data.configuredProviders);
      }
    } catch {
      // Silent fail - just means we can't check secrets
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update text provider
      const { error: textError } = await supabase
        .from("ai_settings")
        .update({ setting_value: settings.text_provider })
        .eq("setting_key", "text_provider");

      if (textError) throw textError;

      // Update image provider
      const { error: imageError } = await supabase
        .from("ai_settings")
        .update({ setting_value: settings.image_provider })
        .eq("setting_key", "image_provider");

      if (imageError) throw imageError;

      toast.success("Nastavení AI bylo uloženo");
    } catch (error) {
      console.error("Error saving AI settings:", error);
      toast.error("Nepodařilo se uložit nastavení");
    } finally {
      setSaving(false);
    }
  };

  const textInfo = TEXT_PROVIDER_INFO[settings.text_provider];
  const imageInfo = IMAGE_PROVIDER_INFO[settings.image_provider];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Nastavení AI providerů
        </CardTitle>
        <CardDescription>
          Konfigurace AI služeb pro generování metadat a obrázků tras
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Text/Metadata Provider */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI pro generování metadat (název, popis, terén)
          </Label>
          <Select
            value={settings.text_provider}
            onValueChange={(value: TextProvider) =>
              setSettings((prev) => ({ ...prev, text_provider: value }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TEXT_PROVIDER_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{info.name}</span>
                    {info.requiresKey && (
                      <Badge variant="outline" className="text-xs">
                        API klíč
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{textInfo.description}</p>
          {textInfo.requiresKey && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {settings.text_provider === "openai" && (
                  <>Vyžaduje secret <code className="bg-muted px-1 rounded">OPENAI_API_KEY</code></>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Image Provider */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            AI pro generování obrázků
          </Label>
          <Select
            value={settings.image_provider}
            onValueChange={(value: ImageProvider) =>
              setSettings((prev) => ({ ...prev, image_provider: value }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(IMAGE_PROVIDER_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{info.name}</span>
                    {info.requiresKey && (
                      <Badge variant="outline" className="text-xs">
                        API klíč
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{imageInfo.description}</p>
          {imageInfo.requiresKey && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {settings.image_provider === "openai" && (
                  <>Vyžaduje secret <code className="bg-muted px-1 rounded">OPENAI_API_KEY</code></>
                )}
                {settings.image_provider === "huggingface" && (
                  <>Vyžaduje secret <code className="bg-muted px-1 rounded">HUGGING_FACE_ACCESS_TOKEN</code></>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Info box */}
        <Alert className="bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Lovable AI</strong> je doporučená volba - kredity jsou zahrnuty v předplatném.
            Externí providery vyžadují vlastní API klíče a mohou mít dodatečné náklady.
          </AlertDescription>
        </Alert>

        {/* Current config summary */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Aktuální konfigurace:</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Text: {textInfo.name}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Obrázky: {imageInfo.name}
            </Badge>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Ukládání...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Uložit nastavení
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
