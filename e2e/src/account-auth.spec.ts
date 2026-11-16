import { test, expect } from "@playwright/test";

test.describe("CP-13 User Journeys: Account System, Landing Page & Ownership (S1–S6)", () => {
  const timestamp = Date.now();

  // Journey S1 — Sign up and first dashboard view
  test("Journey S1 — Sign up and first dashboard view", async ({ page }) => {
    // 1. Visit /
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /see what a link, a profile or a website/i })).toBeVisible();

    // 2. Click the sign-up call to action
    const getStartedLink = page.getByRole("link", { name: /get started/i }).first();
    await getStartedLink.click();
    await expect(page).toHaveURL("/signup");
    await expect(page.getByRole("heading", { name: /create.*account/i })).toBeVisible();

    // 3. Complete registration with a new valid email and password
    const testEmail = `s1-user-${timestamp}@example.com`;
    await page.getByLabel(/^email$/i).fill(testEmail);
    await page.getByLabel(/^password$/i).fill("SecurePassword123!");
    await page.getByRole("button", { name: /create account/i }).click();

    // 4. Verify landing on /dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 15_000 });

    // 5. Verify clean first-use empty state with the three tool choices
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Run your first scan" })).toBeVisible();
    await expect(page.getByText("Pick a tool to get started. Your reports are saved to your account.")).toBeVisible();

    await expect(page.getByRole("heading", { name: "URL Analyzer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Privacy Analyzer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Website Auditor" })).toBeVisible();

    // 6. Verify no synthetic records, zeroed metrics or sample charts appear
    await expect(page.getByTestId("stat-total-scans")).toHaveCount(0);
    await expect(page.getByTestId("recent-scans-table")).toHaveCount(0);
  });

  // Journey S2 — Persistent session across reloads
  test("Journey S2 — Persistent session across reloads", async ({ page }) => {
    const testEmail = `s2-user-${timestamp}@example.com`;
    const password = "SecurePassword123!";

    // Sign up
    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill(testEmail);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/dashboard");

    // 1. Reload page while signed in
    await page.reload();

    // 2. Verify session persists
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(page.getByText(testEmail)).toBeVisible();

    // 3. Navigate between pages
    const routes = ["/url-analyzer", "/privacy-analyzer", "/website-auditor", "/history"];
    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL(route);
      expect(page.url()).not.toContain("/signin");
      await expect(page.getByText(testEmail)).toBeVisible();
    }
  });

  // Journey S3 — Sign out and route protection
  test("Journey S3 — Sign out and route protection", async ({ page }) => {
    const testEmail = `s3-user-${timestamp}@example.com`;
    const password = "SecurePassword123!";

    // Sign up
    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill(testEmail);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/dashboard");

    // 1. Sign out using the sign-out action
    const signOutBtn = page.getByRole("button", { name: /sign out/i });
    await signOutBtn.click();

    // 2. Verify redirection away from the protected area
    await expect(page).toHaveURL(/\/signin/);

    // 3. Attempt direct navigation to /dashboard
    await page.goto("/dashboard");

    // 4. Verify redirection to /signin?next=%2Fdashboard
    await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard/);

    // 5. Verify protected data is not accessible without authenticating
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
  });

  // Journey S4 — Report ownership and user isolation
  test("Journey S4 — Report ownership and user isolation", async ({ page }) => {
    const userAEmail = `userA-${timestamp}@example.com`;
    const userBEmail = `userB-${timestamp}@example.com`;
    const password = "SecurePassword123!";

    // 1. User A signs in and runs a URL scan
    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill(userAEmail);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/dashboard");

    // Run URL scan
    await page.goto("/url-analyzer");
    await page.getByRole("button", { name: /Example 1 — U1/i }).click();
    await page.getByRole("button", { name: /^Analyze URL$/i }).click();

    const result = page.getByTestId("url-scan-result");
    await expect(result).toBeVisible({ timeout: 15_000 });

    // 2. Verify report appears in User A's history and grab scan link
    await page.goto("/history");
    const scanRow = page.getByTestId("history-table-row").first();
    await expect(scanRow).toBeVisible();
    await expect(scanRow).toContainText("198.51.100.23/login");

    const viewReportLink = scanRow.getByRole("link", { name: /view report/i });
    const reportHref = await viewReportLink.getAttribute("href");
    expect(reportHref).toBeTruthy();

    // 3. User A signs out
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/signin/);

    // 4. User B signs up
    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill(userBEmail);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/dashboard");

    // 5. Verify User B cannot see User A's report in /history
    await page.goto("/history");
    await expect(page.getByText("No scans yet")).toBeVisible();
    await expect(page.getByText("198.51.100.23/login")).toHaveCount(0);

    // 6. User B attempts direct navigation to User A's report URL
    await page.goto(reportHref!);

    // 7. Verify User B receives a 404 / not-found state, NOT User A's report
    await expect(page.getByText(/Unable to load report|could not be found/i)).toBeVisible();
    await expect(page.getByText("URL_IP_HOST")).toHaveCount(0);
  });

  // Journey S5 — Account deletion
  test("Journey S5 — Account deletion", async ({ page }) => {
    const testEmail = `s5-delete-${timestamp}@example.com`;
    const password = "SecurePassword123!";

    // 1. User creates an account and runs a scan
    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill(testEmail);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/dashboard");

    // Run a quick scan
    await page.goto("/url-analyzer");
    await page.getByRole("button", { name: /Example 2 — U2/i }).click();
    await page.getByRole("button", { name: /^Analyze URL$/i }).click();
    await expect(page.getByTestId("url-scan-result")).toBeVisible({ timeout: 15_000 });

    // 2. User requests account deletion via API
    const deleteRes = await page.request.delete("/api/auth/me");
    expect(deleteRes.ok()).toBe(true);

    // 3. Verify previous session cookie no longer authenticates
    const meRes = await page.request.get("/api/auth/me");
    expect(meRes.status()).toBe(401);

    // 4. Visiting /dashboard redirects to /signin
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard/);
  });

  // Journey S6 — Re-login with existing account
  test("Journey S6 — Re-login with existing account", async ({ page }) => {
    const testEmail = `s6-relogin-${timestamp}@example.com`;
    const password = "SecurePassword123!";

    // Create account
    await page.goto("/signup");
    await page.getByLabel(/^email$/i).fill(testEmail);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/dashboard");

    // Run a scan so history has a report
    await page.goto("/url-analyzer");
    await page.getByRole("button", { name: /Example 1 — U1/i }).click();
    await page.getByRole("button", { name: /^Analyze URL$/i }).click();
    await expect(page.getByTestId("url-scan-result")).toBeVisible({ timeout: 15_000 });

    // 1. Sign out
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/signin/);

    // Navigate to /signin cleanly
    await page.goto("/signin");

    // 2. Sign back in using valid credentials
    await page.getByLabel(/^email$/i).fill(testEmail);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    // 3. Verify landing on /dashboard
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText(testEmail)).toBeVisible();

    // 4. Verify existing reports remain visible in history
    await page.goto("/history");
    const scanRow = page.getByTestId("history-table-row").first();
    await expect(scanRow).toBeVisible();
    await expect(scanRow).toContainText("198.51.100.23/login");
  });
});
