import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Eye, EyeOff, Check, X } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PersonalDetailsStepProps {
  fullName: string;
  setFullName: (value: string) => void;
  nickname: string;
  setNickname: (value: string) => void;
  birthDate: Date | undefined;
  setBirthDate: (value: Date | undefined) => void;
  phone: string;
  setPhone: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  onNext: () => void;
}

const PersonalDetailsStep = ({
  fullName,
  setFullName,
  nickname,
  setNickname,
  birthDate,
  setBirthDate,
  phone,
  setPhone,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onNext,
}: PersonalDetailsStepProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isPasswordLongEnough = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isValid = fullName.length >= 2 && email.includes("@") && isPasswordLongEnough && passwordsMatch;

  // Password strength calculation
  const getPasswordStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (pwd.length === 0) return { level: 0, label: "", color: "" };
    
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { level: 1, label: "Slabé", color: "bg-red-500" };
    if (score <= 3) return { level: 2, label: "Střední", color: "bg-yellow-500" };
    return { level: 3, label: "Silné", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="space-y-4">
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
        <Label htmlFor="phone" className="text-sm">Telefon</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+420 xxx xxx xxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-12 rounded-xl"
        />
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
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    passwordStrength.level >= level ? passwordStrength.color : "bg-muted"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className={cn(
                "flex items-center gap-1.5",
                isPasswordLongEnough ? "text-green-600" : "text-muted-foreground"
              )}>
                {isPasswordLongEnough ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                Minimálně 6 znaků
              </div>
              {passwordStrength.label && (
                <span className="text-muted-foreground">{passwordStrength.label}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm">Potvrdit heslo *</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 rounded-xl pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmPassword.length > 0 && (
          <div className={cn(
            "flex items-center gap-1.5 text-xs",
            passwordsMatch ? "text-green-600" : "text-destructive"
          )}>
            {passwordsMatch ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            {passwordsMatch ? "Hesla se shodují" : "Hesla se neshodují"}
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="apple"
        className="w-full h-12 mt-6"
        onClick={onNext}
        disabled={!isValid}
      >
        Pokračovat
      </Button>
    </div>
  );
};

export default PersonalDetailsStep;
