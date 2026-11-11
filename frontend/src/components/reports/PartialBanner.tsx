import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface PartialBannerProps {
  className?: string;
}

export function PartialBanner({ className }: PartialBannerProps) {
  return (
    <Alert variant="warning" className={className}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden="true" />
        <div>
          <AlertTitle>Partial scan results</AlertTitle>
          <AlertDescription>
            Some checks could not be completed during this scan. The available findings are still
            shown below; please review the limitations section to see what was not assessed.
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
