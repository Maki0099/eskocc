import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import EditEventDialog from "@/components/events/EditEventDialog";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import PhotoUpload from "@/components/gallery/PhotoUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, MapPin, ExternalLink, ArrowLeft, Users, Trash2, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";

interface EventData {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string;
  route_link: string | null;
  created_by: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  status: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Photo {
  id: string;
  file_url: string;
  file_name: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  profile?: {
    full_name: string | null;
  } | null;
}

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isMember } = useUserRole();

  const [event, setEvent] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isParticipating, setIsParticipating] = useState(false);
  const [loading, setLoading] = useState(true);

  const isCreator = user && event?.created_by === user.id;
  const canEdit = isCreator || isAdmin;

  const fetchEvent = async () => {
    if (!id) return;

    try {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!eventData) {
        navigate("/events");
        return;
      }

      setEvent(eventData);

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("event_participants")
        .select(`
          id,
          user_id,
          status,
          profile:profiles(full_name, avatar_url)
        `)
        .eq("event_id", id)
        .eq("status", "going");

      if (participantsError) throw participantsError;

      setParticipants(participantsData || []);

      // Check if current user is participating
      if (user) {
        const userParticipation = participantsData?.find(
          (p) => p.user_id === user.id
        );
        setIsParticipating(!!userParticipation);
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      toast.error("Nepodařilo se načíst vyjížďku");
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("gallery_items")
        .select(`
          *,
          profile:profiles(full_name)
        `)
        .eq("event_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error fetching photos:", error);
    }
  };

  useEffect(() => {
    fetchEvent();
    fetchPhotos();
  }, [id, user]);

  const handleJoin = async () => {
    if (!user || !id) {
      toast.error("Pro přihlášení se musíte přihlásit");
      return;
    }

    try {
      const { error } = await supabase.from("event_participants").insert({
        event_id: id,
        user_id: user.id,
        status: "going",
      });

      if (error) throw error;

      toast.success("Úspěšně přihlášeno na vyjížďku");
      fetchEvent();
    } catch (error: any) {
      console.error("Error joining event:", error);
      toast.error(error.message || "Nepodařilo se přihlásit");
    }
  };

  const handleLeave = async () => {
    if (!user || !id) return;

    try {
      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Odhlášeno z vyjížďky");
      fetchEvent();
    } catch (error: any) {
      console.error("Error leaving event:", error);
      toast.error("Nepodařilo se odhlásit");
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;

      toast.success("Vyjížďka byla smazána");
      navigate("/events");
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error("Nepodařilo se smazat vyjížďku");
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-3xl mx-auto animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zpět na vyjížďky
          </Link>

          <div className="flex items-start justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold">{event.title}</h1>
            {canEdit && (
              <div className="flex gap-2">
                <EditEventDialog event={event} onEventUpdated={fetchEvent} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Smazat vyjížďku?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tato akce je nevratná. Vyjížďka a všechny přihlášky budou
                        trvale odstraněny.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        Smazat
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6 space-y-4">
              {event.description && (
                <p className="text-muted-foreground">{event.description}</p>
              )}

              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(event.event_date), "EEEE d. MMMM yyyy, HH:mm", {
                      locale: cs,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t">
                {event.route_link && (
                  <Button variant="outline" asChild>
                    <a
                      href={event.route_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Zobrazit trasu
                    </a>
                  </Button>
                )}

                {user &&
                  (isParticipating ? (
                    <Button variant="outline" onClick={handleLeave}>
                      Odhlásit se
                    </Button>
                  ) : (
                    <Button onClick={handleJoin}>Přihlásit se</Button>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Účastníci ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Zatím žádní účastníci
                </p>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-9 w-9">
                        {participant.profile?.avatar_url && (
                          <AvatarImage 
                            src={participant.profile.avatar_url} 
                            alt={participant.profile?.full_name || "Účastník"} 
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {getInitials(
                            participant.profile?.full_name || null,
                            "U"
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {participant.profile?.full_name || "Člen klubu"}
                        </p>
                      </div>
                      <Badge variant="secondary">Jede</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gallery Section */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="w-5 h-5" />
                  Fotky ({photos.length})
                </CardTitle>
                {user && isMember && (
                  <PhotoUpload eventId={id} onUploadComplete={fetchPhotos} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <PhotoGrid photos={photos} onPhotoDeleted={fetchPhotos} />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EventDetail;
