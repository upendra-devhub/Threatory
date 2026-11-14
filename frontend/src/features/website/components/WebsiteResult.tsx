import React from "react";
import Link from "next/link";
import { Report } from "@threatory/contracts";
import { AssessmentHeader } from "@/components/reports/AssessmentHeader";
import { FindingGroup } from "@/components/reports/FindingGroup";
import { LimitationsPanel } from "@/components/reports/LimitationsPanel";
import { PartialBanner } from "@/components/reports/PartialBanner";
import { CertificateCard, CertificateDetails } from "./CertificateCard";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Globe } from "lucide-react";

export interface WebsiteResultProps {
  report: Report;
}

const WEBSITE_CATEGORY_LABELS: Record<string, string> = {
  tls: "Connection and TLS",
  headers: "HTTP headers",
  cookies: "Cookies",
  dns: "DNS and email",
};

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toUTCString();
  } catch {
    return isoString;
  }
}

export function WebsiteResult({ report }: WebsiteResultProps) {
  // Extract unassessed checks for the partial banner
  const unassessedChecks = report.findings
    .filter((f) => f.outcome === "not_assessed")
    .map((f) => (f.title ? `${f.title} (${f.code})` : f.code));

  const certDetails = (report.details?.certificate as CertificateDetails | undefined) ?? null;

  return (
    <div className="space-y-6 pt-2" data-testid="website-scan-result">
      {/* 1. Header bar with Saved Report Link and Analyzed Website Target */}
      <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Audited Website Target
            </span>
            {/* STRICT PLAIN TEXT RENDERING: Never wrapped in <a> or Link, always ordinary text */}
            <div
              className="break-all font-mono text-sm sm:text-base font-semibold text-foreground"
              data-testid="scanned-website-text"
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

      {/* 2. Partial scan banner if applicable, naming unassessed checks */}
      {report.status === "partial" && (
        <PartialBanner unassessedChecks={unassessedChecks} />
      )}

      {/* 3. Overall Risk Assessment Header (NO numeric score for website auditor) */}
      <section aria-label="Risk assessment">
        <AssessmentHeader assessment={report.assessment} module={report.module} />
      </section>

      {/* 4. Certificate summary card */}
      <section aria-label="Certificate summary">
        <CertificateCard certificate={certDetails} />
      </section>

      {/* 5. Findings grouped into Connection and TLS, HTTP headers, Cookies, DNS and email */}
      <section aria-labelledby="website-findings-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="website-findings-heading" className="text-lg font-semibold text-foreground">
            Audit findings
          </h2>
          <span className="text-xs text-muted-foreground">
            {report.findings.length} {report.findings.length === 1 ? "check evaluated" : "checks evaluated"}
          </span>
        </div>
        <FindingGroup
          findings={report.findings}
          categoryLabels={WEBSITE_CATEGORY_LABELS}
        />
      </section>

      {/* 6. What was not checked (Limitations) */}
      <section aria-label="Audit limitations">
        <LimitationsPanel limitations={report.limitations} />
      </section>
    </div>
  );
}
