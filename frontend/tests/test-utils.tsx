import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ApiError, Report } from "@threatory/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect } from "vitest";
import { axe } from "vitest-axe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../../packages/contracts/fixtures");

export const REPORT_FIXTURE_FILES = [
  "url-report-completed.json",
  "url-report-partial.json",
  "url-report-failed.json",
  "privacy-report-completed.json",
  "privacy-report-partial.json",
  "privacy-report-failed.json",
  "website-report-completed.json",
  "website-report-partial.json",
  "website-report-failed.json",
] as const;

export function loadRawFixture(filename: string): unknown {
  const filePath = path.join(FIXTURES_DIR, filename);
  return JSON.parse(readFileSync(filePath, "utf-8")) as unknown;
}

export function loadReportFixture(filename: string): Report {
  return Report.parse(loadRawFixture(filename));
}

export function loadErrorFixture(filename: string): ApiError {
  return ApiError.parse(loadRawFixture(filename));
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithQuery(
  ui: ReactNode,
  queryClient: QueryClient = createTestQueryClient()
): RenderResult & { queryClient: QueryClient } {
  const result = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
  return { ...result, queryClient };
}

export async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container);
  expect(results.violations).toEqual([]);
}

