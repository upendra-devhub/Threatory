import type { Module, Report, RiskLevel } from "@threatory/contracts";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Info, Shield, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RiskLevelConfig {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  panelClass: string;
}

const RISK_LEVEL_CONFIG: Record<RiskLevel, RiskLevelConfig> = {
  none_detected: {
    label: "None detected",
    icon: Shield,
    badgeClass: "border-slate-300 bg-slate-100 text-slate-900",
    panelClass: "border-border bg-card",
  },
  low: {
    label: "Low risk",
    icon: Info,
    badgeClass: "border-sky-300 bg-sky-50 text-sky-900",
    panelClass: "border-sky-200 bg-card",
  },
  medium: {
    label: "Medium risk",
    icon: AlertTriangle,
    badgeClass: "border-amber-400 bg-amber-50 text-amber-950",
    panelClass: "border-amber-300 bg-card",
  },
  high: {
    label: "High risk",
    icon: ShieldAlert,
    badgeClass: "border-2 border-red-700 bg-red-50 text-red-950",
    panelClass: "border-red-300 bg-card",
  },
};

export interface AssessmentHeaderProps {
  assessment: Report["assessment"];
  module: Module;
  className?: string;
}

export function AssessmentHeader({ assessment, module, className }: AssessmentHeaderProps) {
  const config = RISK_LEVEL_CONFIG[assessment.riskLevel];
  const Icon = config.icon;
  const hasScore = typeof assessment.score === "number";

  return (
    <Card className={cn(config.panelClass, className)} data-module={module}>
      <CardContent className="pt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-risk-level={assessment.riskLevel}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm font-semibold",
                  config.badgeClass
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Risk level: {config.label}</span>
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Assessment summary
              </p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">{assessment.label}</p>
            </div>
          </div>

          {hasScore ? (
            <div className="rounded-lg border border-border bg-slate-50 px-4 py-3 sm:min-w-56 sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rule-based score
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                {assessment.score}
                <span className="text-sm font-medium text-muted-foreground"> / 100</span>
              </p>
              {assessment.scoreMeaning ? (
                <p className="mt-1 text-xs leading-snug text-foreground">
                  {assessment.scoreMeaning}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Weighted rule total, not a probability.
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
