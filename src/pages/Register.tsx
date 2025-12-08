import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import logoDark from "@/assets/logo-horizontal-dark.png";
import RegistrationSteps from "@/components/register/RegistrationSteps";
import PersonalDetailsStep from "@/components/register/PersonalDetailsStep";
import StravaConnectStep from "@/components/register/StravaConnectStep";
import TermsAndConditions from "@/components/register/TermsAndConditions";

const registerSchema = z.object({
  fullName: z.string().min(2, "Jméno musí mít alespoň 2 znaky").max(100),
  email: z.string().email("Neplatný formát emailu").max(255),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
  confirmPassword: z.string(),
  nickname: z.string().max(50).optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Musíš souhlasit s podmínkami členství" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hesla se neshodují",
  path: ["confirmPassword"],
});

const Register = () => {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleStravaConnect = () => {
    localStorage.setItem("stravaConnectPending", "true");
    setStep(3);
  };

  const handleStravaSkip = () => {
    localStorage.removeItem("stravaConnectPending");
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = registerSchema.safeParse({ 
      fullName, 
      email, 
      password, 
      confirmPassword, 
      nickname,
      termsAccepted 
    });
    
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: validation.error.errors[0].message,
      });
      return;
    }

    setLoading(true);
    
    const { error } = await signUp(email, password, fullName, nickname || undefined, birthDate, phone || undefined);
    
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

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-8">
          {step === 1 ? (
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Zpět
            </Link>
          ) : (
            <button 
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Zpět
            </button>
          )}
        </div>

        <div className="mb-6">
          <img src={logoDark} alt="ESKO.cc" className="h-6 mb-6" />
          <RegistrationSteps currentStep={step} totalSteps={3} />
          <h1 className="text-2xl font-semibold mb-2">
            {step === 1 && "Registrace"}
            {step === 2 && "Strava"}
            {step === 3 && "Podmínky"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === 1 && "Staň se členem ESKO.cc"}
            {step === 2 && "Propoj svůj sportovní profil"}
            {step === 3 && "Poslední krok před odesláním"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <PersonalDetailsStep
              fullName={fullName}
              setFullName={setFullName}
              nickname={nickname}
              setNickname={setNickname}
              birthDate={birthDate}
              setBirthDate={setBirthDate}
              phone={phone}
              setPhone={setPhone}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StravaConnectStep
              onConnect={handleStravaConnect}
              onSkip={handleStravaSkip}
            />
          )}

          {step === 3 && (
            <div className="space-y-6">
              <TermsAndConditions
                accepted={termsAccepted}
                onAcceptedChange={setTermsAccepted}
              />
              <Button 
                type="submit" 
                variant="apple" 
                className="w-full h-12" 
                disabled={loading || !termsAccepted}
              >
                {loading ? "Registrace..." : "Zaregistrovat se"}
              </Button>
            </div>
          )}
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
