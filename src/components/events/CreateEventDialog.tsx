import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

interface CreateEventDialogProps {
  onEventCreated: () => void;
}

const CreateEventDialog = ({ onEventCreated }: CreateEventDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      event_time: "09:00",
      location: "",
      route_link: "",
    },
  });

  const onSubmit = async (data: EventFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const [hours, minutes] = data.event_time.split(":").map(Number);
      const eventDateTime = new Date(data.event_date);
      eventDateTime.setHours(hours, minutes, 0, 0);

      const { error } = await supabase.from("events").insert({
        title: data.title,
        description: data.description || null,
        event_date: eventDateTime.toISOString(),
        location: data.location,
        route_link: data.route_link || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Vyjížďka byla vytvořena");
      form.reset();
      setOpen(false);
      onEventCreated();
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast.error(error.message || "Nepodařilo se vytvořit vyjížďku");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nová vyjížďka
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Vytvořit novou vyjížďku</DialogTitle>
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
                          disabled={(date) => date < new Date()}
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
                    <Input
                      placeholder="https://mapy.cz/..."
                      {...field}
                    />
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
                {loading ? "Vytvářím..." : "Vytvořit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
