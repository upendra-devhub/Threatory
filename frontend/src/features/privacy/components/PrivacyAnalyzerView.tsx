"use client";

import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivacyScanForm } from "./PrivacyScanForm";
import { PrivacyScanRequest } from "@threatory/contracts";

export interface PrivacyAnalyzerViewProps {
  onScanOverride?: (data: PrivacyScanRequest) => Promise<void>;
}

export function PrivacyAnalyzerView({ onScanOverride }: PrivacyAnalyzerViewProps) {
  const handleScan = async (data: PrivacyScanRequest) => {
    if (onScanOverride) {
      await onScanOverride(data);
    }
  };

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
          <PrivacyScanForm onSubmit={handleScan} />
        </CardContent>
      </Card>
    </div>
  );
}
