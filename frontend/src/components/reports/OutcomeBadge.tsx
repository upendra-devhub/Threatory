import type { Outcome } from "@threatory/contracts";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OutcomeConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

const OUTCOME_CONFIG: Record<Outcome, OutcomeConfig> = {
  pass: {
    label: "Pass",
    icon: CheckCircle2,
    className: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
  warn: {
    label: "Warning",
    icon: AlertTriangle,
    className: "border-amber-400 bg-amber-50 text-amber-950",
  },
  fail: {
    label: "Failed",
    icon: XCircle,
    className: "border-red-400 bg-red-50 text-red-900",
  },
  not_assessed: {
    label: "Not assessed",
    icon: CircleDashed,
    className: "border-dashed border-slate-400 bg-slate-100 text-slate-800",
  },
};

export interface OutcomeBadgeProps {
  outcome: Outcome;
  className?: string;
}

export function OutcomeBadge({ outcome, className }: OutcomeBadgeProps) {
  const config = OUTCOME_CONFIG[outcome];
  const Icon = config.icon;

  return (
    <span
      data-testid="outcome-badge"
      data-outcome={outcome}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="sr-only">Outcome: </span>
        {config.label}
      </span>
    </span>
  );
}
