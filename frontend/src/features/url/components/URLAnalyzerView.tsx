"use client";

import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { URLScanForm } from "./URLScanForm";
import { URLScanProgress } from "./URLScanProgress";
import { URLScanResult } from "./URLScanResult";
import { ErrorState } from "@/components/reports/ErrorState";
import { useUrlScan } from "../hooks/useUrlScan";
import { UrlScanRequest, Report } from "@threatory/contracts";

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
      // Error state is captured and displayed via useUrlScan
    }
  };

  const currentReport = urlScan.report ?? initialReport;

  return (
    <div className="space-y-6">
      <PageHeader
        title="URL Analyzer"
        description="Examine a URL for suspicious phishing-related patterns and understand the indicators behind its risk assessment."
      />

      <Card>
        <CardHeader>
          <CardTitle as="h2">Submit a URL for deterministic analysis</CardTitle>
          <CardDescription>
            The submitted URL is analyzed purely as text. Threatory parses its structure and evaluates rule-based phishing indicators without visiting, fetching, or executing any remote content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <URLScanForm
            onSubmit={handleScan}
            isLoading={urlScan.isPending}
            fieldError={urlScan.fieldError}
            initialValue={urlScan.lastSubmittedUrl}
          />
        </CardContent>
      </Card>

      {/* Progress state during active scan */}
      {urlScan.isPending && <URLScanProgress />}

      {/* General error state (rate limit, server error, timeout, network error) */}
      {urlScan.generalError && !urlScan.isPending && (
        <ErrorState
          title="Analysis could not be completed"
          description={urlScan.generalError}
          onRetry={urlScan.lastSubmittedUrl ? urlScan.retry : undefined}
          isRetrying={urlScan.isPending}
          retryLabel="Retry analysis"
        />
      )}

      {/* Successful report result */}
      {currentReport && !urlScan.isPending && (
        <URLScanResult report={currentReport} />
      )}
    </div>
  );
}
