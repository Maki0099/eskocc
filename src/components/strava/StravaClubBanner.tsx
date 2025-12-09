import { useState, useEffect } from "react";
import { X, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STRAVA_CLUB_URL } from "@/lib/constants";

const STORAGE_KEY = "strava_club_dismissed";

interface StravaClubBannerProps {
  hasStravaConnected: boolean;
  isClubMember?: boolean;
}

const StravaClubBanner = ({ hasStravaConnected, isClubMember }: StravaClubBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === "true");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsDismissed(true);
  };

  // Don't show if user hasn't connected Strava, has dismissed, or is already a club member
  if (!hasStravaConnected || isDismissed || isClubMember) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FC4C02] to-[#E34402] p-4 md:p-5 text-white animate-fade-in">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>
      
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Zavřít"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <Users className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1">
            Přidej se do klubu ESKO.cc na Stravě
          </h3>
          <p className="text-white/80 text-sm">
            Sleduj výkon ostatních členů a porovnávej se v klubových žebříčcích
          </p>
        </div>

        <Button
          asChild
          variant="secondary"
          className="flex-shrink-0 bg-white text-[#FC4C02] hover:bg-white/90 font-medium"
        >
          <a href={STRAVA_CLUB_URL} target="_blank" rel="noopener noreferrer">
            Přidat se do klubu
          </a>
        </Button>
      </div>
    </div>
  );
};

export default StravaClubBanner;
