"use client";

import React from "react";
import { URLScanForm } from "./URLScanForm";
import { URLScanProgress } from "./URLScanProgress";
import { URLScanResult } from "./URLScanResult";
import { ErrorState } from "@/components/reports/ErrorState";
import { useUrlScan } from "../hooks/useUrlScan";
import { UrlScanRequest, Report } from "@threatory/contracts";
import { Eye } from "lucide-react";

export interface URLAnalyzerViewProps {
  onScanOverride?: (data: UrlScanRequest) => Promise<Report>;
  initialReport?: Report | null;
}

export function URLAnalyzerView({
  onScanOverride,
  initialReport = null,
}: URLAnalyzerViewProps) {
  const urlScan = useUrlScan();

  const handleScan = async (data: UrlScanRequest) => {
    try {
      if (onScanOverride) {
        await onScanOverride(data);
        return;
      }
      await urlScan.scan(data);
    } catch {
      // Error state captured in useUrlScan hook
    }
  };

  const currentReport = urlScan.report ?? initialReport;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            URL Analyzer
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Examine a URL for suspicious phishing-related patterns and understand the indicators behind its risk assessment.
          </p>
        </div>

        {/* Top-Right Badge: Analysed as text · never visited */}
        <div
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium self-start sm:self-auto shrink-0 shadow-2xs"
          style={{
            backgroundColor: "#eff6ff",
            borderColor: "#dbeafe",
            color: "#2563eb",
          }}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Analysed as text · never visited</span>
        </div>
      </div>

      {/* Main Analysis Form Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <URLScanForm
          onSubmit={handleScan}
          isLoading={urlScan.isPending}
          fieldError={urlScan.fieldError}
          initialValue={urlScan.lastSubmittedUrl}
        />
      </div>

      {/* Progress Indicator */}
      {urlScan.isPending && <URLScanProgress />}

      {/* General Error State */}
      {urlScan.generalError && !urlScan.isPending && (
        <ErrorState
          title="Analysis could not be completed"
          description={urlScan.generalError}
          onRetry={urlScan.lastSubmittedUrl ? urlScan.retry : undefined}
          isRetrying={urlScan.isPending}
          retryLabel="Retry analysis"
        />
      )}

      {/* Result Card */}
      {currentReport && !urlScan.isPending && (
        <URLScanResult report={currentReport} />
      )}
    </div>
  );
}
