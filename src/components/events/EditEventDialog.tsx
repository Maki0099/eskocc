import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarIcon, Pencil, Upload, X, FileText, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const eventSchema = z.object({
  title: z.string().min(1, "Název je povinný").max(100, "Max 100 znaků"),
  description: z.string().max(500, "Max 500 znaků").optional(),
  event_date: z.date({ required_error: "Datum je povinné" }),
  event_time: z.string().min(1, "Čas je povinný"),
  location: z.string().min(1, "Místo je povinné").max(200, "Max 200 znaků"),
  route_link: z.string().url("Neplatná URL").optional().or(z.literal("")),
  distance_km: z.coerce.number().min(0).max(500).optional().or(z.literal("")),
  elevation_m: z.coerce.number().min(0).max(10000).optional().or(z.literal("")),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().or(z.literal("")),
  terrain_type: z.enum(["road", "gravel", "mtb", "mixed"]).optional().or(z.literal("")),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EditEventDialogProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    location: string;
    route_link: string | null;
    cover_image_url?: string | null;
    gpx_file_url?: string | null;
    distance_km?: number | null;
    elevation_m?: number | null;
    difficulty?: string | null;
    terrain_type?: string | null;
  };
  onEventUpdated: () => void;
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

const EditEventDialog = ({ event, onEventUpdated }: EditEventDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(event.cover_image_url || null);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [existingGpx, setExistingGpx] = useState<string | null>(event.gpx_file_url || null);
  const [parsingGpx, setParsingGpx] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);

  const eventDate = new Date(event.event_date);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event.title,
      description: event.description || "",
      event_date: eventDate,
      event_time: format(eventDate, "HH:mm"),
      location: event.location,
      route_link: event.route_link || "",
      distance_km: event.distance_km || "",
      elevation_m: event.elevation_m || "",
      difficulty: (event.difficulty as "easy" | "medium" | "hard") || "",
      terrain_type: (event.terrain_type as "road" | "gravel" | "mtb" | "mixed") || "",
    },
  });

  useEffect(() => {
    if (open) {
      const eventDate = new Date(event.event_date);
      form.reset({
        title: event.title,
        description: event.description || "",
        event_date: eventDate,
        event_time: format(eventDate, "HH:mm"),
        location: event.location,
        route_link: event.route_link || "",
        distance_km: event.distance_km || "",
        elevation_m: event.elevation_m || "",
        difficulty: (event.difficulty as "easy" | "medium" | "hard") || "",
        terrain_type: (event.terrain_type as "road" | "gravel" | "mtb" | "mixed") || "",
      });
      setCoverPreview(event.cover_image_url || null);
      setExistingGpx(event.gpx_file_url || null);
      setCoverImage(null);
      setGpxFile(null);
    }
  }, [open, event]);

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
      setExistingGpx(null);
      
      // Parse GPX for distance and elevation
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
    setExistingGpx(null);
    if (gpxInputRef.current) gpxInputRef.current.value = "";
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage.from("events").upload(path, file, { upsert: true });
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data } = supabase.storage.from("events").getPublicUrl(path);
    return data.publicUrl;
  };

  const onSubmit = async (data: EventFormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [hours, minutes] = data.event_time.split(":").map(Number);
      const eventDateTime = new Date(data.event_date);
      eventDateTime.setHours(hours, minutes, 0, 0);

      // Upload new files if present
      let coverImageUrl: string | null | undefined = coverPreview;
      let gpxFileUrl: string | null | undefined = existingGpx;
      const timestamp = Date.now();

      if (coverImage) {
        const ext = coverImage.name.split(".").pop();
        const path = `covers/${timestamp}_${event.id}.${ext}`;
        coverImageUrl = await uploadFile(coverImage, path);
      } else if (coverPreview === null) {
        coverImageUrl = null;
      }

      if (gpxFile) {
        const path = `gpx/${timestamp}_${event.id}.gpx`;
        gpxFileUrl = await uploadFile(gpxFile, path);
      } else if (existingGpx === null && !gpxFile) {
        gpxFileUrl = null;
      }

      const { error } = await supabase
        .from("events")
        .update({
          title: data.title,
          description: data.description || null,
          event_date: eventDateTime.toISOString(),
          location: data.location,
          route_link: data.route_link || null,
          cover_image_url: coverImageUrl,
          gpx_file_url: gpxFileUrl,
          distance_km: data.distance_km || null,
          elevation_m: data.elevation_m || null,
          difficulty: data.difficulty || null,
          terrain_type: data.terrain_type || null,
        })
        .eq("id", event.id);

      if (error) throw error;

      toast.success("Vyjížďka byla upravena");
      setOpen(false);
      onEventUpdated();
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast.error(error.message || "Nepodařilo se upravit vyjížďku");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upravit vyjížďku</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Název vyjížďky</FormLabel>
                  <FormControl>
                    <Input placeholder="Např. Sobotní okruh" {...field} />
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
                      placeholder="Detaily o trase, obtížnosti..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="event_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Datum</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "d. M. yyyy", { locale: cs })
                            ) : (
                              <span>Vyberte datum</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="event_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Čas</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Místo srazu</FormLabel>
                  <FormControl>
                    <Input placeholder="Např. Náměstí, parkoviště u lesa" {...field} />
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
                    <Input placeholder="https://mapy.cz/..." {...field} />
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
              ) : existingGpx ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm">GPX soubor nahrán</span>
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
                  <Upload className="w-4 h-4 mr-2" />
                  Nahrát GPX
                </Button>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Zrušit
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Ukládám..." : "Uložit změny"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventDialog;
