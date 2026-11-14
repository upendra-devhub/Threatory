import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const partialFixturePath = path.resolve(
  __dirname,
  "../../packages/contracts/fixtures/website-report-partial.json"
);
const partialFixture = JSON.parse(fs.readFileSync(partialFixturePath, "utf-8"));

test.describe("Website Auditor End-to-End Journeys (CP-10 Task 5)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/website-auditor");
    await expect(
      page.getByRole("heading", { name: "Website Auditor", level: 1 })
    ).toBeVisible();
  });

  test("Journey 1 — Mandatory authorisation checkbox blocks form submission", async ({
    page,
  }) => {
    const urlInput = page.getByLabel(/Target website URL/i);
    const authCheckbox = page.getByLabel(
      "I own this site or have permission to assess it"
    );
    const submitBtn = page.getByRole("button", { name: /^Audit website$/i });

    await expect(urlInput).toBeVisible();
    await expect(authCheckbox).not.toBeChecked();

    // Type a URL but leave checkbox unticked
    await urlInput.fill("https://example.com");

    // Click submit
    await submitBtn.click();

    // Validation error should appear and block submission
    const errorMsg = page.getByText(
      "You must confirm authorisation to audit this website"
    );
    await expect(errorMsg).toBeVisible();

    // Verify no scan progress or result appears
    await expect(page.getByTestId("website-scan-progress")).not.toBeVisible();
    await expect(page.getByTestId("website-scan-result")).not.toBeVisible();
  });

  test("Journey 2 — Golden Input W1 blocked target (SSRF guard) with real backend", async ({
    page,
  }) => {
    const urlInput = page.getByLabel(/Target website URL/i);
    const authCheckbox = page.getByLabel(
      "I own this site or have permission to assess it"
    );
    const submitBtn = page.getByRole("button", { name: /^Audit website$/i });

    // Golden Input W1: Loopback address http://127.0.0.1
    await urlInput.fill("http://127.0.0.1");
    await authCheckbox.check();
    await expect(authCheckbox).toBeChecked();

    await submitBtn.click();

    // Wait for error state
    const errorTitle = page.getByText("Website audit could not be completed");
    await expect(errorTitle).toBeVisible({ timeout: 15_000 });

    // EXACT copy required by the project brief:
    const exactBlockedMessage = page.getByText(
      "This address cannot be audited because it is not a public website"
    );
    await expect(exactBlockedMessage).toBeVisible();

    // Invariant: No internal IP or server details leaked in copy
    await expect(page.getByText("eth0")).not.toBeVisible();
    await expect(page.getByText("loopback")).not.toBeVisible();

    // Retry button is available
    await expect(page.getByRole("button", { name: /Retry audit/i })).toBeVisible();
  });

  test("Journey 3 — Mocked-backend partial result with unassessed checks and banner", async ({
    page,
  }) => {
    // Intercept POST /api/scans/website with the partial contract fixture
    await page.route("**/api/scans/website", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: partialFixture,
        }),
      });
    });

    const urlInput = page.getByLabel(/Target website URL/i);
    const authCheckbox = page.getByLabel(
      "I own this site or have permission to assess it"
    );
    const submitBtn = page.getByRole("button", { name: /^Audit website$/i });

    await urlInput.fill("https://degraded-site.example.org");
    await authCheckbox.check();
    await submitBtn.click();

    // Wait for the report result
    const resultContainer = page.getByTestId("website-scan-result");
    await expect(resultContainer).toBeVisible({ timeout: 15_000 });

    // 1. Partial banner naming unassessed check
    const banner = page.getByTestId("partial-scan-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("SITE_DMARC");

    // 2. Groups render as Connection and TLS, HTTP headers, Cookies, DNS and email
    await expect(page.getByRole("heading", { name: "HTTP headers", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "DNS and email", level: 3 })).toBeVisible();

    // 3. not_assessed outcome is visible and clearly distinct from pass
    const notAssessedBadge = page.locator("[data-outcome='not_assessed']");
    await expect(notAssessedBadge).toBeVisible();
    await expect(notAssessedBadge).toContainText("Not assessed");

    // 4. Certificate summary card is present
    await expect(page.getByTestId("certificate-summary-card")).toBeVisible();

    // 5. Invariant: Target summary is strictly plain text and NOT a clickable link
    const targetText = page.getByTestId("scanned-website-text");
    await expect(targetText).toHaveText("https://degraded-site.example.org");

    const linksToTarget = page.locator("a[href*='degraded-site.example.org']");
    await expect(linksToTarget).toHaveCount(0);
  });

  test("Journey 4 — Navigation and responsive layout", async ({ page }) => {
    // Navigate via primary sidebar navigation
    await page.goto("/");
    const navLink = page.getByRole("link", { name: "Website Auditor" });
    await expect(navLink).toBeVisible();
    await navLink.click();

    await expect(page).toHaveURL(/\/website-auditor/);
    await expect(
      page.getByRole("heading", { name: "Website Auditor", level: 1 })
    ).toBeVisible();

    // Verify scope notice and form on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByTestId("website-scope-notice")).toBeVisible();
    await expect(page.getByTestId("website-scan-form")).toBeVisible();
    await expect(
      page.getByLabel("I own this site or have permission to assess it")
    ).toBeVisible();
  });
});
