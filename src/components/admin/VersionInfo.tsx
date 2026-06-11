import { GitCommit, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cs } from "date-fns/locale";

const COMMIT = __APP_COMMIT_HASH__;
const BUILD_DATE = __APP_BUILD_DATE__;
const REPO = __APP_REPO__;

const VersionInfo = () => {
  const buildDate = new Date(BUILD_DATE);
  const isValidDate = !isNaN(buildDate.getTime());
  const commitUrl = REPO ? `https://github.com/${REPO}/commit/${COMMIT}` : null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground border border-border/50 rounded-lg px-3 py-2 bg-muted/30">
      <span className="flex items-center gap-1.5">
        <GitCommit className="w-3.5 h-3.5" />
        {commitUrl ? (
          <a
            href={commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            {COMMIT}
          </a>
        ) : (
          <span className="font-mono">{COMMIT}</span>
        )}
      </span>
      {isValidDate && (
        <span className="flex items-center gap-1.5" title={format(buildDate, "d. M. yyyy HH:mm:ss", { locale: cs })}>
          <Clock className="w-3.5 h-3.5" />
          Build {format(buildDate, "d. M. yyyy HH:mm", { locale: cs })}
          <span className="text-muted-foreground/70">
            ({formatDistanceToNow(buildDate, { addSuffix: true, locale: cs })})
          </span>
        </span>
      )}
    </div>
  );
};

export default VersionInfo;
