import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiStatusBadge } from "../src/components/layout/ApiStatusIndicator";
import { AppShell } from "../src/components/layout/AppShell";
import { renderWithQuery } from "./test-utils";

const mockUsePathname = vi.fn<() => string>();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("AppShell and ApiStatusIndicator", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/url-analyzer");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Threatory branding, all navigation items, and semantic active state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", timestamp: "2026-11-11T16:30:00.000Z" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    renderWithQuery(
      <AppShell>
        <h1>Page body</h1>
      </AppShell>
    );

    expect(screen.getAllByText("Threatory").length).toBeGreaterThan(0);

    const expectedRoutes = [
      { name: "Overview", href: "/" },
      { name: "URL Analyzer", href: "/url-analyzer" },
      { name: "Privacy Analyzer", href: "/privacy-analyzer" },
      { name: "Website Auditor", href: "/website-auditor" },
      { name: "History", href: "/history" },
      { name: "Help", href: "/help" },
    ];

    for (const route of expectedRoutes) {
      const link = screen.getByRole("link", { name: route.name });
      expect(link).toHaveAttribute("href", route.href);
    }

    const activeLink = screen.getByRole("link", { name: "URL Analyzer" });
    expect(activeLink).toHaveAttribute("aria-current", "page");

    const inactiveLink = screen.getByRole("link", { name: "Overview" });
    expect(inactiveLink).not.toHaveAttribute("aria-current");

    expect(await screen.findByText("API: Connected")).toBeInTheDocument();
  });

  it("supports opening and closing mobile navigation via toggle button and Escape key", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", timestamp: "2026-11-11T16:30:00.000Z" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    renderWithQuery(
      <AppShell>
        <h1>Content</h1>
      </AppShell>
    );

    const toggleButton = screen.getByRole("button", { name: "Open navigation menu" });
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("mobile-navigation")).toBeNull();

    await user.click(toggleButton);

    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    expect(toggleButton).toHaveAttribute("aria-label", "Close navigation menu");
    expect(document.getElementById("mobile-navigation")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(document.getElementById("mobile-navigation")).toBeNull();
    });
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    expect(toggleButton).toHaveFocus();
  });

  it("renders checking, connected, and unavailable API status states and recovers", async () => {
    const { rerender } = renderWithQuery(<ApiStatusBadge state="checking" />);
    expect(screen.getByRole("status")).toHaveTextContent("API: Checking");

    rerender(<ApiStatusBadge state="connected" />);
    expect(screen.getByRole("status")).toHaveTextContent("API: Connected");

    rerender(<ApiStatusBadge state="unavailable" />);
    expect(screen.getByRole("status")).toHaveTextContent("API: Unavailable");
  });

  it("transitions AppShell API status indicator from Checking -> Unavailable -> Connected on refetch", async () => {
    let resolveInitial: (value: Response) => void = () => {};
    const pendingInitial = new Promise<Response>((resolve) => {
      resolveInitial = resolve;
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValueOnce(pendingInitial)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok", timestamp: "2026-11-11T16:31:00.000Z" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    const { queryClient } = renderWithQuery(
      <AppShell>
        <h1>Workspace</h1>
      </AppShell>
    );

    expect(screen.getByRole("status")).toHaveTextContent("API: Checking");

    resolveInitial(new Response("down", { status: 503 }));
    expect(await screen.findByText("API: Unavailable")).toBeInTheDocument();

    await queryClient.refetchQueries({ queryKey: ["api-health"] });

    expect(await screen.findByText("API: Connected")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

