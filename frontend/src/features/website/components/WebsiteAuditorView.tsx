"use client";

import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WebsiteScanForm } from "./WebsiteScanForm";
import { WebsiteScopeNotice } from "./WebsiteScopeNotice";
import { WebsiteScanProgress } from "./WebsiteScanProgress";
import { WebsiteResult } from "./WebsiteResult";
import { ErrorState } from "@/components/reports/ErrorState";
import { useWebsiteScan } from "../hooks/useWebsiteScan";
import { WebsiteScanRequest, Report } from "@threatory/contracts";

export interface WebsiteAuditorViewProps {
  onScanOverride?: (data: WebsiteScanRequest) => Promise<Report>;
  initialReport?: Report | null;
}

export function WebsiteAuditorView({
  onScanOverride,
  initialReport = null,
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
      <PageHeader
        title="Website Auditor"
        description="Inspects publicly visible HTTPS, TLS, security header, cookie, and email DNS configuration for authorised targets."
      />

      <WebsiteScopeNotice />

      <Card>
        <CardHeader>
          <CardTitle as="h2">Submit a public website for audit</CardTitle>
          <CardDescription>
            Audits public web security configuration without intrusive attacks or payloads. You must confirm that you own the target domain or have explicit permission to audit it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebsiteScanForm
            onSubmit={handleScan}
            isLoading={websiteScan.isPending}
            fieldError={websiteScan.fieldError}
            initialUrl={websiteScan.lastSubmittedRequest?.url ?? ""}
            initialAuthorised={websiteScan.lastSubmittedRequest?.authorised ?? false}
          />
        </CardContent>
      </Card>

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

      {/* Successful or partial report result */}
      {currentReport && !websiteScan.isPending && (
        <WebsiteResult report={currentReport} />
      )}
    </div>
  );
}
