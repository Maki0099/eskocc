import { Calendar, Filter, Map, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EventsEmptyStateProps {
  variant: "no-events" | "filtered" | "guest";
  canCreate?: boolean;
  onCreate?: () => void;
  onClearFilter?: () => void;
}

const EventsEmptyState = ({ variant, canCreate, onCreate, onClearFilter }: EventsEmptyStateProps) => {
  if (variant === "filtered") {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
            <Filter className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="font-medium">V této kategorii nic není</p>
            <p className="text-sm text-muted-foreground">
              Zkus jiný filtr nebo zobraz všechny vyjížďky.
            </p>
          </div>
          {onClearFilter && (
            <Button variant="outline" size="sm" onClick={onClearFilter}>
              Zrušit filtr
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-14 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Calendar className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-1 max-w-sm">
          <p className="font-medium text-base">Žádné nadcházející vyjížďky</p>
          <p className="text-sm text-muted-foreground">
            {canCreate
              ? "Buď první a naplánuj vyjížďku pro klub."
              : "Zatím nic neběží. Mrkni na oblíbené trasy a inspiruj se."}
          </p>
        </div>
        {canCreate && onCreate ? (
          <Button onClick={onCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Naplánovat vyjížďku
          </Button>
        ) : (
          <Button asChild variant="outline" className="gap-2">
            <Link to="/events?tab=routes">
              <Map className="w-4 h-4" />
              Oblíbené trasy
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EventsEmptyState;
