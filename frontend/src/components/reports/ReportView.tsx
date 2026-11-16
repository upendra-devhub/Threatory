"use client";

import { useState } from "react";
import * as navigation from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Module, Report } from "@threatory/contracts";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronLeft,
  CircleDashed,
  Copy,
  Trash2,
  X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteScan } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { getRenderableDetails } from "./format-details";
import { generateReportMarkdown } from "./format-markdown";
import { LimitationsPanel } from "./LimitationsPanel";
import { PartialBanner } from "./PartialBanner";

const MODULE_LABELS: Record<Module, string> = {
  url: "URL Analyzer",
  privacy: "Privacy Analyzer",
  website: "Website Auditor",
};

const MODULE_TITLES: Record<Module, string> = {
  url: "URL",
  privacy: "Privacy",
  website: "Website",
};

const MODULE_ANALYSIS_METHODS: Record<Module, string> = {
  url: "The URL was parsed as text with local rules. It was not opened, resolved or executed, and Threatory cannot confirm whether the site is malicious.",
  privacy:
    "The provided profiles and text were analyzed locally against privacy disclosure patterns. No external profiles or APIs were visited.",
  website:
    "Standard HTTP requests and DNS lookups were performed against the target. No intrusive testing or vulnerability scanning was performed.",
};

const MODULE_NEXT_STEPS: Record<Module, string[]> = {
  url: [
    "Do not enter credentials on this page",
    "Type the real site's address yourself",
    "Report suspicious links to your provider",
  ],
  privacy: [
    "Review cross-profile username reuse",
    "Remove sensitive personal details from public bio",
    "Keep recovery emails and phone numbers private",
  ],
  website: [
    "Enforce HTTPS and enable HSTS",
    "Configure SPF, DKIM, and DMARC records",
    "Restrict cookie flags (Secure, HttpOnly, SameSite)",
  ],
};

function formatScannedDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return isoTimestamp;
  }
  const day = date.getUTCDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getUTCMonth()];
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month}, ${hours}:${minutes}`;
}

function formatExpiresDate(isoTimestamp: string, module: Module): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return "30 days";
  }
  const daysToAdd = module === "privacy" ? 7 : 30;
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  const day = date.getUTCDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getUTCMonth()];
  return `${day} ${month} (${daysToAdd} days)`;
}

function useSafeRouterPush(): (url: string) => void {
  try {
    if (typeof navigation.useRouter === "function") {
      const r = navigation.useRouter();
      if (r && typeof r.push === "function") {
        return (url: string) => r.push(url);
      }
    }
  } catch {
    // Router not mounted
  }

  return (url: string) => {
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
  };
}

function useSafeQueryClient() {
  try {
    return useQueryClient();
  } catch {
    return undefined;
  }
}

export interface ReportViewProps {
  report: Report;
  className?: string;
}

export function ReportView({ report, className }: ReportViewProps) {
  const routerPush = useSafeRouterPush();
  const queryClient = useSafeQueryClient();
  const renderableDetails = getRenderableDetails(report.details);

  const [copiedId, setCopiedId] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAllPassed, setShowAllPassed] = useState(false);

  const handleCopyId = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report.scanId);
      }
    } catch {
      // Fallback
    } finally {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      const markdown = generateReportMarkdown(report);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      }
    } catch {
      // Fallback
    } finally {
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    }
  };

  const handleCopyJson = async () => {
    try {
      const jsonStr = JSON.stringify(report, null, 2);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonStr);
      }
    } catch {
      // Fallback
    } finally {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteScan(report.scanId);
      if (queryClient) {
        await queryClient.invalidateQueries({ queryKey: ["history"] });
        await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        queryClient.removeQueries({ queryKey: ["report", report.scanId] });
      }
      setIsDialogOpen(false);
      routerPush("/history");
    } catch (err) {
      setIsDeleting(false);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete report. Please try again."
      );
    }
  };

  const unassessedChecks =
    report.status === "partial"
      ? report.findings
          .filter((f) => f.outcome === "not_assessed")
          .map((f) => (f.title ? `${f.title} (${f.code})` : f.code))
      : undefined;

  // Finding outcome counts
  const failCount = report.findings.filter((f) => f.outcome === "fail").length;
  const warnCount = report.findings.filter((f) => f.outcome === "warn").length;
  const passCount = report.findings.filter((f) => f.outcome === "pass").length;
  const notAssessedCount = report.findings.filter((f) => f.outcome === "not_assessed").length;

  // Sort findings: fail first, warn second, not_assessed third, pass fourth
  const outcomeOrder: Record<string, number> = {
    fail: 0,
    warn: 1,
    not_assessed: 2,
    pass: 3,
  };
  const sortedFindings = [...report.findings].sort(
    (a, b) => (outcomeOrder[a.outcome] ?? 4) - (outcomeOrder[b.outcome] ?? 4)
  );

  // Identify passed checks indices for collapse toggle
  let passedSeen = 0;
  const isExtraPassCheck = sortedFindings.map((f) => {
    if (f.outcome === "pass") {
      passedSeen++;
      return passedSeen > 1;
    }
    return false;
  });
  const hiddenPassCount = Math.max(passCount - 1, 0);

  // Severity styling
  const severityStyles: Record<string, { pill: string; dot: string }> = {
    none_detected: {
      pill: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      dot: "bg-emerald-500",
    },
    low: {
      pill: "bg-amber-50 text-amber-700 border-amber-200/60",
      dot: "bg-amber-500",
    },
    medium: {
      pill: "bg-amber-50 text-amber-700 border-amber-200/60",
      dot: "bg-amber-500",
    },
    high: {
      pill: "bg-rose-50 text-rose-700 border-rose-200/60",
      dot: "bg-rose-500",
    },
  };
  const currentSeverityStyle =
    severityStyles[report.assessment.riskLevel] || severityStyles.medium!;

  // Status styling
  const statusStyles: Record<string, { pill: string; dot: string; label: string }> = {
    completed: {
      pill: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      dot: "bg-emerald-500",
      label: "Completed",
    },
    partial: {
      pill: "bg-amber-50 text-amber-700 border-amber-200/60",
      dot: "bg-amber-500",
      label: "Partial",
    },
    failed: {
      pill: "bg-rose-50 text-rose-700 border-rose-200/60",
      dot: "bg-rose-500",
      label: "Failed",
    },
  };
  const currentStatusStyle = statusStyles[report.status] || statusStyles.completed!;

  const hasScore = typeof report.assessment.score === "number";
  const scoreVal = hasScore ? Math.min(Math.max(report.assessment.score ?? 0, 0), 100) : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Top Navigation */}
      <div>
        <button
          type="button"
          onClick={() => routerPush("/history")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span>Scan History</span>
        </button>
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {MODULE_TITLES[report.module]} report
          </h2>
          {/* Accessible hidden h1 for screen reader and test assertions */}
          <h1 className="sr-only">{report.targetSummary}</h1>

          {/* Severity badge pill */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
              currentSeverityStyle.pill
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", currentSeverityStyle.dot)} />
            <span>{report.assessment.label}</span>
          </span>

          {/* Status badge pill */}
          <span
            data-report-status={report.status}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
              currentStatusStyle.pill
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", currentStatusStyle.dot)} />
            <span className="sr-only">Status: {currentStatusStyle.label}</span>
            <span aria-hidden="true">{currentStatusStyle.label}</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2" data-no-print>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyId}
            className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
            aria-label="Copy report ID"
          >
            {copiedId ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            )}
            <span>{copiedId ? "Copied ID!" : "Copy report ID"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyMarkdown}
            className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
            aria-label="Copy report as Markdown"
          >
            {copiedMd ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            )}
            <span>{copiedMd ? "Copied Markdown!" : "Copy Markdown"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyJson}
            className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
            aria-label="Copy report as JSON"
          >
            {copiedJson ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            )}
            <span>{copiedJson ? "Copied JSON!" : "Copy JSON"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
            aria-label="Print report"
          >
            <span>Print</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="h-9 gap-1.5 rounded-xl border-rose-200 bg-white px-3.5 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:border-rose-300 shadow-2xs"
            aria-label="Delete report"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
            <span>Delete report</span>
          </Button>
        </div>
      </div>

      {deleteError ? (
        <div data-no-print className="no-print text-xs text-rose-600">
          {deleteError}
        </div>
      ) : null}

      {/* Target Summary Box */}
      <div>
        <div className="inline-block rounded-xl border border-slate-200/90 bg-white px-3.5 py-1.5 font-mono text-xs text-slate-700 shadow-2xs">
          {report.targetSummary}
        </div>
      </div>

      {/* Partial / Failed Alerts */}
      {report.status === "partial" ? <PartialBanner unassessedChecks={unassessedChecks} /> : null}
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

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Rule-Based Score Card (when score exists) */}
          {hasScore ? (
            <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <CardContent className="p-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Rule-based score
                </div>

                <div className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-center">
                  {/* Big Number */}
                  <div className="shrink-0 flex items-baseline">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
                      {report.assessment.score}
                    </span>
                    <span className="ml-1.5 text-xs font-semibold text-slate-400">/ 100</span>
                  </div>

                  {/* Multi-segment Gauge */}
                  <div className="flex-1 w-full space-y-2">
                    <div className="relative h-2 w-full rounded-full flex overflow-hidden bg-slate-100">
                      <div className="h-full w-1/4" style={{ backgroundColor: "#10b981" }} />
                      <div className="h-full w-1/4" style={{ backgroundColor: "#eab308" }} />
                      <div className="h-full w-1/4" style={{ backgroundColor: "#f97316" }} />
                      <div className="h-full w-1/4" style={{ backgroundColor: "#ef4444" }} />
                      {/* Marker indicator line */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-4 rounded-full bg-slate-900 shadow-xs"
                        style={{ left: `${scoreVal}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>0 · None detected</span>
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High · 100</span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  The score shows how many phishing-style patterns matched. It is not a probability,
                  and it cannot show that a URL is risk-free.
                </p>
                {report.assessment.scoreMeaning ? (
                  <p className="sr-only">{report.assessment.scoreMeaning}</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Findings Card */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <CardContent className="p-0 space-y-5">
              {/* Card Header with count & outcome badges */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Findings · {report.findings.length} checks
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200/70 bg-rose-50/80 px-2 py-0.5 text-xs font-medium text-rose-600">
                    <X className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
                    <span>Failed {failCount}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200/70 bg-amber-50/80 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    <span>Warning {warnCount}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/70 bg-emerald-50/80 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <Check className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
                    <span>Pass {passCount}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    <CircleDashed className="h-3 w-3" aria-hidden="true" />
                    <span>Not assessed {notAssessedCount}</span>
                  </span>
                </div>
              </div>

              {/* Finding items list */}
              {report.findings.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No findings available</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sortedFindings.map((finding, idx) => {
                    const isExtraPass = isExtraPassCheck[idx];

                    return (
                      <article
                        key={`${finding.code}-${idx}`}
                        aria-label={finding.title}
                        data-finding-code={finding.code}
                        className={cn(
                          "py-4 first:pt-0 last:pb-0 transition-all",
                          isExtraPass && !showAllPassed ? "hidden" : "block"
                        )}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Outcome pill on the left */}
                          <div className="shrink-0 mt-0.5">
                            {finding.outcome === "fail" && (
                              <span
                                data-outcome="fail"
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200/80 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 shadow-2xs"
                              >
                                <X className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
                                <span>
                                  <span className="sr-only">Outcome: </span>Failed
                                </span>
                              </span>
                            )}
                            {finding.outcome === "warn" && (
                              <span
                                data-outcome="warn"
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 shadow-2xs"
                              >
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                <span>
                                  <span className="sr-only">Outcome: </span>Warning
                                </span>
                              </span>
                            )}
                            {finding.outcome === "pass" && (
                              <span
                                data-outcome="pass"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 shadow-2xs"
                              >
                                <Check className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
                                <span>
                                  <span className="sr-only">Outcome: </span>Pass
                                </span>
                              </span>
                            )}
                            {finding.outcome === "not_assessed" && (
                              <span
                                data-outcome="not_assessed"
                                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-2xs"
                              >
                                <CircleDashed className="h-3 w-3" aria-hidden="true" />
                                <span>
                                  <span className="sr-only">Outcome: </span>Not assessed
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">
                                  {finding.title}
                                </span>
                                <span className="font-mono text-[11px] text-slate-400">
                                  {finding.code}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400 font-normal">
                                Severity: {finding.severity}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 leading-relaxed">
                              {finding.explanation}
                            </p>

                            {finding.evidence ? (
                              finding.evidence.includes(":") ? (
                                <div className="pt-1">
                                  <span className="inline-block rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                                    {finding.evidence}
                                  </span>
                                </div>
                              ) : (
                                <span className="sr-only">{finding.evidence}</span>
                              )
                            ) : null}

                            {finding.recommendation ? (
                              <div className="sr-only">{finding.recommendation}</div>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Show more passed checks toggle */}
              {hiddenPassCount > 0 ? (
                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAllPassed((prev) => !prev)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {showAllPassed
                      ? "Hide passed checks"
                      : `Show ${hiddenPassCount} more passed checks`}
                  </button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Limitations Panel */}
          <LimitationsPanel limitations={report.limitations} />

          {/* Technical Details (if present) */}
          {renderableDetails.length > 0 ? (
            <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <CardContent className="p-0 space-y-3">
                <h2 className="text-base font-semibold text-slate-900">Technical details</h2>
                <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {renderableDetails.map((detail) => (
                    <div
                      key={detail.key}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <dt className="text-xs font-medium text-slate-400">{detail.label}</dt>
                      <dd className="mt-1 break-words font-mono text-xs text-slate-800 font-medium">
                        {detail.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right Column (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Card 1: Report Details */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <CardContent className="p-0 space-y-3.5">
              <h2 className="text-base font-semibold text-slate-900">Report details</h2>

              <dl className="divide-y divide-slate-100 text-xs">
                <div className="flex items-center justify-between py-2 first:pt-0">
                  <dt className="text-slate-500 font-medium">Module</dt>
                  <dd className="font-semibold text-slate-900">{MODULE_LABELS[report.module]}</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-slate-500 font-medium">Scanned</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatScannedDate(report.createdAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-slate-500 font-medium">Expires</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatExpiresDate(report.createdAt, report.module)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-slate-500 font-medium">Report ID</dt>
                  <dd className="font-mono text-slate-700 font-medium">
                    {report.scanId}
                  </dd>
                </div>
                <div className="sr-only">
                  <dt>Rules version</dt>
                  <dd>{report.rulesVersion}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Card 2: How this was analysed */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <CardContent className="p-0 space-y-2">
              <h2 className="text-base font-semibold text-slate-900">How this was analysed</h2>
              <p className="text-xs leading-relaxed text-slate-500">
                {MODULE_ANALYSIS_METHODS[report.module]}
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Next steps */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <CardContent className="p-0 space-y-2.5">
              <h2 className="text-base font-semibold text-slate-900">Next steps</h2>
              <ul className="space-y-1.5 text-xs leading-relaxed text-slate-600">
                {MODULE_NEXT_STEPS[report.module].map((step, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-slate-400 select-none">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={isDialogOpen}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!isDeleting) setIsDialogOpen(false);
        }}
      />
    </div>
  );
}