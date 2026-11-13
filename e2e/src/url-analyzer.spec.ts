import { test, expect } from "@playwright/test";

test.describe("URL Analyzer End-to-End Journeys (Task 6)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/url-analyzer");
    await expect(page.getByRole("heading", { name: "URL Analyzer", level: 1 })).toBeVisible();
  });

  test("Journey 1 — U1 suspicious URL analysis, findings, and scoring", async ({ page }) => {
    const input = page.getByLabel(/URL to analyze/i);
    await expect(input).toBeVisible();

    // Fill U1 example
    const u1Button = page.getByRole("button", { name: /Example 1 — U1/i });
    await expect(u1Button).toBeVisible();
    await u1Button.click();
    await expect(input).toHaveValue("http://198.51.100.23/login");

    // Submit
    const submitBtn = page.getByRole("button", { name: /^Analyze URL$/i });
    await submitBtn.click();

    // Confirm progress state appears
    const progressNotice = page.getByText(/Analyzing URL indicators\.\.\./i);
    await expect(progressNotice).toBeVisible();

    // Wait for the report result
    const resultContainer = page.getByTestId("url-scan-result");
    await expect(resultContainer).toBeVisible({ timeout: 15_000 });

    // Verify assessment: medium, score 50, label "Medium"
    await expect(page.getByText("Medium", { exact: true })).toBeVisible();
    await expect(page.getByText("50 / 100")).toBeVisible();

    // Verify finding URL_IP_HOST: outcome fail, severity high
    await expect(page.getByText("URL_IP_HOST")).toBeVisible();
    await expect(page.getByText("Host is an IP address")).toBeVisible();

    // Verify finding URL_NO_HTTPS: outcome warn
    await expect(page.getByText("URL_NO_HTTPS")).toBeVisible();

    // Verify finding URL_KEYWORDS: outcome warn
    await expect(page.getByText("URL_KEYWORDS")).toBeVisible();

    // Verify technical details card rendered with host
    await expect(page.getByRole("heading", { name: "Technical URL details" })).toBeVisible();
    await expect(page.getByText("198.51.100.23", { exact: true })).toBeVisible();

    // Verify limitations panel
    await expect(page.getByText(/Link not visited/i)).toBeVisible();
  });

  test("Journey 2 — U2 normal URL with no suspicious signals", async ({ page }) => {
    const input = page.getByLabel(/URL to analyze/i);
    const u2Button = page.getByRole("button", { name: /Example 2 — U2/i });
    await u2Button.click();
    await expect(input).toHaveValue("https://example.com/");

    const submitBtn = page.getByRole("button", { name: /^Analyze URL$/i });
    await submitBtn.click();

    const resultContainer = page.getByTestId("url-scan-result");
    await expect(resultContainer).toBeVisible({ timeout: 15_000 });

    // Verify assessment label is strictly "No suspicious signals detected"
    await expect(page.getByText("No suspicious signals detected").first()).toBeVisible();

    // Ensure it NEVER displays "Safe"
    const safeBadge = page.locator('text="Safe"');
    await expect(safeBadge).toHaveCount(0);

    // Verify score is 0 / 100
    await expect(page.getByText("0 / 100")).toBeVisible();
  });

  test("Journey 3 — Saved report navigation and reload persistence", async ({ page }) => {
    // Submit a scan
    const u1Button = page.getByRole("button", { name: /Example 1 — U1/i });
    await u1Button.click();

    const submitBtn = page.getByRole("button", { name: /^Analyze URL$/i });
    await submitBtn.click();

    const resultContainer = page.getByTestId("url-scan-result");
    await expect(resultContainer).toBeVisible({ timeout: 15_000 });

    // Click "Open saved report"
    const openReportLink = page.getByRole("link", { name: /Open saved report/i }).first();
    await expect(openReportLink).toBeVisible();

    const href = await openReportLink.getAttribute("href");
    expect(href).toMatch(/^\/reports\/scan-url-/);
    const scanId = href?.replace("/reports/", "");

    // Navigate to the saved report page
    await openReportLink.click();
    await page.waitForURL(`**/reports/${scanId}`);

    // Confirm that the saved report page is rendered from CP-02 GET endpoint
    await expect(page.getByText(scanId!)).toBeVisible();
    await expect(page.getByText("http://198.51.100.23/login")).toBeVisible();
    await expect(page.getByText("Medium", { exact: true })).toBeVisible();

    // Refresh the page in the same browser context (owner cookie retained)
    await page.reload();

    // Confirm the report is still accessible and matches
    await expect(page.getByText(scanId!)).toBeVisible();
    await expect(page.getByText("http://198.51.100.23/login")).toBeVisible();
    await expect(page.getByText("Medium", { exact: true })).toBeVisible();
  });

  test("Journey 4 — Unsupported protocol handling", async ({ page }) => {
    const input = page.getByLabel(/URL to analyze/i);
    await input.fill("ftp://example.com");

    const submitBtn = page.getByRole("button", { name: /^Analyze URL$/i });
    await submitBtn.click();

    // Field-level error from backend displayed in #url-error
    const errorAlert = page.locator("#url-error");
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });
    await expect(errorAlert).toContainText(/HTTP and HTTPS/i);

    // Input preserved
    await expect(input).toHaveValue("ftp://example.com");

    // No success result rendered
    await expect(page.getByTestId("url-scan-result")).toHaveCount(0);
  });

  test("Journey 5 — Example buttons populate field without auto-submitting", async ({ page }) => {
    const input = page.getByLabel(/URL to analyze/i);

    // 1. Click U1
    await page.getByRole("button", { name: /Example 1 — U1/i }).click();
    await expect(input).toHaveValue("http://198.51.100.23/login");
    await expect(page.getByTestId("url-scan-result")).toHaveCount(0);

    // 2. Click U2
    await page.getByRole("button", { name: /Example 2 — U2/i }).click();
    await expect(input).toHaveValue("https://example.com/");
    await expect(page.getByTestId("url-scan-result")).toHaveCount(0);

    // 3. Click U3
    await page.getByRole("button", { name: /Example 3 — U3/i }).click();
    await expect(input).toHaveValue("https://paypal.com@example.net/login");
    await expect(page.getByTestId("url-scan-result")).toHaveCount(0);

    // 4. Can edit after selecting
    await input.focus();
    await page.keyboard.press("End");
    await page.keyboard.type("/additional-path");
    await expect(input).toHaveValue("https://paypal.com@example.net/login/additional-path");
  });

  test("Journey 6 — Safe URL display without external navigation anchors", async ({ page }) => {
    const u1Button = page.getByRole("button", { name: /Example 1 — U1/i });
    await u1Button.click();

    const submitBtn = page.getByRole("button", { name: /^Analyze URL$/i });
    await submitBtn.click();

    await expect(page.getByTestId("url-scan-result")).toBeVisible({ timeout: 15_000 });

    // Target summary text element
    const scannedText = page.getByTestId("scanned-url-text");
    await expect(scannedText).toHaveText("http://198.51.100.23/login");

    // Verify no anchor elements exist that point to the target URL
    const externalAnchors = page.locator('a[href*="198.51.100.23"]');
    await expect(externalAnchors).toHaveCount(0);
  });
});
