"use client";

import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivacyScanForm } from "./PrivacyScanForm";
import { PrivacyScanProgress } from "./PrivacyScanProgress";
import { PrivacyResult } from "./PrivacyResult";
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
      <PageHeader
        title="Privacy Exposure Analyzer"
        description="Understand what personal information may be exposed through the usernames, profiles and text you choose to submit."
      />

      <Card>
        <CardHeader>
          <CardTitle as="h2">Submit profiles and text for privacy analysis</CardTitle>
          <CardDescription>
            Information provided is analyzed strictly as text to detect structural patterns, username reuse, and exposed identifiers. Threatory does not crawl social networks, fetch profile pages, or verify real-world identities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacyScanForm
            onSubmit={handleScan}
            isLoading={privacyScan.isPending}
            serverFieldErrors={privacyScan.serverFieldErrors}
            resetTrigger={overrideTrigger || privacyScan.resetTrigger}
          />
        </CardContent>
      </Card>

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
  );
}
