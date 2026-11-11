import type { Module, Report } from "@threatory/contracts";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AssessmentHeader } from "./AssessmentHeader";
import { FindingGroup } from "./FindingGroup";
import { getRenderableDetails } from "./format-details";
import { LimitationsPanel } from "./LimitationsPanel";
import { PartialBanner } from "./PartialBanner";

const MODULE_LABELS: Record<Module, string> = {
  url: "URL Analyzer",
  privacy: "Privacy Analyzer",
  website: "Website Auditor",
};

const STATUS_BADGE_CONFIG: Record<
  Report["status"],
  { label: string; className: string }
> = {
  completed: {
    label: "Completed",
    className: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
  partial: {
    label: "Partial",
    className: "border-amber-400 bg-amber-50 text-amber-950",
  },
  failed: {
    label: "Failed",
    className: "border-red-400 bg-red-50 text-red-900",
  },
};

function formatCreatedAt(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return isoTimestamp;
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}

export interface ReportViewProps {
  report: Report;
  className?: string;
}

export function ReportView({ report, className }: ReportViewProps) {
  const statusConfig = STATUS_BADGE_CONFIG[report.status];
  const renderableDetails = getRenderableDetails(report.details);

  return (
    <div className={cn("space-y-6", className)}>
      {/* 1. Report heading */}
      <header className="space-y-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{MODULE_LABELS[report.module]}</Badge>
          <span
            data-report-status={report.status}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium",
              statusConfig.className
            )}
          >
            {report.status === "completed" ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>Status: {statusConfig.label}</span>
          </span>
        </div>

        <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
          {report.targetSummary}
        </h1>

        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <dt className="font-medium text-foreground">Report ID:</dt>
            <dd>
              <code className="break-all rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">
                {report.scanId}
              </code>
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="font-medium text-foreground">Created:</dt>
            <dd className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <time dateTime={report.createdAt}>{formatCreatedAt(report.createdAt)}</time>
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="font-medium text-foreground">Rules version:</dt>
            <dd className="font-mono text-foreground">{report.rulesVersion}</dd>
          </div>
        </dl>
      </header>

      {/* 2. Assessment */}
      <section aria-label="Assessment">
        <AssessmentHeader assessment={report.assessment} module={report.module} />
      </section>

      {/* 3. Report status banner for partial or failed */}
      {report.status === "partial" ? <PartialBanner /> : null}
      {report.status === "failed" ? (
        <Alert variant="destructive">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
            <div>
              <AlertTitle>Analysis did not complete</AlertTitle>
              <AlertDescription>
                This saved report recorded a failed scan status. Any available context, limitations,
                and metadata returned with the report are shown below.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ) : null}

      {/* 4. Findings */}
      <section aria-labelledby="findings-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="findings-heading" className="text-lg font-semibold text-foreground">
            Findings
          </h2>
          <span className="text-sm text-muted-foreground">
            {report.findings.length} {report.findings.length === 1 ? "item" : "items"}
          </span>
        </div>
        <FindingGroup findings={report.findings} />
      </section>

      {/* 5. Limitations */}
      <section aria-label="Scan limitations">
        <LimitationsPanel limitations={report.limitations} />
      </section>

      {/* 6. Optional Details */}
      {renderableDetails.length > 0 ? (
        <section aria-labelledby="report-details-heading">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle as="h2" id="report-details-heading" className="text-base font-semibold">
                Technical details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {renderableDetails.map((detail) => (
                  <div
                    key={detail.key}
                    className="rounded-md border border-border bg-slate-50/70 px-3 py-2"
                  >
                    <dt className="text-xs font-medium text-muted-foreground">{detail.label}</dt>
                    <dd className="mt-1 break-words font-mono text-xs text-foreground">
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
