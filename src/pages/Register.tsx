import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import logoDark from "@/assets/logo-horizontal-dark.png";

const registerSchema = z.object({
  fullName: z.string().min(2, "Jméno musí mít alespoň 2 znaky").max(100),
  email: z.string().email("Neplatný formát emailu").max(255),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
  confirmPassword: z.string(),
  nickname: z.string().max(50).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hesla se neshodují",
  path: ["confirmPassword"],
});

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = registerSchema.safeParse({ fullName, email, password, confirmPassword, nickname });
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: validation.error.errors[0].message,
      });
      return;
    }

    setLoading(true);
    
    const { error } = await signUp(email, password, fullName, nickname || undefined, birthDate);
    
    if (error) {
      let message = "Nepodařilo se vytvořit účet";
      if (error.message.includes("User already registered")) {
        message = "Tento email je již zaregistrován";
      } else if (error.message.includes("Password should be")) {
        message = "Heslo musí mít alespoň 6 znaků";
      }
      
      toast({
        variant: "destructive",
        title: "Chyba registrace",
        description: message,
      });
    } else {
      toast({
        title: "Registrace úspěšná",
        description: "Vítej v klubu! Tvůj účet čeká na schválení administrátorem.",
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
          <h1 className="text-2xl font-semibold mb-2">Registrace</h1>
          <p className="text-sm text-muted-foreground">Staň se členem ESKO.cc</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm">Celé jméno *</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jan Novák"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname" className="text-sm">Přezdívka</Label>
            <Input
              id="nickname"
              type="text"
              placeholder="Honza"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Datum narození</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className={cn(
                    "w-full h-12 rounded-xl justify-start text-left font-normal",
                    !birthDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthDate ? format(birthDate, "d. MMMM yyyy", { locale: cs }) : "Vyber datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={birthDate}
                  onSelect={setBirthDate}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                  className="pointer-events-auto"
                  captionLayout="dropdown-buttons"
                  fromYear={1940}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Email *</Label>
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
            <Label htmlFor="password" className="text-sm">Heslo *</Label>
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm">Potvrdit heslo *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 rounded-xl"
              required
            />
          </div>

          <Button type="submit" variant="apple" className="w-full h-12 mt-6" disabled={loading}>
            {loading ? "Registrace..." : "Zaregistrovat se"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Máš už účet?{" "}
          <Link to="/login" className="text-foreground hover:underline">
            Přihlas se
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
