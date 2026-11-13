"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { URLScanForm } from "./URLScanForm";
import { UrlScanRequest } from "@threatory/contracts";

export interface URLAnalyzerViewProps {
  onScan?: (data: UrlScanRequest) => Promise<void> | void;
  isLoading?: boolean;
  fieldError?: string | null;
}

export function URLAnalyzerView({
  onScan,
  isLoading = false,
  fieldError,
}: URLAnalyzerViewProps) {
  const [lastSubmittedUrl, setLastSubmittedUrl] = useState<string>("");

  const handleScan = async (data: UrlScanRequest) => {
    setLastSubmittedUrl(data.url);
    if (onScan) {
      await onScan(data);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="URL Analyzer"
        description="Examine a URL for suspicious phishing-related patterns and understand the indicators behind its risk assessment."
      />

      <Card>
        <CardHeader>
          <CardTitle>Submit a URL for deterministic analysis</CardTitle>
          <CardDescription>
            The submitted URL is analyzed purely as text. Threatory parses its structure and evaluates rule-based phishing indicators without visiting, fetching, or executing any remote content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <URLScanForm
            onSubmit={handleScan}
            isLoading={isLoading}
            fieldError={fieldError}
            initialValue={lastSubmittedUrl}
          />
        </CardContent>
      </Card>
    </div>
  );
}
