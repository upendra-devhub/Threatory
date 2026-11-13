import React from "react";
import Link from "next/link";
import { Report } from "@threatory/contracts";
import { AssessmentHeader } from "@/components/reports/AssessmentHeader";
import { FindingGroup } from "@/components/reports/FindingGroup";
import { LimitationsPanel } from "@/components/reports/LimitationsPanel";
import { PartialBanner } from "@/components/reports/PartialBanner";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, ShieldCheck, UserCheck } from "lucide-react";

export interface PrivacyResultProps {
  report: Report;
}

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toUTCString();
  } catch {
    return isoString;
  }
}

export function PrivacyResult({ report }: PrivacyResultProps) {
  return (
    <div className="space-y-6 pt-2" data-testid="privacy-scan-result">
      {/* 1. Header bar with Saved Report Link and Sanitized Target Summary */}
      <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Analyzed Information Target
            </span>
            {/* STRICT PLAIN TEXT RENDERING: Never contains unmasked sensitive input */}
            <div
              className="font-mono text-sm sm:text-base font-semibold text-foreground break-words"
              data-testid="privacy-target-summary"
            >
              {report.targetSummary}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button asChild variant="default" size="sm" className="font-medium">
              <Link
                href={`/reports/${encodeURIComponent(report.scanId)}`}
                aria-label={`Open saved report ${report.scanId}`}
                data-testid="open-saved-report-button"
              >
                <span>Open saved report</span>
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Report ID: </span>
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">
              {report.scanId}
            </code>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <time dateTime={report.createdAt}>{formatTimestamp(report.createdAt)}</time>
          </div>
          <div>
            <span className="font-medium text-foreground">Rules engine: </span>
            <span className="font-mono text-foreground">{report.rulesVersion}</span>
          </div>
        </div>
      </div>

      {/* 2. Partial scan banner if applicable */}
      {report.status === "partial" && <PartialBanner />}

      {/* 3. Overall Risk Assessment Header (no numeric score for privacy) */}
      <section aria-label="Risk assessment">
        <AssessmentHeader assessment={report.assessment} module={report.module} />
      </section>

      {/* 4. Findings grouped by category */}
      <section aria-labelledby="privacy-findings-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="privacy-findings-heading" className="text-lg font-semibold text-foreground">
            Analysis findings
          </h2>
          <span className="text-xs text-muted-foreground">
            {report.findings.length} {report.findings.length === 1 ? "rule evaluated" : "rules evaluated"}
          </span>
        </div>
        <FindingGroup findings={report.findings} />
      </section>

      {/* 5. What was not checked (Limitations) */}
      <section aria-label="Analysis limitations">
        <LimitationsPanel limitations={report.limitations} />
      </section>

      {/* 6. Sanitized Analysis Details if available */}
      {report.details && Object.keys(report.details).length > 0 && (
        <section aria-label="Sanitized analysis details" className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Analysis Metrics
          </h3>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {report.details.profilesCount !== undefined && (
              <div>
                <dt className="text-muted-foreground">Profiles examined</dt>
                <dd className="font-semibold text-foreground text-sm">
                  {String(report.details.profilesCount)}
                </dd>
              </div>
            )}
            {report.details.textLength !== undefined && (
              <div>
                <dt className="text-muted-foreground">Characters analyzed</dt>
                <dd className="font-semibold text-foreground text-sm">
                  {Number(report.details.textLength).toLocaleString("en-US")}
                </dd>
              </div>
            )}
            {report.details.evaluatedRulesCount !== undefined && (
              <div>
                <dt className="text-muted-foreground">Checks performed</dt>
                <dd className="font-semibold text-foreground text-sm">
                  {String(report.details.evaluatedRulesCount)}
                </dd>
              </div>
            )}
            {report.details.hasDisplayName !== undefined && (
              <div>
                <dt className="text-muted-foreground">Display name hint</dt>
                <dd className="font-semibold text-foreground text-sm">
                  {report.details.hasDisplayName ? "Supplied" : "None"}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </div>
  );
}
