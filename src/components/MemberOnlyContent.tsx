import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, UserPlus, LogIn, Clock } from "lucide-react";

interface MemberOnlyContentProps {
  title?: string;
  description?: string;
}

const MemberOnlyContent = ({ 
  title = "Obsah pro členy klubu",
  description = "Tato sekce je přístupná pouze pro registrované členy cyklistického klubu Eskocc."
}: MemberOnlyContentProps) => {
  const { user } = useAuth();
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPending = role === "pending";

  return (
    <Card className="max-w-lg mx-auto border-dashed">
      <CardContent className="py-12 sm:py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        
        <h2 className="text-2xl font-bold mb-3">{title}</h2>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          {description}
        </p>

        {!user ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/login" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Přihlásit se
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/register" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Registrovat se
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Staň se členem a získej přístup ke všem funkcím klubu
            </p>
          </div>
        ) : isPending ? (
          <div className="space-y-4">
            <Badge variant="secondary" className="px-4 py-2 text-sm gap-2">
              <Clock className="w-4 h-4" />
              Čekáte na schválení členství
            </Badge>
            <p className="text-sm text-muted-foreground">
              Vaše registrace byla přijata. Administrátor ji brzy schválí.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default MemberOnlyContent;
