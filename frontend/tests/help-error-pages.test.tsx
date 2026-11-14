import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HelpPage from "../src/app/help/page";
import NotFound from "../src/app/not-found";
import ErrorPage from "../src/app/error";
import { expectNoAxeViolations } from "./test-utils";

describe("Help, NotFound and Error Pages Accessibility & UX (CP-12 Task 2)", () => {
  it("renders HelpPage with all 8 mandatory sections and has zero axe violations", async () => {
    const { container } = render(<HelpPage />);

    expect(screen.getByRole("heading", { level: 1, name: "How to use Threatory" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "1. What Threatory does" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "2. URL Analyzer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "3. Privacy Exposure Analyzer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "4. Website Security Auditor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "5. What information is stored" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "6. How long reports are kept" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "7. Browser ownership" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "8. Responsible use" })).toBeInTheDocument();

    // Verify retention table content
    expect(screen.getByText("7 days")).toBeInTheDocument();
    expect(screen.getAllByText("30 days").length).toBeGreaterThanOrEqual(2);

    await expectNoAxeViolations(container);
  });

  it("renders NotFound page with friendly message and dashboard link with zero axe violations", async () => {
    const { container } = render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "Page Not Found" })).toBeInTheDocument();
    expect(
      screen.getByText(/The requested page does not exist or may have been moved/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Return to Dashboard/i })).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });

  it("renders ErrorPage with retry action and zero axe violations", async () => {
    const resetFn = vi.fn();
    const user = userEvent.setup();
    const testError = Object.assign(new Error("Test rendering failure"), { digest: "test-digest" });

    const { container } = render(<ErrorPage error={testError} reset={resetFn} />);

    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected error occurred while rendering this page/i)
    ).toBeInTheDocument();
    // Ensures internal error stack is not printed to the screen
    expect(screen.queryByText("Test rendering failure")).not.toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /Try again/i });
    expect(retryBtn).toBeInTheDocument();
    await user.click(retryBtn);
    expect(resetFn).toHaveBeenCalledTimes(1);

    await expectNoAxeViolations(container);
  });
});
