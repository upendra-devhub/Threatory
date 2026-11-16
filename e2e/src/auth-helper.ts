import type { Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
}

export async function createAndLoginUser(page: Page, customEmail?: string): Promise<TestUser> {
  const email =
    customEmail ||
    `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`;
  const password = "TestPassword123!";

  const response = await page.request.post("/api/auth/signup", {
    data: { email, password },
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test user: ${response.status()} ${await response.text()}`);
  }

  return { email, password };
}
