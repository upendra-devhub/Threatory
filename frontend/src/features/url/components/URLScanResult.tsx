import React from "react";
import Link from "next/link";
import { Report } from "@threatory/contracts";
import { AssessmentHeader } from "@/components/reports/AssessmentHeader";
import { FindingGroup } from "@/components/reports/FindingGroup";
import { LimitationsPanel } from "@/components/reports/LimitationsPanel";
import { PartialBanner } from "@/components/reports/PartialBanner";
import { URLDetailsCard } from "./URLDetailsCard";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, ShieldCheck } from "lucide-react";

export interface URLScanResultProps {
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

export function URLScanResult({ report }: URLScanResultProps) {
  return (
    <div className="space-y-6 pt-2" data-testid="url-scan-result">
      {/* Header bar with Saved Report Link and Scanned URL Summary */}
      <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Analyzed URL Target
            </span>
            {/* STRICT PLAIN TEXT RENDERING: Never wrapped in <a> or Link, always ordinary text */}
            <div
              className="break-all font-mono text-sm sm:text-base font-semibold text-foreground"
              data-testid="scanned-url-text"
            >
              {report.targetSummary}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button asChild variant="default" size="sm" className="font-medium">
              <Link
                href={`/reports/${encodeURIComponent(report.scanId)}`}
                aria-label={`Open saved report ${report.scanId}`}
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

      {/* Partial scan banner if applicable */}
      {report.status === "partial" && <PartialBanner />}

      {/* 5. Overall Risk Assessment Header */}
      <section aria-label="Risk assessment">
        <AssessmentHeader assessment={report.assessment} module={report.module} />
      </section>

      {/* 6. Technical URL details */}
      <section aria-label="Technical URL details">
        <URLDetailsCard details={report.details} />
      </section>

      {/* 7. Findings grouped by category */}
      <section aria-labelledby="findings-section-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="findings-section-heading" className="text-lg font-semibold text-foreground">
            Analysis findings
          </h2>
          <span className="text-xs text-muted-foreground">
            {report.findings.length} {report.findings.length === 1 ? "rule evaluated" : "rules evaluated"}
          </span>
        </div>
        <FindingGroup findings={report.findings} />
      </section>

      {/* 8. Limitations */}
      <section aria-label="Analysis limitations">
        <LimitationsPanel limitations={report.limitations} />
      </section>

      {/* 9. Secondary Open saved report action at the bottom */}
      <div className="flex justify-end pt-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/reports/${encodeURIComponent(report.scanId)}`}>
            <span>Open saved report ({report.scanId})</span>
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
