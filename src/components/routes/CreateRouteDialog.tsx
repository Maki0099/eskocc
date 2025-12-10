import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, FileText, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { parseGpxFile } from "@/lib/gpx-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const routeSchema = z.object({
  title: z.string().min(1, "Název je povinný").max(100, "Max 100 znaků"),
  description: z.string().max(500, "Max 500 znaků").optional(),
  route_link: z.string().url("Neplatná URL").optional().or(z.literal("")),
  distance_km: z.coerce.number().min(0).max(500).optional().or(z.literal("")),
  elevation_m: z.coerce.number().min(0).max(10000).optional().or(z.literal("")),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().or(z.literal("")),
  terrain_type: z.enum(["road", "gravel", "mtb", "mixed"]).optional().or(z.literal("")),
});

type RouteFormData = z.infer<typeof routeSchema>;

interface CreateRouteDialogProps {
  onRouteCreated: () => void;
}

const DIFFICULTY_LABELS = {
  easy: "Lehká",
  medium: "Střední",
  hard: "Náročná",
};

const TERRAIN_LABELS = {
  road: "Silnice",
  gravel: "Gravel",
  mtb: "MTB",
  mixed: "Mix",
};

const CreateRouteDialog = ({ onRouteCreated }: CreateRouteDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [parsingGpx, setParsingGpx] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      title: "",
      description: "",
      route_link: "",
      distance_km: "",
      elevation_m: "",
      difficulty: "",
      terrain_type: "",
    },
  });

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Obrázek je příliš velký (max 5 MB)");
        return;
      }
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleGpxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".gpx")) {
        toast.error("Pouze GPX soubory jsou povoleny");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("GPX soubor je příliš velký (max 10 MB)");
        return;
      }
      setGpxFile(file);
      
      setParsingGpx(true);
      const stats = await parseGpxFile(file);
      setParsingGpx(false);
      
      if (stats) {
        form.setValue("distance_km", stats.distanceKm);
        form.setValue("elevation_m", stats.elevationM);
        toast.success(`GPX načteno: ${stats.distanceKm} km, ${stats.elevationM} m převýšení`);
      }
    }
  };

  const removeCover = () => {
    setCoverImage(null);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const removeGpx = () => {
    setGpxFile(null);
    if (gpxInputRef.current) gpxInputRef.current.value = "";
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage.from("events").upload(path, file);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data } = supabase.storage.from("events").getPublicUrl(path);
    return data.publicUrl;
  };

  const onSubmit = async (data: RouteFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      let coverImageUrl: string | null = null;
      let gpxFileUrl: string | null = null;
      const timestamp = Date.now();

      if (coverImage) {
        const ext = coverImage.name.split(".").pop();
        const path = `routes/covers/${timestamp}_${user.id}.${ext}`;
        coverImageUrl = await uploadFile(coverImage, path);
      }

      if (gpxFile) {
        const path = `routes/gpx/${timestamp}_${user.id}.gpx`;
        gpxFileUrl = await uploadFile(gpxFile, path);
      }

      const { error } = await supabase.from("favorite_routes").insert({
        title: data.title,
        description: data.description || null,
        route_link: data.route_link || null,
        created_by: user.id,
        cover_image_url: coverImageUrl,
        gpx_file_url: gpxFileUrl,
        distance_km: data.distance_km || null,
        elevation_m: data.elevation_m || null,
        difficulty: data.difficulty || null,
        terrain_type: data.terrain_type || null,
      });

      if (error) throw error;

      toast.success("Trasa byla přidána");
      form.reset();
      setCoverImage(null);
      setCoverPreview(null);
      setGpxFile(null);
      setOpen(false);
      onRouteCreated();
    } catch (error: any) {
      console.error("Error creating route:", error);
      toast.error(error.message || "Nepodařilo se přidat trasu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Přidat trasu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Přidat oblíbenou trasu</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Název trasy</FormLabel>
                  <FormControl>
                    <Input placeholder="Např. Beskydy okruh" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Image Upload */}
            <div className="space-y-2">
              <FormLabel>Náhledový obrázek (volitelný)</FormLabel>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
              {coverPreview ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={coverPreview}
                    alt="Preview"
                    className="w-full h-40 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={removeCover}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Nahrát obrázek
                </Button>
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Popis (volitelný)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detaily o trase, zajímavosti..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Route Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="distance_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vzdálenost (km)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50" min={0} max={500} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="elevation_m"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Převýšení (m)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="800" min={0} max={10000} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Obtížnost</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte obtížnost" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terrain_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ terénu</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte terén" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TERRAIN_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="route_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Odkaz na trasu (volitelný)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://mapy.cz/..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GPX File Upload */}
            <div className="space-y-2">
              <FormLabel>GPX soubor (volitelný)</FormLabel>
              <input
                ref={gpxInputRef}
                type="file"
                accept=".gpx"
                onChange={handleGpxChange}
                className="hidden"
              />
              {parsingGpx ? (
                <div className="flex items-center justify-center p-3 rounded-lg bg-muted">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" />
                  <span className="text-sm">Načítám data z GPX...</span>
                </div>
              ) : gpxFile ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm truncate max-w-[200px]">{gpxFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={removeGpx}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => gpxInputRef.current?.click()}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Nahrát GPX soubor
                </Button>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Zrušit
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ukládám...
                  </>
                ) : (
                  "Přidat trasu"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRouteDialog;
