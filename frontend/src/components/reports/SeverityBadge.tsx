import type { Severity } from "@threatory/contracts";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CircleDot, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeverityConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

const SEVERITY_CONFIG: Record<Severity, SeverityConfig> = {
  info: {
    label: "Info",
    icon: Info,
    className: "border border-slate-300 bg-slate-50 font-normal text-slate-700",
  },
  low: {
    label: "Low",
    icon: CircleDot,
    className: "border border-sky-300 bg-sky-50 font-medium text-sky-900",
  },
  medium: {
    label: "Medium",
    icon: AlertCircle,
    className: "border border-amber-500 bg-amber-50 font-semibold text-amber-950",
  },
  high: {
    label: "High",
    icon: ShieldAlert,
    className: "border-2 border-red-700 bg-red-50 font-bold text-red-950",
  },
};

export interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;

  return (
    <span
      data-severity={severity}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs",
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="sr-only">Severity: </span>
        {config.label}
      </span>
    </span>
  );
}
