import type { Finding } from "@threatory/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OutcomeBadge } from "./OutcomeBadge";
import { SeverityBadge } from "./SeverityBadge";

export interface FindingCardProps {
  finding: Finding;
  className?: string;
}

export function FindingCard({ finding, className }: FindingCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)} data-finding-code={finding.code}>
      <article aria-label={finding.title}>
        <CardHeader className="gap-3 border-b border-border/70 bg-slate-50/60 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <CardTitle as="h4" className="break-words text-base font-semibold text-foreground">
                {finding.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <code className="break-all rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                  {finding.code}
                </code>
                <span aria-hidden="true">•</span>
                <span className="capitalize">{finding.category}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <OutcomeBadge outcome={finding.outcome} />
              <SeverityBadge severity={finding.severity} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Evidence
            </p>
            <p className="break-words whitespace-pre-wrap rounded-md border border-border bg-slate-50 px-3 py-2 font-mono text-xs leading-relaxed text-foreground">
              {finding.evidence}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Explanation
            </p>
            <p className="break-words leading-relaxed text-foreground">{finding.explanation}</p>
          </div>

          {finding.recommendation ? (
            <div className="space-y-1 rounded-md border border-primary/20 border-l-4 border-l-primary bg-primary/5 px-3.5 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Recommendation
              </p>
              <p className="break-words leading-relaxed text-foreground">
                {finding.recommendation}
              </p>
            </div>
          ) : null}
        </CardContent>
      </article>
    </Card>
  );
}
