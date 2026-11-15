"use client";

import React from "react";
import { PrivacyScanForm } from "./PrivacyScanForm";
import { PrivacyScanProgress } from "./PrivacyScanProgress";
import { PrivacyResult } from "./PrivacyResult";
import { PrivacyScopeNotice } from "./PrivacyScopeNotice";
import { ErrorState } from "@/components/reports/ErrorState";
import { usePrivacyScan } from "../hooks/usePrivacyScan";
import { PrivacyScanRequest, Report } from "@threatory/contracts";

export interface PrivacyAnalyzerViewProps {
  onScanOverride?: (data: PrivacyScanRequest) => Promise<Report | void>;
  initialReport?: Report | null;
}

export function PrivacyAnalyzerView({
  onScanOverride,
  initialReport = null,
}: PrivacyAnalyzerViewProps) {
  const privacyScan = usePrivacyScan();
  const [overrideReport, setOverrideReport] = React.useState<Report | null>(null);
  const [overrideError, setOverrideError] = React.useState<string | null>(null);
  const [overrideTrigger, setOverrideTrigger] = React.useState(0);

  const handleScan = async (data: PrivacyScanRequest) => {
    if (onScanOverride) {
      try {
        setOverrideError(null);
        const res = await onScanOverride(data);
        if (res) {
          setOverrideReport(res);
          setOverrideTrigger((c) => c + 1);
        }
      } catch (err: unknown) {
        setOverrideError(
          err instanceof Error ? err.message : "Analysis could not be completed"
        );
        throw err;
      }
      return;
    }
    await privacyScan.scan(data);
  };

  const currentReport = overrideReport ?? privacyScan.report ?? initialReport;
  const currentGeneralError = overrideError ?? privacyScan.generalError;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Privacy Analyzer
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
          See what your own public details could reveal when taken together. You supply the information, and Threatory only analyses what you submit.
        </p>
      </div>

      {/* Two Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Card + Analysis Progress / Error / Result */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <PrivacyScanForm
              onSubmit={handleScan}
              isLoading={privacyScan.isPending}
              serverFieldErrors={privacyScan.serverFieldErrors}
              resetTrigger={overrideTrigger || privacyScan.resetTrigger}
            />
          </div>

          {/* Progress state during active scan */}
          {privacyScan.isPending && <PrivacyScanProgress />}

          {/* General error state (rate limit, server error, timeout, network error) */}
          {currentGeneralError && !privacyScan.isPending && (
            <ErrorState
              title="Analysis could not be completed"
              description={currentGeneralError}
              onRetry={privacyScan.lastSubmittedRequest ? privacyScan.retry : undefined}
              isRetrying={privacyScan.isPending}
              retryLabel="Retry analysis"
            />
          )}

          {/* Successful report result */}
          {currentReport && !privacyScan.isPending && (
            <PrivacyResult report={currentReport} />
          )}
        </div>

        {/* Right Column: Information Cards */}
        <div className="lg:col-span-4">
          <PrivacyScopeNotice />
        </div>
      </div>
    </div>
  );
}
