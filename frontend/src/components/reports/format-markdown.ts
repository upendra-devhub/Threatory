import type { Report } from "@threatory/contracts";

export function generateReportMarkdown(report: Report): string {
  const lines: string[] = [];

  lines.push(`# Threatory Security Report: ${report.targetSummary}`);
  lines.push("");
  lines.push(`- **Module:** ${report.module}`);
  lines.push(`- **Report ID:** ${report.scanId}`);
  lines.push(`- **Status:** ${report.status}`);
  lines.push(`- **Created At:** ${report.createdAt}`);
  lines.push(`- **Rules Version:** ${report.rulesVersion}`);
  lines.push("");

  lines.push("## Assessment");
  lines.push(`- **Risk Level:** ${report.assessment.riskLevel}`);
  lines.push(`- **Label:** ${report.assessment.label}`);
  if (typeof report.assessment.score === "number") {
    lines.push(`- **Score:** ${report.assessment.score}/100`);
  }
  if (report.assessment.scoreMeaning) {
    lines.push(`- **Score Meaning:** ${report.assessment.scoreMeaning}`);
  }
  lines.push("");

  lines.push("## Findings");
  if (report.findings.length === 0) {
    lines.push("No findings recorded.");
  } else {
    report.findings.forEach((finding, index) => {
      lines.push(
        `### ${index + 1}. [${finding.outcome.toUpperCase()}] ${finding.title} (${finding.code})`
      );
      lines.push(`- **Category:** ${finding.category}`);
      lines.push(`- **Severity:** ${finding.severity}`);
      lines.push(`- **Evidence:** ${finding.evidence}`);
      lines.push(`- **Explanation:** ${finding.explanation}`);
      if (finding.recommendation) {
        lines.push(`- **Recommendation:** ${finding.recommendation}`);
      }
      lines.push("");
    });
  }

  lines.push("## Limitations");
  if (report.limitations.length === 0) {
    lines.push("None stated.");
  } else {
    report.limitations.forEach((limitation) => {
      lines.push(`- ${limitation}`);
    });
  }
  lines.push("");

  return lines.join("\n");
}
