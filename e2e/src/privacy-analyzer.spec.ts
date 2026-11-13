import { test, expect } from "@playwright/test";

test.describe("Privacy Analyzer End-to-End Journeys (Task 6)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/privacy-analyzer");
    await expect(
      page.getByRole("heading", { name: "Privacy Exposure Analyzer", level: 1 })
    ).toBeVisible();
  });

  test("Journey 1 — Golden Input P1 privacy analysis, masked results, and report reload persistence", async ({
    page,
  }) => {
    // 1. Profile 1: GitHub / Jane.Doe / https://github.com/jane-doe
    const platform0 = page.locator("#profiles\\.0\\.platform");
    const username0 = page.locator("#profiles\\.0\\.username");
    const url0 = page.locator("#profiles\\.0\\.url");

    await platform0.fill("GitHub");
    await username0.fill("Jane.Doe");
    await url0.fill("https://github.com/jane-doe");

    // 2. Add Profile 2: X / jane_doe
    await page.getByRole("button", { name: /Add another profile/i }).click();

    const platform1 = page.locator("#profiles\\.1\\.platform");
    const username1 = page.locator("#profiles\\.1\\.username");

    await platform1.fill("X");
    await username1.fill("jane_doe");

    // 3. Submitted text containing raw sensitive email and phone (P1 input)
    const submittedText = page.getByLabel(/Text to analyze/i);
    const rawEmail = "jane.doe@example.com";
    const rawPhone = "+1 213 373 4253";
    await submittedText.fill(`Reach me at ${rawEmail} or ${rawPhone}`);

    // Verify character counter works
    const charCounter = page.getByTestId("char-counter");
    await expect(charCounter).toContainText("51 / 10,000 characters");

    // 4. Consent checkbox
    const consentCheckbox = page.getByRole("checkbox", {
      name: /I confirm that I have the right to submit this information/i,
    });
    await expect(consentCheckbox).not.toBeChecked();

    const submitBtn = page.getByRole("button", { name: /^Analyze privacy exposure$/i });
    await expect(submitBtn).toBeDisabled();

    await consentCheckbox.check();
    await expect(submitBtn).toBeEnabled();

    // 5. Intercept scan request briefly to ensure progress indicator is observed
    await page.route("**/api/scans/privacy", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });

    // 6. Submit for analysis
    await submitBtn.click();

    // Verify progress state appears
    await expect(page.getByTestId("privacy-scan-progress")).toBeVisible();

    // 7. Wait for the report result
    const resultContainer = page.getByTestId("privacy-scan-result");
    await expect(resultContainer).toBeVisible({ timeout: 15_000 });
    await page.unroute("**/api/scans/privacy");

    // Verify assessment: medium risk level, label "4 exposure signals found"
    await expect(page.getByText(/Risk level: Medium risk/i)).toBeVisible();
    await expect(page.getByText("4 exposure signals found")).toBeVisible();

    // Verify no numeric score box is rendered (privacy module rule)
    await expect(page.locator('text="/ 100"')).toHaveCount(0);

    // Verify findings are rendered
    await expect(page.getByText("PRIV_USERNAME_REUSE")).toBeVisible();
    await expect(page.getByText("PRIV_EMAIL_FOUND")).toBeVisible();
    await expect(page.getByText("PRIV_PHONE_FOUND")).toBeVisible();
    await expect(page.getByText("PRIV_USERNAME_MATCHES_EMAIL")).toBeVisible();

    // Verify masked evidence appears
    await expect(page.getByText("j***@example.com").first()).toBeVisible();
    await expect(page.getByText("+1 *** *** **53").first()).toBeVisible();

    // CRITICAL: Raw email and phone MUST NOT appear in the rendered result DOM
    const resultHtml = await resultContainer.innerHTML();
    expect(resultHtml).not.toContain(rawEmail);
    expect(resultHtml).not.toContain("373 4253");

    // Verify "What was not checked" limitations panel is visible
    await expect(
      page.getByRole("heading", { name: "What was not checked" })
    ).toBeVisible();
    await expect(
      page.getByText(/Only information explicitly supplied by the user was analysed/i)
    ).toBeVisible();

    // 8. Open saved report navigation and reload persistence
    const openReportLink = page.getByRole("link", { name: /Open saved report/i }).first();
    await expect(openReportLink).toBeVisible();

    const href = await openReportLink.getAttribute("href");
    expect(href).toMatch(/^\/reports\/scan-priv-/);
    const scanId = href?.replace("/reports/", "");

    await openReportLink.click();
    await page.waitForURL(`**/reports/${scanId}`);

    // Confirm that the saved report page is rendered from CP-02 GET endpoint
    await expect(page.getByText(scanId!)).toBeVisible();
    await expect(
      page.locator("#main-content").getByText("Privacy Analyzer", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("4 exposure signals found")).toBeVisible();
    await expect(page.getByText("j***@example.com").first()).toBeVisible();
    await expect(page.getByText("+1 *** *** **53").first()).toBeVisible();

    // Refresh the page in the same browser context (owner cookie retained)
    await page.reload();

    // Confirm the report is still accessible after reload and matches
    await expect(page.getByText(scanId!)).toBeVisible();
    await expect(
      page.locator("#main-content").getByText("Privacy Analyzer", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("4 exposure signals found")).toBeVisible();
    await expect(page.getByText("j***@example.com").first()).toBeVisible();

    // Assert raw values never leak into the reloaded report page
    const reloadedContent = await page.content();
    expect(reloadedContent).not.toContain(rawEmail);
    expect(reloadedContent).not.toContain("373 4253");
  });

  test("Journey 2 — Golden Input P2 clean profiles with no exposure patterns", async ({
    page,
  }) => {
    // Fill P2 profiles
    await page.locator("#profiles\\.0\\.platform").fill("GitHub");
    await page.locator("#profiles\\.0\\.username").fill("alpha_dev");

    await page.getByRole("button", { name: /Add another profile/i }).click();

    await page.locator("#profiles\\.1\\.platform").fill("Reddit");
    await page.locator("#profiles\\.1\\.username").fill("zeta42");

    await page.getByLabel(/Text to analyze/i).fill("Just a normal sentence.");

    // Consent
    await page
      .getByRole("checkbox", {
        name: /I confirm that I have the right to submit this information/i,
      })
      .check();

    // Submit
    await page.getByRole("button", { name: /^Analyze privacy exposure$/i }).click();

    // Wait for result
    const resultContainer = page.getByTestId("privacy-scan-result");
    await expect(resultContainer).toBeVisible({ timeout: 15_000 });

    // Verify assessment label: strictly "No exposure patterns detected"
    await expect(page.getByText(/Risk level: None detected/i)).toBeVisible();
    await expect(
      page.getByText("No exposure patterns detected", { exact: true })
    ).toBeVisible();

    // Ensure it NEVER displays "Safe"
    const safeBadge = page.locator('text="Safe"');
    await expect(safeBadge).toHaveCount(0);

    // Verify no score is shown
    await expect(page.locator('text="/ 100"')).toHaveCount(0);
  });

  test("Journey 3 — Mandatory consent checkbox blocks submission", async ({ page }) => {
    await page.locator("#profiles\\.0\\.platform").fill("GitHub");
    await page.locator("#profiles\\.0\\.username").fill("test_user");

    const submitBtn = page.getByRole("button", { name: /^Analyze privacy exposure$/i });
    const consentCheckbox = page.getByRole("checkbox", {
      name: /I confirm that I have the right to submit this information/i,
    });

    // Consent not checked -> button is disabled
    await expect(consentCheckbox).not.toBeChecked();
    await expect(submitBtn).toBeDisabled();

    // Attempting to click disabled button does nothing
    await submitBtn.click({ force: true });
    await expect(page.getByTestId("privacy-scan-result")).toHaveCount(0);

    // Check consent -> button enabled
    await consentCheckbox.check();
    await expect(submitBtn).toBeEnabled();

    // Uncheck consent -> button disabled again
    await consentCheckbox.uncheck();
    await expect(submitBtn).toBeDisabled();
  });

  test("Journey 4 — Dynamic profile rows (add, remove, and 10 row limit)", async ({
    page,
  }) => {
    // 1 row by default
    await expect(page.locator('[data-testid^="profile-row-"]')).toHaveCount(1);
    await expect(page.getByText("1 / 10 profiles")).toBeVisible();

    // Remove button is not rendered on a single row (cannot remove when 1 row)
    const deleteBtn = page.getByRole("button", { name: /Remove profile/i });
    await expect(deleteBtn).toHaveCount(0);

    // Add up to 10 rows
    const addBtn = page.getByRole("button", { name: /Add another profile/i });
    for (let i = 1; i < 10; i++) {
      await addBtn.click();
    }

    await expect(page.locator('[data-testid^="profile-row-"]')).toHaveCount(10);
    await expect(page.getByText("10 / 10 profiles")).toBeVisible();
    await expect(addBtn).toBeDisabled();

    // Remove row 10
    const removeBtns = page.getByRole("button", { name: /Remove profile/i });
    await removeBtns.last().click();

    await expect(page.locator('[data-testid^="profile-row-"]')).toHaveCount(9);
    await expect(page.getByText("9 / 10 profiles")).toBeVisible();
    await expect(addBtn).toBeEnabled();
  });

  test("Journey 5 — Input values preserved on validation error", async ({ page }) => {
    const platformInput = page.locator("#profiles\\.0\\.platform");
    const usernameInput = page.locator("#profiles\\.0\\.username");
    const urlInput = page.locator("#profiles\\.0\\.url");
    const textInput = page.getByLabel(/Text to analyze/i);

    await platformInput.clear();
    await platformInput.fill("GitHub");
    await usernameInput.fill("preserved_user");
    await urlInput.fill("invalid-url-format");
    await textInput.fill("Preserved raw text");

    await page
      .getByRole("checkbox", {
        name: /I confirm that I have the right to submit this information/i,
      })
      .check();

    const submitBtn = page.getByRole("button", { name: /^Analyze privacy exposure$/i });
    await submitBtn.click();

    // Validation error appears for invalid URL format
    await expect(page.getByText(/Invalid URL format/i)).toBeVisible();

    // Form inputs must remain preserved
    await expect(platformInput).toHaveValue("GitHub");
    await expect(usernameInput).toHaveValue("preserved_user");
    await expect(urlInput).toHaveValue("invalid-url-format");
    await expect(textInput).toHaveValue("Preserved raw text");
  });

  test("Journey 6 — Browser storage invariant and no password input", async ({ page }) => {
    // Strictly verify no input[type="password"] exists anywhere on the page
    const passwordInputs = page.locator('input[type="password"]');
    await expect(passwordInputs).toHaveCount(0);

    // Type sensitive values
    await page.locator("#profiles\\.0\\.platform").fill("GitHub");
    await page.locator("#profiles\\.0\\.username").fill("SecretUser123");
    await page.getByLabel(/Text to analyze/i).fill("Sensitive test content");

    // Check localStorage and sessionStorage in the browser page
    const storageCheck = await page.evaluate(() => {
      const localContent = JSON.stringify(localStorage);
      const sessionContent = JSON.stringify(sessionStorage);
      return {
        localHasData: localContent.includes("SecretUser123"),
        sessionHasData: sessionContent.includes("SecretUser123"),
      };
    });

    expect(storageCheck.localHasData).toBe(false);
    expect(storageCheck.sessionHasData).toBe(false);
  });

  test("Journey 7 — Responsive mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Confirm heading and scope notice
    await expect(
      page.getByRole("heading", { name: "Privacy Exposure Analyzer", level: 1 })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Privacy analysis scope notice" })
    ).toBeVisible();

    // Dynamic row addition on mobile
    await page.getByRole("button", { name: /Add another profile/i }).click();
    await expect(page.locator('[data-testid^="profile-row-"]')).toHaveCount(2);

    // Consent checkbox accessible
    const consent = page.getByRole("checkbox", {
      name: /I confirm that I have the right to submit this information/i,
    });
    await expect(consent).toBeVisible();

    // Submit button visible
    await expect(
      page.getByRole("button", { name: /^Analyze privacy exposure$/i })
    ).toBeVisible();
  });
});
