"use client";

import { useApiHealth, type ApiHealthState } from "@/hooks/useApiHealth";
import { cn } from "@/lib/utils";

export interface ApiStatusBadgeProps {
  state: ApiHealthState;
  className?: string;
}

export function ApiStatusBadge({ state, className }: ApiStatusBadgeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-api-status={state}
      className={cn("inline-flex items-center gap-2", className)}
    >
      {state === "connected" ? (
        <>
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-slate-800">
            API online
            <span className="sr-only">API: Connected</span>
          </span>
        </>
      ) : state === "checking" ? (
        <>
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-600">
            API: Checking
          </span>
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-xs font-semibold text-red-600">
            API: Unavailable
          </span>
        </>
      )}
    </div>
  );
}

export interface ApiStatusIndicatorProps {
  className?: string;
}

export function ApiStatusIndicator({ className }: ApiStatusIndicatorProps) {
  const { state } = useApiHealth();
  return <ApiStatusBadge state={state} className={className} />;
}
