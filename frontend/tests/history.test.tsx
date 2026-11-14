import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HistoryPage } from "@threatory/contracts";
import { HistoryView } from "../src/features/history/components/HistoryView";
import { renderWithQuery, expectNoAxeViolations } from "./test-utils";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/history",
  useSearchParams: () => mockSearchParams,
}));

const SAMPLE_HISTORY_PAGE: HistoryPage = {
  items: [
    {
      scanId: "scan-url-01",
      module: "url",
      status: "completed",
      targetSummary: "https://example.com/login",
      assessment: {
        label: "Low risk",
        riskLevel: "low",
      },
      createdAt: "2026-11-14T10:00:00.000Z",
    },
    {
      scanId: "scan-privacy-02",
      module: "privacy",
      status: "completed",
      targetSummary: "2 profile(s) analysed",
      assessment: {
        label: "Medium risk",
        riskLevel: "medium",
      },
      createdAt: "2026-11-14T09:30:00.000Z",
    },
    {
      scanId: "scan-website-03",
      module: "website",
      status: "failed",
      targetSummary: "example.org",
      assessment: {
        label: "High risk",
        riskLevel: "high",
      },
      createdAt: "2026-11-14T09:00:00.000Z",
    },
  ],
  page: 1,
  limit: 20,
  total: 3,
};

describe("History View and Components (CP-11 Task 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays retention notice and list of scans with safe plain-text rendering", async () => {
    vi.spyOn(global, "fetch").mockImplementationOnce(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: SAMPLE_HISTORY_PAGE,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const { container } = renderWithQuery(<HistoryView />);

    // Retention notice must be visible
    expect(
      await screen.findByText(/Reports belong to this browser session and expire automatically/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/privacy reports expire after 7 days/i)).toBeInTheDocument();

    // Scan targets rendered as text
    expect(await screen.findByText("https://example.com/login")).toBeInTheDocument();
    expect(screen.getByText("2 profile(s) analysed")).toBeInTheDocument();
    expect(screen.getByText("example.org")).toBeInTheDocument();

    // Critical invariant: target URLs are NEVER clickable links!
    const targetElement = screen.getByText("https://example.com/login");
    expect(targetElement.tagName).not.toBe("A");
    expect(targetElement.closest("a")).toBeNull();

    // Module badges
    expect(screen.getByText("URL")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
    expect(screen.getByText("Website")).toBeInTheDocument();

    // Action links
    const viewReportLinks = screen.getAllByRole("link", { name: /view report/i });
    expect(viewReportLinks).toHaveLength(3);
    expect(viewReportLinks[0]).toHaveAttribute("href", "/reports/scan-url-01");

    // Zero accessibility violations
    await expectNoAxeViolations(container);
  });

  it("handles module and status filter changes by updating URL parameters", async () => {
    const user = userEvent.setup();

    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: SAMPLE_HISTORY_PAGE,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    renderWithQuery(<HistoryView />);

    await screen.findByText("https://example.com/login");

    const moduleSelect = screen.getByLabelText(/module/i);
    await user.selectOptions(moduleSelect, "url");
    expect(mockPush).toHaveBeenCalledWith("/history?module=url");

    const statusSelect = screen.getByLabelText(/status/i);
    await user.selectOptions(statusSelect, "completed");
    expect(mockPush).toHaveBeenCalledWith("/history?status=completed");
  });

  it("shows empty state with quick links when user has no scans in this session", async () => {
    vi.spyOn(global, "fetch").mockImplementationOnce(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              items: [],
              page: 1,
              limit: 20,
              total: 0,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const { container } = renderWithQuery(<HistoryView />);

    expect(await screen.findByText("No scans yet")).toBeInTheDocument();
    expect(
      screen.getByText(/You have not run any scans in this browser session/i)
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /url analyzer/i })).toHaveAttribute(
      "href",
      "/url-analyzer"
    );
    expect(screen.getByRole("link", { name: /privacy analyzer/i })).toHaveAttribute(
      "href",
      "/privacy-analyzer"
    );
    expect(screen.getByRole("link", { name: /website auditor/i })).toHaveAttribute(
      "href",
      "/website-auditor"
    );

    await expectNoAxeViolations(container);
  });

  it("shows filtered empty state with reset button when filters match 0 results", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("module=website&status=failed");

    vi.spyOn(global, "fetch").mockImplementationOnce(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              items: [],
              page: 1,
              limit: 20,
              total: 0,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const { container } = renderWithQuery(<HistoryView />);

    expect(await screen.findByText("No matching scans")).toBeInTheDocument();
    const clearButtons = screen.getAllByRole("button", { name: /clear filters|reset filters/i });
    expect(clearButtons[0]).toBeDefined();
    await user.click(clearButtons[0]!);
    expect(mockPush).toHaveBeenCalledWith("/history");

    await expectNoAxeViolations(container);
  });
});
