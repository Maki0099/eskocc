import { ExternalLink } from "lucide-react";

interface StravaFollowBadgeProps {
  stravaId: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const StravaFollowBadge = ({ stravaId, size = 'md', showText = true }: StravaFollowBadgeProps) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const containerClasses = {
    sm: 'gap-1 px-2 py-1',
    md: 'gap-1.5 px-3 py-1.5',
    lg: 'gap-2 px-4 py-2',
  };

  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm font-medium',
  };

  return (
    <a
      href={`https://www.strava.com/athletes/${stravaId}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Sledovat na Stravě"
      className={`inline-flex items-center rounded-full bg-[#FC4C02] text-white hover:bg-[#E34402] transition-colors ${containerClasses[size]}`}
    >
      {/* Strava Logo SVG */}
      <svg 
        className={sizeClasses[size]} 
        viewBox="0 0 24 24" 
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.015 13.828h4.169" />
      </svg>
      {showText && (
        <>
          <span className={textClasses[size]}>Follow</span>
          {size === 'lg' && <ExternalLink className="w-3.5 h-3.5 opacity-70" />}
        </>
      )}
    </a>
  );
};

export default StravaFollowBadge;
