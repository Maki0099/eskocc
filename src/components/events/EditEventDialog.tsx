import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarIcon, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  };
  onEventUpdated: () => void;
}

const EditEventDialog = ({ event, onEventUpdated }: EditEventDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
      });
    }
  }, [open, event]);

  const onSubmit = async (data: EventFormData) => {
    setLoading(true);
    try {
      const [hours, minutes] = data.event_time.split(":").map(Number);
      const eventDateTime = new Date(data.event_date);
      eventDateTime.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from("events")
        .update({
          title: data.title,
          description: data.description || null,
          event_date: eventDateTime.toISOString(),
          location: data.location,
          route_link: data.route_link || null,
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
      <DialogContent className="sm:max-w-[500px]">
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
