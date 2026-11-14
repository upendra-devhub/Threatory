import { test, expect } from "@playwright/test";

test.describe("CP-12 Task 4: Complete Golden Journey Suite (Clean Browser Contexts)", () => {
  // U1 — Suspicious URL
  test("Golden Journey U1 — Suspicious URL: http://198.51.100.23/login", async ({ page }) => {
    await page.goto("/url-analyzer");
    await expect(page.getByRole("heading", { name: "URL Analyzer", level: 1 })).toBeVisible();

    const input = page.getByLabel(/URL to analyze/i);
    await input.fill("http://198.51.100.23/login");

    const submitBtn = page.getByRole("button", { name: /^Analyze URL$/i });
    await submitBtn.click();

    // Verify report
    const result = page.getByTestId("url-scan-result");
    await expect(result).toBeVisible({ timeout: 15_000 });

    // Assessment check: score 50, riskLevel medium, label "Medium"
    await expect(page.getByText("Medium", { exact: true })).toBeVisible();
    await expect(page.getByText("50 / 100")).toBeVisible();

    // Findings check: URL_IP_HOST (fail), URL_NO_HTTPS (warn), URL_KEYWORDS (warn)
    await expect(page.getByText("URL_IP_HOST")).toBeVisible();
    await expect(page.getByText("URL_NO_HTTPS")).toBeVisible();
    await expect(page.getByText("URL_KEYWORDS")).toBeVisible();

    // Plain text invariant: submitted URL must NOT be an external link
    const link = page.locator("a[href='http://198.51.100.23/login']");
    expect(await link.count()).toBe(0);
  });

  // U2 — Normal URL
  test("Golden Journey U2 — Normal URL: https://example.com/", async ({ page }) => {
    await page.goto("/url-analyzer");
    const input = page.getByLabel(/URL to analyze/i);
    await input.fill("https://example.com/");

    const submitBtn = page.getByRole("button", { name: /^Analyze URL$/i });
    await submitBtn.click();

    const result = page.getByTestId("url-scan-result");
    await expect(result).toBeVisible({ timeout: 15_000 });

    // Assessment: score 0, none_detected, label "No suspicious signals detected"
    await expect(page.getByText("No suspicious signals detected").first()).toBeVisible();
    await expect(page.getByText("0 / 100")).toBeVisible();

    // Invariant: Never show "Safe"
    await expect(page.getByText(/^Safe$/i)).not.toBeVisible();
  });

  // P1 — Privacy Exposure
  test("Golden Journey P1 — Privacy exposure: Jane.Doe / jane_doe", async ({ page }) => {
    await page.goto("/privacy-analyzer");
    await expect(page.getByRole("heading", { name: "Privacy Exposure Analyzer", level: 1 })).toBeVisible();

    // Profile 1: GitHub / Jane.Doe / https://github.com/jane-doe
    await page.locator("#profiles\\.0\\.platform").fill("GitHub");
    await page.locator("#profiles\\.0\\.username").fill("Jane.Doe");
    await page.locator("#profiles\\.0\\.url").fill("https://github.com/jane-doe");

    // Add Profile 2: X / jane_doe
    await page.getByRole("button", { name: /Add another profile/i }).click();
    await page.locator("#profiles\\.1\\.platform").fill("X");
    await page.locator("#profiles\\.1\\.username").fill("jane_doe");

    // Submitted text with email and phone
    await page.getByLabel(/Text to analyze/i).fill("Reach me at jane.doe@example.com or +1 213 373 4253");

    // Consent
    const consentCheckbox = page.getByRole("checkbox", {
      name: /I confirm that I have the right to submit this information/i,
    });
    await consentCheckbox.check();

    // Submit
    const submitBtn = page.getByRole("button", { name: /^Analyze privacy exposure$/i });
    await submitBtn.click();

    // Verify result
    const result = page.getByTestId("privacy-scan-result");
    await expect(result).toBeVisible({ timeout: 15_000 });

    // Expected findings: reuse, email, phone, match
    await expect(page.getByText("PRIV_USERNAME_REUSE")).toBeVisible();
    await expect(page.getByText("PRIV_EMAIL_FOUND")).toBeVisible();
    await expect(page.getByText("PRIV_PHONE_FOUND")).toBeVisible();
    await expect(page.getByText("PRIV_USERNAME_MATCHES_EMAIL")).toBeVisible();

    // Masked evidence verification
    await expect(page.getByText("j***@example.com").first()).toBeVisible();
    await expect(page.getByText("+1 *** *** **53").first()).toBeVisible();

    // Invariant: raw contact information must NOT be present unmasked
    await expect(page.getByText("jane.doe@example.com")).not.toBeVisible();
    await expect(page.getByText("+1 213 373 4253")).not.toBeVisible();
  });

  // P2 — Normal Privacy Input
  test("Golden Journey P2 — Normal privacy input: alpha_dev / zeta42", async ({ page }) => {
    await page.goto("/privacy-analyzer");

    await page.locator("#profiles\\.0\\.platform").fill("GitHub");
    await page.locator("#profiles\\.0\\.username").fill("alpha_dev");

    await page.getByRole("button", { name: /Add another profile/i }).click();
    await page.locator("#profiles\\.1\\.platform").fill("Reddit");
    await page.locator("#profiles\\.1\\.username").fill("zeta42");

    await page.getByLabel(/Text to analyze/i).fill("Just a normal sentence.");
    const consentCheckbox = page.getByRole("checkbox", {
      name: /I confirm that I have the right to submit this information/i,
    });
    await consentCheckbox.check();

    const submitBtn = page.getByRole("button", { name: /^Analyze privacy exposure$/i });
    await submitBtn.click();

    const result = page.getByTestId("privacy-scan-result");
    await expect(result).toBeVisible({ timeout: 15_000 });

    // Assessment: none_detected, label "No exposure patterns detected"
    await expect(page.getByText("No exposure patterns detected").first()).toBeVisible();
  });

  // W1 — SSRF Blocked Targets
  test("Golden Journey W1 — SSRF-blocked inputs rejected with 422 TARGET_BLOCKED", async ({ page }) => {
    const blockedTargets = [
      "http://127.0.0.1",
      "http://[::1]",
      "http://2130706433",
      "http://169.254.169.254/latest/meta-data",
      "https://example.com:8443",
    ];

    for (const target of blockedTargets) {
      await page.goto("/website-auditor");
      const urlInput = page.getByLabel(/Target website URL/i);
      const authCheckbox = page.getByLabel("I own this site or have permission to assess it");
      const submitBtn = page.getByRole("button", { name: /^Audit website$/i });

      await urlInput.fill(target);
      await authCheckbox.check();
      await submitBtn.click();

      // Wait for error state
      await expect(page.getByText("Website audit could not be completed")).toBeVisible({ timeout: 15_000 });
      // Exact friendly copy
      await expect(
        page.getByText("This address cannot be audited because it is not a public website")
      ).toBeVisible();

      // Invariants: No internal IP details exposed
      await expect(page.getByText("127.0.0.1")).not.toBeVisible();
      await expect(page.getByText("169.254.169.254")).not.toBeVisible();
    }
  });

  // Cross-Feature Verification: Saved Report Reopening and Deletion
  test("Cross-feature verification — saved report reopening and owner deletion", async ({ page }) => {
    await page.goto("/url-analyzer");
    await page.getByLabel(/URL to analyze/i).fill("http://198.51.100.23/login");
    await page.getByRole("button", { name: /^Analyze URL$/i }).click();

    await expect(page.getByTestId("url-scan-result")).toBeVisible({ timeout: 15_000 });

    // Click "Open saved report"
    const openReportLink = page.getByRole("link", { name: /Open saved report/i }).first();
    await expect(openReportLink).toBeVisible();
    await openReportLink.click();

    // Verify saved report view
    await expect(page.getByText("Report ID:")).toBeVisible();
    await expect(page.getByText("Medium", { exact: true }).first()).toBeVisible();

    // Retention notice banner must be visible
    await expect(
      page.getByText(/Session storage & retention/i)
    ).toBeVisible();

    // Delete report with confirmation
    await page.getByRole("button", { name: /Delete report/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: /Delete report/i }).click();

    // Redirected to history
    await expect(page).toHaveURL(/\/history/);
  });
});
