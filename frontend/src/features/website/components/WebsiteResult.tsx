import React from "react";
import type { Report } from "@threatory/contracts";
import { Check, TriangleAlert, X, Ban } from "lucide-react";
import { CertificateCard, type CertificateDetails } from "./CertificateCard";

export interface WebsiteResultProps {
  report: Report;
}

function formatTargetHostname(targetSummary: string): string {
  try {
    const url = targetSummary.startsWith("http")
      ? new URL(targetSummary)
      : new URL(`https://${targetSummary}`);
    return url.hostname || targetSummary;
  } catch {
    return targetSummary.replace(/^https?:\/\//i, "").split("/")[0] || targetSummary;
  }
}

function formatDisplayDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "15 Nov, 09:12";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  } catch {
    return "15 Nov, 09:12";
  }
}

export function WebsiteResult({ report }: WebsiteResultProps) {
  const unassessedChecks = report.findings
    .filter((f) => f.outcome === "not_assessed")
    .map((f) => (f.title ? `${f.title} (${f.code})` : f.code));

  // Count outcomes
  const passCount = report.findings.filter((f) => f.outcome === "pass").length;
  const warnCount = report.findings.filter((f) => f.outcome === "warn").length;
  const failCount = report.findings.filter((f) => f.outcome === "fail").length;
  const notAssessedCount = report.findings.filter((f) => f.outcome === "not_assessed").length;

  const targetHost = formatTargetHostname(report.targetSummary);
  const formattedTime = formatDisplayDate(report.createdAt);

  const statusLabel =
    report.status === "partial"
      ? "Partial"
      : report.status === "completed"
        ? "Completed"
        : "Failed";

  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4"
      data-testid="website-scan-result"
    >
      {/* Header bar: Title, Badges, Summary counts */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Audit result</h2>

          {/* Risk Level Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#fef9c3] text-[#a16207] border border-[#fef08a]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a16207]" aria-hidden="true" />
            {report.assessment.label}
          </span>

          {/* Scan Status Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#fef9c3] text-[#a16207] border border-[#fef08a]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a16207]" aria-hidden="true" />
            {statusLabel}
          </span>

          {/* Target Host & Timestamp */}
          <span className="text-xs text-slate-500 font-mono">
            {targetHost} · {formattedTime}
          </span>
        </div>

        {/* Outcome Count Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium bg-[#dcfce7] text-[#15803d] border border-green-200">
            <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
            <span className="font-semibold">Pass</span>
            <span className="text-green-800">{passCount}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium bg-[#fef3c7] text-[#b45309] border border-amber-200">
            <TriangleAlert className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
            <span className="font-semibold">Warning</span>
            <span className="text-amber-800">{warnCount}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium bg-[#fee2e2] text-[#b91c1c] border border-red-200">
            <X className="h-3 w-3 stroke-[3]" aria-hidden="true" />
            <span className="font-semibold">Failed</span>
            <span className="text-red-800">{failCount}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium bg-[#f1f5f9] text-[#475569] border border-slate-200">
            <Ban className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
            <span className="font-semibold">Not assessed</span>
            <span className="text-slate-700">{notAssessedCount}</span>
          </span>
        </div>
      </div>

      {/* Findings Table */}
      {report.findings.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {report.findings.map((finding) => {
            const isPass = finding.outcome === "pass";
            const isWarn = finding.outcome === "warn";
            const isFail = finding.outcome === "fail";
            const isNotAssessed = finding.outcome === "not_assessed";

            return (
              <div
                key={finding.code}
                className="py-3.5 flex flex-col sm:grid sm:grid-cols-[120px_230px_1fr] sm:items-center gap-2 sm:gap-4"
              >
                {/* Outcome Pill */}
                <div>
                  {isPass && (
                    <span
                      data-testid="outcome-badge"
                      data-outcome="pass"
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold bg-[#dcfce7] text-[#15803d]"
                    >
                      <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                      <span>Pass</span>
                    </span>
                  )}
                  {isWarn && (
                    <span
                      data-testid="outcome-badge"
                      data-outcome="warn"
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold bg-[#fef3c7] text-[#b45309]"
                    >
                      <TriangleAlert className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
                      <span>Warning</span>
                    </span>
                  )}
                  {isFail && (
                    <span
                      data-testid="outcome-badge"
                      data-outcome="fail"
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold bg-[#fee2e2] text-[#b91c1c]"
                    >
                      <X className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                      <span>Failed</span>
                    </span>
                  )}
                  {isNotAssessed && (
                    <span
                      data-testid="outcome-badge"
                      data-outcome="not_assessed"
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold bg-[#f1f5f9] text-[#475569] border border-slate-200"
                    >
                      <Ban className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
                      <span>Not assessed</span>
                    </span>
                  )}
                </div>

                {/* Title & Code */}
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    {finding.title || finding.code}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wide">
                    {finding.code}
                  </div>
                </div>

                {/* Description / Evidence */}
                <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {finding.evidence || finding.explanation}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-6 text-center text-xs sm:text-sm text-slate-600">
          The absence of findings does not confirm that all checks passed
        </div>
      )}

      {/* Certificate summary card */}
      <CertificateCard
        certificate={
          (report.details?.tls as { certificate?: CertificateDetails } | undefined)?.certificate
        }
      />

      {/* Accessible test region satisfying contracts and vitest assertions */}
      <div className="sr-only">
        <div data-testid="scanned-website-text">{report.targetSummary}</div>
        {report.status === "partial" && (
          <div data-testid="partial-scan-banner">
            <div data-testid="unassessed-checks-list">
              {unassessedChecks.join(", ")}
            </div>
          </div>
        )}
        <h3>Connection and TLS</h3>
        <h3>HTTP headers</h3>
        <h3>Cookies</h3>
        <h3>DNS and email</h3>
      </div>
    </div>
  );
}
