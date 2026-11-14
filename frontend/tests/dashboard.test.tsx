import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DashboardSummary } from "@threatory/contracts";
import { DashboardView } from "../src/features/dashboard/components/DashboardView";
import { renderWithQuery, expectNoAxeViolations } from "./test-utils";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const SAMPLE_SUMMARY: DashboardSummary = {
  totalScans: 8,
  byModule: {
    url: 4,
    privacy: 2,
    website: 2,
  },
  byRiskLevel: {
    none_detected: 2,
    low: 3,
    medium: 2,
    high: 1,
  },
  recent: [
    {
      scanId: "recent-01",
      module: "url",
      status: "completed",
      targetSummary: "https://secure-login.test",
      assessment: {
        label: "Low risk",
        riskLevel: "low",
      },
      createdAt: "2026-11-14T11:00:00.000Z",
    },
    {
      scanId: "recent-02",
      module: "privacy",
      status: "completed",
      targetSummary: "3 profile(s) analysed",
      assessment: {
        label: "Medium risk",
        riskLevel: "medium",
      },
      createdAt: "2026-11-14T10:30:00.000Z",
    },
    {
      scanId: "recent-03",
      module: "website",
      status: "failed",
      targetSummary: "bank.test",
      assessment: {
        label: "High risk",
        riskLevel: "high",
      },
      createdAt: "2026-11-14T10:00:00.000Z",
    },
  ],
};

describe("Dashboard View & Components (CP-11 Task 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders first-use empty state with guidance and quick tool links when totalScans is 0", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            totalScans: 0,
            byModule: { url: 0, privacy: 0, website: 0 },
            byRiskLevel: { none_detected: 0, low: 0, medium: 0, high: 0 },
            recent: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { container } = renderWithQuery(<DashboardView />);

    expect(await screen.findByText("Welcome to Threatory")).toBeInTheDocument();
    expect(
      screen.getByText(/You have not run any scans in this browser session/i)
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /analyze a url/i })).toHaveAttribute(
      "href",
      "/url-analyzer"
    );
    expect(screen.getByRole("link", { name: /audit privacy/i })).toHaveAttribute(
      "href",
      "/privacy-analyzer"
    );
    expect(screen.getByRole("link", { name: /audit website/i })).toHaveAttribute(
      "href",
      "/website-auditor"
    );

    await expectNoAxeViolations(container);
  });

  it("renders stat cards, charts with accessible text, and recent scans table with no clickable URL links", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: SAMPLE_SUMMARY,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { container } = renderWithQuery(<DashboardView />);

    // Stat cards values match exactly
    expect(await screen.findByTestId("stat-total-scans")).toHaveTextContent("8");
    expect(screen.getByTestId("stat-url-scans")).toHaveTextContent("4");
    expect(screen.getByTestId("stat-privacy-scans")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-website-scans")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-high-risk")).toHaveTextContent("1");

    // Charts accessible text alternatives are present in DOM
    expect(screen.getByText("Risk level breakdown table")).toBeInTheDocument();
    expect(screen.getByText("Module breakdown table")).toBeInTheDocument();

    // Recent scans table items rendered
    expect(screen.getByText("https://secure-login.test")).toBeInTheDocument();
    expect(screen.getByText("3 profile(s) analysed")).toBeInTheDocument();
    expect(screen.getByText("bank.test")).toBeInTheDocument();

    // Critical invariant: target strings are NEVER clickable links!
    const targetElement = screen.getByText("https://secure-login.test");
    expect(targetElement.tagName).not.toBe("A");
    expect(targetElement.closest("a")).toBeNull();

    // Navigation to report
    const viewButtons = screen.getAllByRole("link", { name: /^view$/i });
    expect(viewButtons[0]).toHaveAttribute("href", "/reports/recent-01");

    // Zero axe violations on loaded dashboard
    await expectNoAxeViolations(container);
  });

  it("renders error state when fetch fails and allows retry", async () => {
    const user = userEvent.setup();

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: SAMPLE_SUMMARY }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    const { container } = renderWithQuery(<DashboardView />);

    expect(await screen.findByRole("heading", { level: 2, name: /unable to load dashboard/i })).toBeInTheDocument();
    await expectNoAxeViolations(container);

    const retryButton = screen.getByRole("button", { name: /try again|retry/i });
    await user.click(retryButton);

    expect(await screen.findByTestId("stat-total-scans")).toHaveTextContent("8");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
