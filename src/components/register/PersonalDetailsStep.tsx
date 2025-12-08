import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
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
  const isValid = fullName.length >= 2 && email.includes("@") && password.length >= 6 && password === confirmPassword;

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
