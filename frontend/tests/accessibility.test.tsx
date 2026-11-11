import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../src/components/layout/AppShell";
import {
  AssessmentHeader,
  EmptyState,
  ErrorState,
  FindingCard,
  FindingGroup,
  LimitationsPanel,
  OutcomeBadge,
  PartialBanner,
  ReportSkeleton,
  SavedReportView,
  SeverityBadge,
} from "../src/components/reports";
import { expectNoAxeViolations, loadReportFixture, renderWithQuery } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/reports/scan-url-001",
}));

describe("Accessibility (vitest-axe & keyboard navigation)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has zero axe violations for AppShell and navigation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", timestamp: "2026-11-11T16:30:00.000Z" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { container } = renderWithQuery(
      <AppShell>
        <h1>Overview</h1>
      </AppShell>
    );

    await screen.findByText("API: Connected");
    await expectNoAxeViolations(container);
  });

  it("has zero axe violations for individual report badges and feedback states", async () => {
    const urlCompleted = loadReportFixture("url-report-completed.json");
    const firstFinding = urlCompleted.findings[0];
    expect(firstFinding).toBeDefined();

    const outcomeRender = render(
      <div>
        <OutcomeBadge outcome="pass" />
        <OutcomeBadge outcome="warn" />
        <OutcomeBadge outcome="fail" />
        <OutcomeBadge outcome="not_assessed" />
      </div>
    );
    await expectNoAxeViolations(outcomeRender.container);

    const severityRender = render(
      <div>
        <SeverityBadge severity="info" />
        <SeverityBadge severity="low" />
        <SeverityBadge severity="medium" />
        <SeverityBadge severity="high" />
      </div>
    );
    await expectNoAxeViolations(severityRender.container);

    if (firstFinding) {
      const cardRender = render(<FindingCard finding={firstFinding} />);
      await expectNoAxeViolations(cardRender.container);
    }

    const groupRender = render(<FindingGroup findings={urlCompleted.findings} />);
    await expectNoAxeViolations(groupRender.container);

    const assessmentRender = render(
      <AssessmentHeader assessment={urlCompleted.assessment} module={urlCompleted.module} />
    );
    await expectNoAxeViolations(assessmentRender.container);

    const limitationsRender = render(
      <LimitationsPanel limitations={urlCompleted.limitations} />
    );
    await expectNoAxeViolations(limitationsRender.container);

    const partialRender = render(<PartialBanner />);
    await expectNoAxeViolations(partialRender.container);

    const emptyRender = render(
      <EmptyState title="No findings" description="No findings were recorded." />
    );
    await expectNoAxeViolations(emptyRender.container);

    const errorRender = render(
      <ErrorState
        title="Unable to load report"
        description="A temporary error occurred."
        onRetry={() => {}}
      />
    );
    await expectNoAxeViolations(errorRender.container);

    const skeletonRender = render(<ReportSkeleton />);
    await expectNoAxeViolations(skeletonRender.container);
  });

  it("has zero axe violations for full SavedReportView inside AppShell with fixture data", async () => {
    const partialFixture = loadReportFixture("website-report-partial.json");
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : "";
      if (url === "/api/health") {
        return Promise.resolve(
          new Response(JSON.stringify({ status: "ok", timestamp: "2026-11-11T16:30:00.000Z" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: partialFixture }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const { container } = renderWithQuery(
      <AppShell>
        <SavedReportView scanId={partialFixture.scanId} />
      </AppShell>
    );

    await screen.findByRole("heading", { level: 1, name: partialFixture.targetSummary });
    await expectNoAxeViolations(container);
  });

  it("supports keyboard-only navigation for interactive controls without traps", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <ErrorState
        title="Connection issue"
        description="Please retry the request."
        onRetry={onRetry}
      />
    );

    await user.tab();
    const retryButton = screen.getByRole("button", { name: "Try again" });
    expect(retryButton).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onRetry).toHaveBeenCalledTimes(1);

    await user.keyboard(" ");
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("supports keyboard-only navigation across AppShell and mobile menu toggle", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", timestamp: "2026-11-11T16:30:00.000Z" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    renderWithQuery(
      <AppShell>
        <h1>Overview</h1>
      </AppShell>
    );

    // Tab reaches skip link first, then sidebar brand & nav links
    await user.tab();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveFocus();

    const menuButton = screen.getByRole("button", { name: "Open navigation menu" });
    menuButton.focus();
    expect(menuButton).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("mobile-navigation")).toBeInTheDocument();

    await user.keyboard(" ");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("mobile-navigation")).toBeNull();
  });
});

