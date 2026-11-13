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

  const handleScan = async (data: PrivacyScanRequest) => {
    try {
      if (onScanOverride) {
        await onScanOverride(data);
        return;
      }
      await privacyScan.scan(data);
    } catch {
      // Error state captured in usePrivacyScan
    }
  };

  const currentReport = privacyScan.report ?? initialReport;

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
            resetTrigger={privacyScan.resetTrigger}
          />
        </CardContent>
      </Card>

      {/* Progress state during active scan */}
      {privacyScan.isPending && <PrivacyScanProgress />}

      {/* General error state (rate limit, server error, timeout, network error) */}
      {privacyScan.generalError && !privacyScan.isPending && (
        <ErrorState
          title="Analysis could not be completed"
          description={privacyScan.generalError}
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
