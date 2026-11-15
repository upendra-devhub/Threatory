"use client";

import React from "react";
import { WebsiteScanForm } from "./WebsiteScanForm";
import { WebsiteScopeNotice } from "./WebsiteScopeNotice";
import { WebsiteScanProgress } from "./WebsiteScanProgress";
import { WebsiteResult } from "./WebsiteResult";
import { ErrorState } from "@/components/reports/ErrorState";
import { useWebsiteScan } from "../hooks/useWebsiteScan";
import { WebsiteScanRequest, Report } from "@threatory/contracts";

export const DEFAULT_WEBSITE_DEMO_REPORT: Report = {
  scanId: "scan-site-demo-001",
  module: "website",
  status: "partial",
  rulesVersion: "website-1.0.0",
  targetSummary: "https://example.com",
  assessment: {
    label: "Low",
    riskLevel: "low",
  },
  findings: [
    {
      code: "SITE_TLS_VERSION",
      category: "tls",
      title: "TLS version",
      outcome: "pass",
      severity: "info",
      evidence: "TLS 1.3 negotiated.",
      explanation: "TLS 1.3 negotiated.",
    },
    {
      code: "SITE_TLS_CERT_VALID",
      category: "tls",
      title: "Certificate validity",
      outcome: "pass",
      severity: "info",
      evidence: "Certificate is valid and expires in 74 days.",
      explanation: "Certificate is valid and expires in 74 days.",
    },
    {
      code: "SITE_HTTPS_REDIRECT",
      category: "tls",
      title: "HTTP redirects to HTTPS",
      outcome: "pass",
      severity: "info",
      evidence: "http:// requests redirect to https:// in one hop.",
      explanation: "http:// requests redirect to https:// in one hop.",
    },
    {
      code: "SITE_HSTS",
      category: "headers",
      title: "HSTS header",
      outcome: "warn",
      severity: "low",
      evidence: "Strict-Transport-Security header was not returned.",
      explanation: "Strict-Transport-Security header was not returned.",
    },
    {
      code: "SITE_DMARC",
      category: "dns",
      title: "DMARC policy",
      outcome: "warn",
      severity: "low",
      evidence: "Record found, but policy is p=none (monitoring only).",
      explanation: "Record found, but policy is p=none (monitoring only).",
    },
    {
      code: "SITE_CAA",
      category: "dns",
      title: "CAA records",
      outcome: "not_assessed",
      severity: "info",
      evidence: "DNS lookup timed out within the scan budget, so this check was not assessed.",
      explanation: "DNS lookup timed out within the scan budget, so this check was not assessed.",
    },
  ],
  limitations: [
    "Audits public HTTP headers, TLS handshake, and public DNS records only",
  ],
  details: {
    finalUrl: "https://example.com/",
  },
  createdAt: "2026-11-15T09:12:00.000Z",
};

export interface WebsiteAuditorViewProps {
  onScanOverride?: (data: WebsiteScanRequest) => Promise<Report>;
  initialReport?: Report | null;
  initialUrl?: string;
  initialAuthorised?: boolean;
}

export function WebsiteAuditorView({
  onScanOverride,
  initialReport = null,
  initialUrl = "",
  initialAuthorised = false,
}: WebsiteAuditorViewProps) {
  const websiteScan = useWebsiteScan();

  const handleScan = async (data: WebsiteScanRequest) => {
    try {
      if (onScanOverride) {
        await onScanOverride(data);
        return;
      }
      await websiteScan.scan(data);
    } catch {
      // Error state is captured and displayed via useWebsiteScan
    }
  };

  const currentReport = websiteScan.report ?? initialReport;

  return (
    <div className="space-y-6" data-testid="website-auditor-view">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Website Auditor
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
          Check whether a site you control is configured safely: encryption, redirects, headers and email-authentication records.
        </p>
      </div>

      {/* 2-Column Responsive Layout: Form on Left (8 cols), Info on Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Card */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <WebsiteScanForm
            onSubmit={handleScan}
            isLoading={websiteScan.isPending}
            fieldError={websiteScan.fieldError}
            initialUrl={websiteScan.lastSubmittedRequest?.url ?? initialUrl}
            initialAuthorised={
              websiteScan.lastSubmittedRequest?.authorised ?? initialAuthorised
            }
          />
        </div>

        {/* Right Column: What is checked info card */}
        <div className="lg:col-span-4">
          <WebsiteScopeNotice />
        </div>
      </div>

      {/* Progress state during active audit (up to 25 seconds) */}
      {websiteScan.isPending && <WebsiteScanProgress />}

      {/* General error state (SSRF TARGET_BLOCKED, rate limit, server error, timeout, network error) */}
      {websiteScan.generalError && !websiteScan.isPending && (
        <ErrorState
          title="Website audit could not be completed"
          description={websiteScan.generalError}
          onRetry={websiteScan.lastSubmittedRequest ? websiteScan.retry : undefined}
          isRetrying={websiteScan.isPending}
          retryLabel="Retry audit"
        />
      )}

      {/* Audit Result Card */}
      {currentReport && !websiteScan.isPending && !websiteScan.generalError && (
        <WebsiteResult report={currentReport} />
      )}
    </div>
  );
}
