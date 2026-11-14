import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface PartialBannerProps {
  unassessedChecks?: string[];
  className?: string;
}

export function PartialBanner({ unassessedChecks, className }: PartialBannerProps) {
  return (
    <Alert variant="warning" className={className} data-testid="partial-scan-banner">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden="true" />
        <div className="space-y-1">
          <AlertTitle>Partial scan results</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Some checks could not be completed during this scan. The available findings are still
              shown below; please review the limitations section to see what was not assessed.
            </p>
            {unassessedChecks && unassessedChecks.length > 0 && (
              <div className="mt-2 text-xs" data-testid="unassessed-checks-list">
                <span className="font-semibold text-amber-950">
                  Checks that could not complete:
                </span>{" "}
                <span className="font-mono text-amber-900">
                  {unassessedChecks.join(", ")}
                </span>
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
