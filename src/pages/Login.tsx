import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import logoDark from "@/assets/logo-horizontal-dark.png";

const loginSchema = z.object({
  email: z.string().email("Neplatný formát emailu"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: validation.error.errors[0].message,
      });
      return;
    }

    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      let message = "Nepodařilo se přihlásit";
      if (error.message.includes("Invalid login credentials")) {
        message = "Nesprávný email nebo heslo";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Email nebyl potvrzen";
      }
      
      toast({
        variant: "destructive",
        title: "Chyba přihlášení",
        description: message,
      });
    } else {
      toast({
        title: "Přihlášení úspěšné",
        description: "Vítej zpět!",
      });
      navigate("/dashboard");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Zpět
        </Link>

        <div className="mb-8">
          <img src={logoDark} alt="ESKO.cc" className="h-6 mb-8" />
          <h1 className="text-2xl font-semibold mb-2">Přihlášení</h1>
          <p className="text-sm text-muted-foreground">Vítej zpět</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vas@email.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm">Heslo</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl"
              required
            />
          </div>

          <Button type="submit" variant="apple" className="w-full h-12 mt-6" disabled={loading}>
            {loading ? "Přihlašování..." : "Přihlásit se"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Nemáš účet?{" "}
          <Link to="/register" className="text-foreground hover:underline">
            Registruj se
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
