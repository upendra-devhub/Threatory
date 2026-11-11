import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SavedReportView } from "../src/components/reports/SavedReportView";
import { FRIENDLY_ERROR_MESSAGES } from "../src/lib/api-client";
import { loadErrorFixture, loadReportFixture, renderWithQuery } from "./test-utils";

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SavedReportView (/reports/[scanId])", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading skeleton while request is pending", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise<Response>(() => {}));

    renderWithQuery(<SavedReportView scanId="scan-url-001" />);

    expect(screen.getByRole("status", { name: "Loading report" })).toBeInTheDocument();
  });

  it("retrieves and renders a completed report with details", async () => {
    const fixture = loadReportFixture("website-report-completed.json");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse({ success: true, data: fixture }, 200));

    renderWithQuery(<SavedReportView scanId="scan-site-001" />);

    expect(await screen.findByRole("heading", { level: 1, name: fixture.targetSummary })).toBeInTheDocument();
    expect(screen.getByText("Status: Completed")).toBeInTheDocument();
    expect(screen.getByText("Technical details")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("93.184.216.34")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/scans/scan-site-001",
      expect.objectContaining({ credentials: "include" })
    );

    // Submitted URLs in details/targetSummary must not become clickable links
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders a partial report with PartialBanner", async () => {
    const fixture = loadReportFixture("website-report-partial.json");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse({ success: true, data: fixture }, 200)
    );

    const { container } = renderWithQuery(<SavedReportView scanId="scan-site-002" />);

    expect(await screen.findByText("Partial scan results")).toBeInTheDocument();
    expect(screen.getByText("Not assessed")).toBeInTheDocument();
    expect(container.querySelector('[data-outcome="not_assessed"]')).toHaveTextContent(
      "Outcome: Not assessed"
    );
  });

  it("renders a failed report as a saved report rather than a fetch error", async () => {
    const fixture = loadReportFixture("privacy-report-failed.json");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse({ success: true, data: fixture }, 200)
    );

    renderWithQuery(<SavedReportView scanId="scan-priv-003" />);

    expect(await screen.findByText("Analysis did not complete")).toBeInTheDocument();
    expect(screen.getByText("Status: Failed")).toBeInTheDocument();
    expect(screen.getByText("No findings available")).toBeInTheDocument();
    expect(screen.getByText("Payload encoding violation")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retry/i })).not.toBeInTheDocument();
  });

  it("renders a dedicated not-found state for unknown or unowned scan IDs", async () => {
    const notFound = loadErrorFixture("error-not-found.json");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockJsonResponse(notFound, 404));

    renderWithQuery(<SavedReportView scanId="unknown-scan-id" />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Report not found" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Return to Overview/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Browse History/i })).toHaveAttribute("href", "/history");
  });

  it("shows ErrorState on network failure and triggers a fresh TanStack Query request on Retry", async () => {
    const user = userEvent.setup();
    const fixture = loadReportFixture("url-report-completed.json");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(mockJsonResponse({ success: true, data: fixture }, 200));

    renderWithQuery(<SavedReportView scanId="scan-url-001" />);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Unable to reach the API" })
    ).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const retryButton = screen.getByRole("button", { name: "Retry" });
    await user.click(retryButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
    expect(
      await screen.findByRole("heading", { level: 1, name: fixture.targetSummary })
    ).toBeInTheDocument();
  });

  it("shows friendly error state without internal details on malformed server responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Internal Stack Trace: MongoServerError at /app/src/server.ts:42", {
        status: 500,
      })
    );

    renderWithQuery(<SavedReportView scanId="scan-url-001" />);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Unexpected server response" })
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("MongoServerError");
    expect(document.body.textContent).not.toContain("server.ts");
  });

  it("renders friendly rate-limit message on 429 API error", async () => {
    const rateLimit = loadErrorFixture("error-rate-limit.json");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockJsonResponse(rateLimit, 429));

    renderWithQuery(<SavedReportView scanId="scan-url-001" />);

    expect(await screen.findByText(FRIENDLY_ERROR_MESSAGES.RATE_LIMITED)).toBeInTheDocument();
  });
});

