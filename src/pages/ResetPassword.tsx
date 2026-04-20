import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import logoDark from "@/assets/logo-horizontal-dark.png";

const passwordSchema = z.object({
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hesla se neshodují",
  path: ["confirmPassword"],
});

type LinkErrorState = {
  code: string;
  description: string;
} | null;

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [success, setSuccess] = useState(false);
  const [linkError, setLinkError] = useState<LinkErrorState>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // 1) Check URL hash for explicit auth errors (otp_expired, access_denied, ...)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorCode = hashParams.get("error_code");
    const errorParam = hashParams.get("error");
    const errorDescription = hashParams.get("error_description");
    const type = hashParams.get("type");

    if (errorParam || errorCode) {
      setLinkError({
        code: errorCode || errorParam || "unknown",
        description: errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
          : "Odkaz pro reset hesla je neplatný nebo už vypršel.",
      });
      setCheckingSession(false);
      return;
    }

    // 2) Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setCheckingSession(false);
      }
    });

    // 3) Also check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (type === "recovery" || session) {
        setIsRecoveryMode(true);
      }
      setCheckingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Redirect to login only if no session, no recovery mode, and no explicit link error to show
    if (!checkingSession && !isRecoveryMode && !success && !linkError) {
      toast({
        variant: "destructive",
        title: "Neplatný odkaz",
        description: "Odkaz pro reset hesla je neplatný nebo vypršel",
      });
      navigate("/login");
    }
  }, [checkingSession, isRecoveryMode, success, linkError, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: validation.error.errors[0].message,
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se změnit heslo. Zkuste to prosím znovu.",
      });
    } else {
      setSuccess(true);
      toast({
        title: "Heslo změněno",
        description: "Tvoje heslo bylo úspěšně změněno",
      });
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    }

    setLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (linkError) {
    const isExpired =
      linkError.code === "otp_expired" ||
      linkError.description.toLowerCase().includes("expired");

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">
              {isExpired ? "Odkaz vypršel" : "Neplatný odkaz"}
            </h1>
            <p className="text-sm text-muted-foreground mb-2">
              {isExpired
                ? "Odkaz pro reset hesla vypršel nebo už byl použit. Požádej o nový."
                : linkError.description}
            </p>
            <p className="text-xs text-muted-foreground">
              Tip: Některé emailové klienty (Outlook, Gmail) odkaz „prokliknou" preventivně kvůli kontrole bezpečnosti, čímž ho znehodnotí. Pokud se to opakuje, zkus odkaz otevřít hned po obdržení emailu.
            </p>
          </div>

          <Button asChild variant="apple" className="w-full h-12">
            <Link to="/login">Požádat o nový odkaz</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Heslo změněno</h1>
            <p className="text-sm text-muted-foreground">
              Přesměrování na dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět na přihlášení
        </Link>

        <div className="mb-8">
          <img src={logoDark} alt="ESKO.cc" className="h-6 mb-8" />
          <h1 className="text-2xl font-semibold mb-2">Nové heslo</h1>
          <p className="text-sm text-muted-foreground">
            Zadej své nové heslo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm">
              Nové heslo
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm">
              Potvrdit heslo
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 rounded-xl"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            variant="apple"
            className="w-full h-12 mt-6"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ukládám...
              </>
            ) : (
              "Uložit nové heslo"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
