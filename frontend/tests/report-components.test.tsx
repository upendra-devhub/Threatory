import type { Finding } from "@threatory/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AssessmentHeader,
  FindingGroup,
  OutcomeBadge,
  ReportView,
  SeverityBadge,
} from "../src/components/reports";
import { loadReportFixture, REPORT_FIXTURE_FILES } from "./test-utils";

describe("shared report components", () => {
  it.each(REPORT_FIXTURE_FILES)(
    "renders contract fixture %s accurately with no fabricated safety verdict or URL links",
    (filename) => {
      const report = loadReportFixture(filename);
      const { container } = render(<ReportView report={report} />);

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(report.targetSummary);
      expect(screen.getByText(report.scanId)).toBeInTheDocument();
      expect(screen.getByText(report.rulesVersion)).toBeInTheDocument();
      expect(screen.getAllByText(report.assessment.label).length).toBeGreaterThan(0);

      // Status banner handling
      if (report.status === "partial") {
        expect(screen.getByText("Partial scan results")).toBeInTheDocument();
      } else if (report.status === "failed") {
        expect(screen.getByText("Analysis did not complete")).toBeInTheDocument();
      } else {
        expect(screen.getByText("Status: Completed")).toBeInTheDocument();
      }

      // Score only shown when present (URL completed/partial)
      if (typeof report.assessment.score === "number") {
        expect(screen.getByText(String(report.assessment.score))).toBeInTheDocument();
        expect(screen.getByText(/not a probability/i)).toBeInTheDocument();
        if (report.assessment.scoreMeaning) {
          expect(screen.getByText(report.assessment.scoreMeaning)).toBeInTheDocument();
        }
      } else {
        expect(screen.queryByText(/Rule-based score/i)).not.toBeInTheDocument();
      }

      // Every finding renders in full
      for (const finding of report.findings) {
        expect(screen.getByText(finding.title)).toBeInTheDocument();
        expect(screen.getByText(finding.code)).toBeInTheDocument();
        expect(screen.getByText(finding.evidence)).toBeInTheDocument();
        expect(screen.getByText(finding.explanation)).toBeInTheDocument();
        if (finding.recommendation) {
          expect(screen.getByText(finding.recommendation)).toBeInTheDocument();
        }
      }

      if (report.findings.length === 0) {
        expect(screen.getByText("No findings available")).toBeInTheDocument();
      }

      // Limitations always render
      expect(screen.getByText("What was not checked (Limitations)")).toBeInTheDocument();
      for (const limitation of report.limitations) {
        expect(screen.getByText(limitation)).toBeInTheDocument();
      }

      // Details render when present
      if (report.details && Object.keys(report.details).length > 0) {
        expect(screen.getByText("Technical details")).toBeInTheDocument();
      }

      // Security rules: never say "Safe" and never turn submitted URLs into links
      expect(container.textContent).not.toMatch(/\bsafe\b/i);
      expect(container.querySelectorAll("a")).toHaveLength(0);
    }
  );

  it("renders not_assessed visibly and semantically distinct from pass", () => {
    const { container } = render(
      <div>
        <OutcomeBadge outcome="pass" />
        <OutcomeBadge outcome="not_assessed" />
      </div>
    );

    const passBadge = container.querySelector('[data-outcome="pass"]');
    const notAssessedBadge = container.querySelector('[data-outcome="not_assessed"]');

    expect(passBadge).toBeInTheDocument();
    expect(notAssessedBadge).toBeInTheDocument();

    expect(passBadge).toHaveTextContent("Outcome: Pass");
    expect(notAssessedBadge).toHaveTextContent("Outcome: Not assessed");

    expect(passBadge?.className).not.toContain("border-dashed");
    expect(notAssessedBadge?.className).toContain("border-dashed");

    const passIcon = passBadge?.querySelector("svg")?.innerHTML;
    const notAssessedIcon = notAssessedBadge?.querySelector("svg")?.innerHTML;
    expect(passIcon).toBeTruthy();
    expect(notAssessedIcon).toBeTruthy();
    expect(notAssessedIcon).not.toBe(passIcon);
  });

  it("renders SeverityBadge with icon and text and distinct styling across severities", () => {
    const { container } = render(
      <div>
        <SeverityBadge severity="info" />
        <SeverityBadge severity="low" />
        <SeverityBadge severity="medium" />
        <SeverityBadge severity="high" />
      </div>
    );

    const medium = container.querySelector('[data-severity="medium"]');
    const high = container.querySelector('[data-severity="high"]');
    expect(medium).toHaveTextContent("Severity: Medium");
    expect(high).toHaveTextContent("Severity: High");
    expect(medium?.querySelector("svg")).toBeInTheDocument();
    expect(high?.querySelector("svg")).toBeInTheDocument();
    expect(high?.className).toContain("border-2");
    expect(medium?.className).not.toContain("border-2");
  });

  it("groups previously unseen categories dynamically and preserves finding order", () => {
    const findings: Finding[] = [
      {
        code: "CUSTOM_FIRST",
        category: "custom_supply_chain",
        title: "First custom check",
        outcome: "pass",
        severity: "info",
        evidence: "Check 1 passed",
        explanation: "First check explanation",
      },
      {
        code: "CUSTOM_SECOND",
        category: "custom_supply_chain",
        title: "Second custom check",
        outcome: "warn",
        severity: "medium",
        evidence: "Check 2 warned",
        explanation: "Second check explanation",
        recommendation: "Fix second check",
      },
    ];

    render(<FindingGroup findings={findings} />);

    const sectionHeading = screen.getByRole("heading", { level: 3, name: "Custom Supply Chain" });
    const section = sectionHeading.closest("section");
    expect(section).not.toBeNull();
    const cards = within(section as HTMLElement).getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("First custom check");
    expect(cards[1]).toHaveTextContent("Second custom check");
  });

  it("does not display score on Privacy or Website AssessmentHeader", () => {
    render(
      <AssessmentHeader
        module="privacy"
        assessment={{ label: "No exposure patterns detected", riskLevel: "none_detected" }}
      />
    );

    expect(screen.getByText("Risk level: None detected")).toBeInTheDocument();
    expect(screen.getByText("No exposure patterns detected")).toBeInTheDocument();
    expect(screen.queryByText(/Rule-based score/i)).not.toBeInTheDocument();
  });
});

