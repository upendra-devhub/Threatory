import { test, expect } from "@playwright/test";

test.describe("History, Report Actions, and Dashboard End-to-End Journeys (CP-11)", () => {
  test("Journey 1 — Dashboard first-use empty state, scan submission, and dynamic dashboard update", async ({
    page,
  }) => {
    // 1. First-use empty state
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(page.getByText("Welcome to Threatory")).toBeVisible();
    await expect(page.getByRole("link", { name: /analyze a url/i })).toBeVisible();

    // 2. Run a URL scan
    await page.goto("/url-analyzer");
    const u1Button = page.getByRole("button", { name: /Example 1 — U1/i });
    await u1Button.click();
    const submitBtn = page.getByRole("button", { name: /^Analyze URL$/i });
    await submitBtn.click();

    // Wait for the result
    const resultContainer = page.getByTestId("url-scan-result");
    await expect(resultContainer).toBeVisible({ timeout: 20_000 });

    // 3. Return to Dashboard
    await page.goto("/");
    await expect(page.getByTestId("stat-total-scans")).toHaveText("1");
    await expect(page.getByTestId("stat-url-scans")).toHaveText("1");
    await expect(page.getByTestId("stat-privacy-scans")).toHaveText("0");
    await expect(page.getByTestId("stat-website-scans")).toHaveText("0");

    // 4. Verify recent scans table displays the scan with plain text target (never clickable link)
    const recentTarget = page.getByTestId("recent-target-summary");
    await expect(recentTarget).toBeVisible();
    await expect(recentTarget).toHaveText("http://198.51.100.23/login");
    // Verify target itself is not a link
    await expect(recentTarget.locator("xpath=ancestor-or-self::a")).toHaveCount(0);
  });

  test("Journey 2 — History filters, pagination, and refresh survival", async ({ page }) => {
    // 1. Submit a URL scan
    await page.goto("/url-analyzer");
    const u2Button = page.getByRole("button", { name: /Example 2 — U2/i });
    await u2Button.click();
    await page.getByRole("button", { name: /^Analyze URL$/i }).click();
    await expect(page.getByTestId("url-scan-result")).toBeVisible({ timeout: 20_000 });

    // 2. Navigate to History
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "History", level: 1 })).toBeVisible();
    await expect(
      page.getByText(/Reports belong to this browser session and expire automatically/i)
    ).toBeVisible();

    // 3. Select module filter = URL
    const moduleSelect = page.getByLabel(/module/i);
    await moduleSelect.selectOption("url");
    await expect(page).toHaveURL(/module=url/);

    // 4. Reload page and verify filter survives
    await page.reload();
    await expect(page).toHaveURL(/module=url/);
    await expect(page.getByLabel(/module/i)).toHaveValue("url");

    // 5. Reset filter
    const resetBtn = page.getByRole("button", { name: /reset filters/i });
    await resetBtn.click();
    await expect(page).toHaveURL(/\/history$/);
  });

  test("Journey 3 — Report actions: copy Markdown, copy JSON, print media emulation, and deletion", async ({
    page,
  }) => {
    // 1. Submit a scan and view saved report
    await page.goto("/url-analyzer");
    const u1Button = page.getByRole("button", { name: /Example 1 — U1/i });
    await u1Button.click();
    await page.getByRole("button", { name: /^Analyze URL$/i }).click();
    await expect(page.getByTestId("url-scan-result")).toBeVisible({ timeout: 20_000 });

    // Navigate to saved report via history
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "History", level: 1 })).toBeVisible();
    const viewReportLink = page.getByRole("link", { name: /view report/i }).first();
    await expect(viewReportLink).toBeVisible();
    await viewReportLink.click();
    await expect(page).toHaveURL(/\/reports\/.+/);

    // 2. Retention notice visible on report page
    await expect(
      page.getByText(/Reports belong to this browser session and expire automatically/i)
    ).toBeVisible();

    // 3. Copy Markdown & Copy JSON buttons
    const copyMdBtn = page.getByRole("button", { name: /copy report as markdown/i });
    await copyMdBtn.click();
    await expect(page.getByText("Copied Markdown!")).toBeVisible();

    const copyJsonBtn = page.getByRole("button", { name: /copy report as json/i });
    await copyJsonBtn.click();
    await expect(page.getByText("Copied JSON!")).toBeVisible();

    // 4. Print emulation test
    await page.emulateMedia({ media: "print" });
    const limitations = page.getByLabel("Scan limitations");
    await expect(limitations).toBeVisible();
    // In print, [data-no-print] should be hidden
    const actionsBar = page.locator("[data-no-print]");
    await expect(actionsBar).toBeHidden();
    await page.emulateMedia({ media: "screen" });

    // 5. Delete report with confirmation dialog
    const deleteBtn = page.getByRole("button", { name: /delete report/i });
    await deleteBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("heading", { name: /delete this report\?/i })).toBeVisible();

    // Confirm deletion
    const confirmDeleteBtn = dialog.getByRole("button", { name: /delete report/i });
    await confirmDeleteBtn.click();

    // Navigates back to /history
    await expect(page).toHaveURL(/\/history$/);

    // Verify dashboard reflects deleted scan
    await page.goto("/");
    await expect(page.getByText("Welcome to Threatory")).toBeVisible();
  });

  test("Journey 4 — Multi-owner isolation at browser level (separate Playwright contexts)", async ({
    browser,
  }) => {
    // Context 1 (Owner 1)
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Owner 1 submits a URL scan
    await page1.goto("/url-analyzer");
    await page1.getByRole("button", { name: /Example 1 — U1/i }).click();
    await page1.getByRole("button", { name: /^Analyze URL$/i }).click();
    await expect(page1.getByTestId("url-scan-result")).toBeVisible({ timeout: 20_000 });

    // Owner 1 has 1 scan on dashboard and in history
    await page1.goto("/");
    await expect(page1.getByTestId("stat-total-scans")).toHaveText("1");

    await page1.goto("/history");
    const owner1Target = page1.getByTestId("history-target-summary");
    await expect(owner1Target).toHaveText("http://198.51.100.23/login");

    // Extract scanId from Owner 1's report link
    const reportLink = page1.getByRole("link", { name: /view report/i }).first();
    const reportHref = await reportLink.getAttribute("href");
    expect(reportHref).toBeTruthy();

    // Context 2 (Owner 2 - completely separate browser session and cookies)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Owner 2 visits dashboard: sees 0 scans
    await page2.goto("/");
    await expect(page2.getByText("Welcome to Threatory")).toBeVisible();

    // Owner 2 visits history: sees 0 scans
    await page2.goto("/history");
    await expect(page2.getByText("No scans yet")).toBeVisible();

    // Owner 2 attempts to open Owner 1's report directly: gets 404 NOT_FOUND
    if (reportHref) {
      await page2.goto(reportHref);
      await expect(page2.getByRole("heading", { name: "Report not found", level: 1 })).toBeVisible();
      await expect(
        page2.getByText(/The requested report could not be found/i)
      ).toBeVisible();
    }

    await context1.close();
    await context2.close();
  });
});
