import { describe, it, vi, afterEach } from "vitest";
import { PrivacyAnalyzerView } from "@/features/privacy/components/PrivacyAnalyzerView";
import { PrivacyScopeNotice } from "@/features/privacy/components/PrivacyScopeNotice";
import { PrivacyResult } from "@/features/privacy/components/PrivacyResult";
import { renderWithQuery, expectNoAxeViolations, loadReportFixture } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/privacy-analyzer",
}));

describe("Privacy Analyzer Accessibility Tests (Task 5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has zero axe violations for the initial empty PrivacyAnalyzerView", async () => {
    const { container } = renderWithQuery(<PrivacyAnalyzerView />);
    await expectNoAxeViolations(container);
  });

  it("has zero axe violations for PrivacyScopeNotice", async () => {
    const { container } = renderWithQuery(<PrivacyScopeNotice />);
    await expectNoAxeViolations(container);
  });

  it("has zero axe violations for PrivacyResult with completed report fixture", async () => {
    const report = loadReportFixture("privacy-report-completed.json");
    const { container } = renderWithQuery(<PrivacyResult report={report} />);
    await expectNoAxeViolations(container);
  });

  it("has zero axe violations for PrivacyResult with partial report fixture", async () => {
    const report = loadReportFixture("privacy-report-partial.json");
    const { container } = renderWithQuery(<PrivacyResult report={report} />);
    await expectNoAxeViolations(container);
  });

  it("has zero axe violations for PrivacyResult with failed report fixture", async () => {
    const report = loadReportFixture("privacy-report-failed.json");
    const { container } = renderWithQuery(<PrivacyResult report={report} />);
    await expectNoAxeViolations(container);
  });
});
