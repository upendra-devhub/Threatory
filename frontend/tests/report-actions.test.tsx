import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SavedReportView } from "../src/components/reports/SavedReportView";
import { loadReportFixture, renderWithQuery, expectNoAxeViolations } from "./test-utils";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/reports/scan-site-001",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Report Actions & Dialog (CP-11 Task 4 & Task 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies sanitized Markdown to clipboard without cookies or raw inputs", async () => {
    const user = userEvent.setup();
    const fixture = loadReportFixture("website-report-completed.json");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: fixture }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    let writtenText = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockImplementation((text: string) => {
          writtenText = text;
          return Promise.resolve();
        }),
      },
      configurable: true,
      writable: true,
    });

    const { container } = renderWithQuery(<SavedReportView scanId="scan-site-001" />);

    expect(await screen.findByRole("heading", { level: 1, name: fixture.targetSummary })).toBeInTheDocument();

    const copyMdButton = screen.getByRole("button", { name: /copy.*markdown/i });
    await user.click(copyMdButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(writtenText).toContain("# Threatory Security Report: https://example.com");
    expect(writtenText).toContain("## Findings");
    expect(writtenText).toContain("## Limitations");
    // Ensure no cookie values or session tokens
    expect(writtenText).not.toContain("tid=");
    expect(writtenText).not.toContain("Set-Cookie");
    expect(writtenText).not.toContain("connect.sid=");
    expect(writtenText).not.toContain("session=");

    // Success feedback rendered
    expect(screen.getByText("Copied Markdown!")).toBeInTheDocument();

    // Zero accessibility violations
    await expectNoAxeViolations(container);
  });

  it("copies sanitized JSON to clipboard without cookies or raw inputs", async () => {
    const user = userEvent.setup();
    const fixture = loadReportFixture("url-report-completed.json");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: fixture }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    let writtenText = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockImplementation((text: string) => {
          writtenText = text;
          return Promise.resolve();
        }),
      },
      configurable: true,
      writable: true,
    });

    renderWithQuery(<SavedReportView scanId="scan-url-001" />);

    expect(await screen.findByRole("heading", { level: 1, name: fixture.targetSummary })).toBeInTheDocument();

    const copyJsonButton = screen.getByRole("button", { name: /copy.*json/i });
    await user.click(copyJsonButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(writtenText) as Record<string, unknown>;
    expect(parsed.scanId).toBe(fixture.scanId);
    expect(parsed.module).toBe(fixture.module);
    expect(parsed.assessment).toBeDefined();
    expect(parsed).not.toHaveProperty("cookie");
    expect(parsed).not.toHaveProperty("rawInput");

    expect(screen.getByText("Copied JSON!")).toBeInTheDocument();
  });

  it("triggers window.print() when print button is clicked", async () => {
    const user = userEvent.setup();
    const fixture = loadReportFixture("website-report-completed.json");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: fixture }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    renderWithQuery(<SavedReportView scanId="scan-site-001" />);

    expect(await screen.findByRole("heading", { level: 1, name: fixture.targetSummary })).toBeInTheDocument();

    const printButton = screen.getByRole("button", { name: /print/i });
    await user.click(printButton);

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("opens confirmation dialog on delete, cancels safely, or confirms to delete and navigate", async () => {
    const user = userEvent.setup();
    const fixture = loadReportFixture("website-report-completed.json");

    vi.spyOn(globalThis, "fetch").mockImplementation((url, options) => {
      const urlStr = String(url);
      if (options?.method === "DELETE" && urlStr.includes("/api/scans/scan-site-001")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ success: true, data: { deleted: true, scanId: "scan-site-001" } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: fixture }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const { container } = renderWithQuery(<SavedReportView scanId="scan-site-001" />);

    expect(await screen.findByRole("heading", { level: 1, name: fixture.targetSummary })).toBeInTheDocument();

    const deleteTrigger = screen.getByRole("button", { name: /delete report/i });
    await user.click(deleteTrigger);

    // Dialog is open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /delete this report\?/i })).toBeInTheDocument();
    await expectNoAxeViolations(container);

    // Cancel first
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();

    // Open again and confirm delete
    await user.click(deleteTrigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const confirmDeleteButtons = screen.getAllByRole("button", { name: /delete report/i });
    expect(confirmDeleteButtons[1]).toBeDefined();
    await user.click(confirmDeleteButtons[1]!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/history");
    });
  });
});
