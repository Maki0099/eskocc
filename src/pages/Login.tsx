import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bike, Mail, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Placeholder for Supabase auth
    toast({
      title: "Přihlášení",
      description: "Pro funkční přihlášení je potřeba propojit Supabase.",
    });
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Zpět na hlavní stránku
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bike className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold">Přihlášení</h1>
              <p className="text-sm text-muted-foreground">Vítej zpět v EskoCC</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vas@email.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? "Přihlašování..." : "Přihlásit se"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Nemáš účet?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Registruj se
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 via-secondary to-accent/20 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <blockquote className="text-2xl font-heading italic text-foreground mb-4">
            „Jezdi tak dlouho, nebo krátce jak zvládáš, ALE JEZDI"
          </blockquote>
          <p className="text-primary font-medium">— Eddy Merckx</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
