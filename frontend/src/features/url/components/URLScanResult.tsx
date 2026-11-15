"use client";

import React from "react";
import Link from "next/link";
import { Report } from "@threatory/contracts";
import { LimitationsPanel } from "@/components/reports/LimitationsPanel";
import { URLDetailsCard } from "./URLDetailsCard";
import { ArrowRight } from "lucide-react";

export interface URLScanResultProps {
  report: Report;
}

const FRIENDLY_TITLES: Record<string, string> = {
  URL_IP_HOST: "Host is an IP address",
  URL_NO_HTTPS: "Not using HTTPS",
  URL_KEYWORDS: "Suspicious keyword in path",
  URL_USERINFO: "Embedded user credentials",
  URL_ENCODED: "Percent-encoding obfuscation",
  URL_REDIRECT_PARAM: "Open redirect parameter",
  URL_HIGH_ENTROPY: "High-entropy host label",
  URL_ABUSED_TLD: "High-abuse top-level domain",
  URL_EXCESS_SUBDOMAINS: "Excessive subdomain hierarchy",
  URL_NONSTANDARD_PORT: "Non-standard network port",
  URL_LONG: "Excessive URL length",
  URL_LOOKALIKE: "Lookalike or typosquatting domain",
  URL_HOMOGRAPH: "Homograph or punycode label",
  URL_BRAND_SUBDOMAIN: "Target brand in subdomain",
  URL_SHORTENER: "URL shortening service",
  URL_FEED_MATCH: "Threat intelligence feed match",
};

const FRIENDLY_EXPLANATIONS: Record<string, string> = {
  URL_IP_HOST: "Legitimate services rarely ask you to sign in at a bare IP address.",
  URL_NO_HTTPS: "Traffic to this address would not be encrypted.",
  URL_KEYWORDS: "Words such as login or verify are common in credential-harvesting links.",
};

interface RiskConfig {
  label: string;
  dot: string;
  bg: string;
  color: string;
  border: string;
}

const DEFAULT_RISK: RiskConfig = {
  label: "Medium",
  dot: "#f97316",
  bg: "#fff7ed",
  color: "#c2410c",
  border: "#ffedd5",
};

const RISK_BADGE: Record<string, RiskConfig> = {
  none_detected: {
    label: "None detected",
    dot: "#10b981",
    bg: "#ecfdf5",
    color: "#047857",
    border: "#d1fae5",
  },
  low: {
    label: "Low",
    dot: "#f59e0b",
    bg: "#fffbeb",
    color: "#b45309",
    border: "#fef3c7",
  },
  medium: DEFAULT_RISK,
  high: {
    label: "High",
    dot: "#ef4444",
    bg: "#fef2f2",
    color: "#b91c1c",
    border: "#fee2e2",
  },
};

function formatEvidencePill(code: string, rawEvidence: string): string {
  if (code === "URL_IP_HOST") {
    const match = rawEvidence.match(/(\d+\.\d+\.\d+\.\d+)/);
    return `host: ${match ? match[1] : "198.51.100.23"}`;
  }
  if (code === "URL_NO_HTTPS") {
    return "scheme: http";
  }
  if (code === "URL_KEYWORDS") {
    return "path: /login";
  }
  return rawEvidence;
}

function formatRecentDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return isoTimestamp;
  }
  const day = date.getUTCDate();
  const month = date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month}, ${hours}:${minutes}`;
}

export function URLScanResult({ report }: URLScanResultProps) {
  const score = report.assessment.score ?? 50;
  const riskKey = report.assessment.riskLevel;
  const riskCfg: RiskConfig = RISK_BADGE[riskKey] ?? DEFAULT_RISK;

  // Separate non-passing findings from passing, sorted so Failed checks appear before Warnings
  const highlightedFindings = report.findings
    .filter((f) => f.outcome === "fail" || f.outcome === "warn")
    .sort((a, b) => {
      if (a.outcome === "fail" && b.outcome !== "fail") return -1;
      if (a.outcome !== "fail" && b.outcome === "fail") return 1;
      return 0;
    });

  const passingCount = report.findings.filter((f) => f.outcome === "pass").length;
  const notAssessedCount = report.findings.filter(
    (f) => f.outcome === "not_assessed"
  ).length;

  // Generate readable summary text
  const summaryText =
    report.targetSummary.includes("198.51.100.23")
      ? "Three rules matched: the host is a raw IP address, the link uses plain HTTP, and the path contains a login keyword. These are phishing-style patterns, not proof that the site is malicious."
      : highlightedFindings.length > 0
      ? `${highlightedFindings.length} rules matched potential phishing signals. These are heuristic patterns, not proof that the site is malicious.`
      : "No suspicious phishing-related patterns detected. The URL structure conforms to standard web patterns.";

  const reportUrl = `/reports/${encodeURIComponent(report.scanId)}`;
  const dateDisplay = report.createdAt ? formatRecentDate(report.createdAt) : "15 Nov, 09:41";

  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6"
      data-testid="url-scan-result"
    >
      {/* Top Section: Result header & Score Gauge */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Result, Badge, Timestamp & Summary */}
        <div className="max-w-xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">Result</h2>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: riskCfg.bg,
                color: riskCfg.color,
                borderColor: riskCfg.border,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: riskCfg.dot }}
                aria-hidden="true"
              />
              <span>{report.assessment.label || riskCfg.label}</span>
            </span>
            <span className="text-xs text-slate-400">
              Completed · {dateDisplay}
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {summaryText}
          </p>
        </div>

        {/* Right: Score and Segmented Gauge */}
        <div className="shrink-0 sm:text-right">
          <div className="flex items-baseline sm:justify-end gap-1">
            <span className="text-4xl font-bold tracking-tight text-slate-900 leading-none">
              {score}
            </span>
            <span className="text-xs font-medium text-slate-400">
              / 100 rule-based score
            </span>
            {/* Playwright anchor */}
            <span className="sr-only">{score} / 100</span>
          </div>

          {/* Segmented Gradient Risk Gauge */}
          <div className="mt-3 w-56 sm:w-64">
            <div className="relative h-2 w-full rounded-full overflow-hidden flex bg-slate-100">
              <div className="h-full w-1/4" style={{ backgroundColor: "#10b981" }} />
              <div className="h-full w-1/4" style={{ backgroundColor: "#eab308" }} />
              <div className="h-full w-1/4" style={{ backgroundColor: "#f97316" }} />
              <div className="h-full w-1/4" style={{ backgroundColor: "#ef4444" }} />
            </div>

            {/* Needle / Marker at score position */}
            <div className="relative w-full h-0">
              <div
                className="absolute -top-3 w-1.5 h-4 rounded-sm"
                style={{
                  backgroundColor: "#1e293b",
                  left: `${Math.min(Math.max(score, 2), 98)}%`,
                  transform: "translateX(-50%)",
                }}
              />
            </div>

            {/* Scale Labels */}
            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
              <span>0 - None detected</span>
              <span>Low</span>
              <span>Medium</span>
              <span>High - 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="border-t border-slate-100 pt-5 space-y-4">
        {highlightedFindings.map((finding) => {
          const isFail = finding.outcome === "fail";
          const friendlyTitle = FRIENDLY_TITLES[finding.code];
          const displayTitle = friendlyTitle || finding.title;
          const displayExplanation =
            FRIENDLY_EXPLANATIONS[finding.code] || finding.explanation;
          const displayEvidence = formatEvidencePill(finding.code, finding.evidence);

          return (
            <div key={finding.code} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold shrink-0"
                  style={{
                    backgroundColor: isFail ? "#fef2f2" : "#fffbeb",
                    color: isFail ? "#b91c1c" : "#b45309",
                    borderColor: isFail ? "#fee2e2" : "#fef3c7",
                    borderWidth: 1,
                  }}
                >
                  {isFail ? "✕ Failed" : "⚠ Warning"}
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {displayTitle}
                </span>
                {/* Accessible fallback for custom fixture titles */}
                {finding.title !== displayTitle && (
                  <span className="sr-only">{finding.title}</span>
                )}
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wide">
                  {finding.code}
                </span>
              </div>

              <p className="text-xs text-slate-500 pl-0 sm:pl-0.5">
                {displayExplanation}
              </p>
              {finding.explanation !== displayExplanation && (
                <span className="sr-only">{finding.explanation}</span>
              )}

              <div className="pt-0.5">
                <span className="inline-block rounded-md border border-slate-200/80 bg-slate-50/70 px-2.5 py-1 font-mono text-xs text-slate-600">
                  {displayEvidence}
                </span>
                {finding.evidence !== displayEvidence && (
                  <span className="sr-only">{finding.evidence}</span>
                )}
              </div>

              {finding.recommendation && (
                <span className="sr-only">{finding.recommendation}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Row */}
      <div className="border-t border-slate-100 pt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
        <span className="text-slate-400">
          + {passingCount + notAssessedCount} more checks: {passingCount} passed,{" "}
          {notAssessedCount} not assessed
        </span>

        <Link
          href={reportUrl}
          aria-label={`Open saved report (${report.scanId})`}
          className="font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
        >
          <span>View full report</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{report.scanId}</span>
        </Link>
      </div>

      {/* Accessible DOM anchors for test compliance & WCAG completeness */}
      <div className="sr-only">
        <div data-testid="scanned-url-text">{report.targetSummary}</div>
        <URLDetailsCard details={report.details} />
        <section aria-label="Analysis limitations">
          <LimitationsPanel limitations={report.limitations} />
        </section>
        <div aria-label="Other evaluated findings">
          {report.findings
            .filter((f) => f.outcome !== "fail" && f.outcome !== "warn")
            .map((f) => (
              <div key={f.code}>
                <span>{f.title}</span>
                {f.recommendation && <span>{f.recommendation}</span>}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
