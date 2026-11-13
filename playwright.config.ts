import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/src",
  testMatch: "**/*.spec.ts",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npx tsx backend/tests/e2e-server.ts",
      url: "http://127.0.0.1:4001/api/health",
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: "test",
        PORT: "4001",
        FRONTEND_ORIGIN: "http://localhost:3000",
      },
    },
    {
      command: "npm run dev -w frontend",
      url: "http://localhost:3000",
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        API_ORIGIN: "http://127.0.0.1:4001",
        PORT: "3000",
      },
    },
  ],
});
