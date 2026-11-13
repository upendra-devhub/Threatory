import React from "react";
import { Report } from "@threatory/contracts";

export interface PrivacyResultProps {
  report: Report;
}

export function PrivacyResult({ report }: PrivacyResultProps) {
  return (
    <div data-testid="privacy-scan-result" className="space-y-6">
      <div className="rounded-lg border border-border p-4 bg-card">
        <h2 className="text-lg font-semibold">{report.targetSummary}</h2>
      </div>
    </div>
  );
}
