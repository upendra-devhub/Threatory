"use client";

import type { LucideIcon } from "lucide-react";
import { Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { type ApiHealthState, useApiHealth } from "@/hooks/useApiHealth";
import { cn } from "@/lib/utils";

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

const STATUS_CONFIG: Record<ApiHealthState, StatusConfig> = {
  checking: {
    label: "API: Checking",
    icon: Activity,
    className: "border-slate-300 bg-slate-100 text-slate-800",
  },
  connected: {
    label: "API: Connected",
    icon: CheckCircle2,
    className: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
  unavailable: {
    label: "API: Unavailable",
    icon: AlertCircle,
    className: "border-red-300 bg-red-50 text-red-900",
  },
};

export interface ApiStatusBadgeProps {
  state: ApiHealthState;
  className?: string;
}

export function ApiStatusBadge({ state, className }: ApiStatusBadgeProps) {
  const config = STATUS_CONFIG[state];
  const Icon = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      data-api-status={state}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
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

