import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, UserCheck, Mail } from "lucide-react";

interface PendingMembershipWidgetProps {
  userEmail?: string;
}

const steps = [
  {
    id: 1,
    title: "Registrace dokončena",
    description: "Tvůj účet byl úspěšně vytvořen",
    icon: CheckCircle2,
    completed: true,
  },
  {
    id: 2,
    title: "Čekání na schválení",
    description: "Administrátor kontroluje tvoji žádost",
    icon: Clock,
    completed: false,
    current: true,
  },
  {
    id: 3,
    title: "Plný přístup",
    description: "Budeš moci využívat všechny funkce klubu",
    icon: UserCheck,
    completed: false,
  },
];

const PendingMembershipWidget = ({ userEmail }: PendingMembershipWidgetProps) => {
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Stav členství</h3>
            <Badge variant="secondary" className="mt-1">
              Čeká na schválení
            </Badge>
          </div>
        </div>

        {/* Progress steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            
            return (
              <div key={step.id} className="relative">
                <div className="flex gap-4">
                  {/* Icon and line */}
                  <div className="flex flex-col items-center">
                    <div 
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center shrink-0
                        ${step.completed 
                          ? 'bg-primary text-primary-foreground' 
                          : step.current 
                            ? 'bg-primary/20 text-primary ring-2 ring-primary/30' 
                            : 'bg-muted text-muted-foreground'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {!isLast && (
                      <div 
                        className={`w-0.5 h-full min-h-[24px] mt-2 ${
                          step.completed ? 'bg-primary' : 'bg-border'
                        }`} 
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-4">
                    <p className={`font-medium ${step.current ? 'text-primary' : ''}`}>
                      {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info box */}
        <div className="mt-4 p-4 rounded-lg bg-muted/50 flex items-start gap-3">
          <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-muted-foreground">
              Jakmile bude tvé členství schváleno, budeš moci:
            </p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary" />
                Přihlašovat se na vyjížďky
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary" />
                Prohlížet fotogalerii
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary" />
                Sledovat statistiky a žebříčky
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary" />
                Propojit svůj Strava účet
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingMembershipWidget;
