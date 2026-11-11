import { AlertCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  isRetrying = false,
  retryLabel = "Try again",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn("rounded-lg border border-red-300 bg-red-50/70 p-6 text-foreground", className)}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-red-950">{title}</h2>
            <p className="text-sm leading-relaxed text-red-900">{description}</p>
          </div>
          {onRetry || action ? (
            <div className="flex flex-wrap items-center gap-2">
              {onRetry ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  disabled={isRetrying}
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")}
                    aria-hidden="true"
                  />
                  <span>{isRetrying ? "Retrying..." : retryLabel}</span>
                </Button>
              ) : null}
              {action}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
