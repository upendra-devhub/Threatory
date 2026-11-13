import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { URLAnalyzerView } from "@/features/url/components/URLAnalyzerView";
import {
  ApiClientError,
  ApiNetworkError,
  ApiTimeoutError,
} from "@/lib/api-client";
import * as apiClient from "@/lib/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Report } from "@threatory/contracts";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

describe("URL Analyzer error handling and retry behaviour (Task 5)", () => {
  it("handles HTTP 400 validation error by displaying field-level message and preserving input", async () => {
    const user = userEvent.setup();
    const submitSpy = vi.spyOn(apiClient, "submitUrlScan").mockRejectedValueOnce(
      new ApiClientError({
        code: "VALIDATION_ERROR",
        status: 400,
        serverMessage: "Unsupported scheme: ftp. Only http:// and https:// are supported.",
        fields: [
          {
            path: "url",
            message: "Unsupported scheme: ftp. Only http:// and https:// are supported.",
          },
        ],
      })
    );

    renderWithClient(<URLAnalyzerView />);

    const input = screen.getByLabelText(/URL to analyze/i);
    await user.clear(input);
    await user.type(input, "ftp://example.com");

    const submitBtn = screen.getByRole("button", { name: /^Analyze URL$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Unsupported scheme: ftp. Only http:\/\/ and https:\/\/ are supported./i)
      ).toBeInTheDocument();
    });

    // Input remains populated
    expect(input).toHaveValue("ftp://example.com");

    submitSpy.mockRestore();
  });

  it("handles HTTP 429 rate limit response and preserves entered value", async () => {
    const user = userEvent.setup();
    const submitSpy = vi.spyOn(apiClient, "submitUrlScan").mockRejectedValueOnce(
      new ApiClientError({
        code: "RATE_LIMITED",
        status: 429,
        serverMessage: "Too many requests. Try again later.",
      })
    );

    renderWithClient(<URLAnalyzerView />);

    const input = screen.getByLabelText(/URL to analyze/i);
    await user.type(input, "https://example.com/check-rate");

    const submitBtn = screen.getByRole("button", { name: /^Analyze URL$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Too many URL analysis requests\. Please try again shortly\./i)
      ).toBeInTheDocument();
    });

    expect(input).toHaveValue("https://example.com/check-rate");

    submitSpy.mockRestore();
  });

  it("handles HTTP 500 internal server error with user-friendly copy and manual retry", async () => {
    const user = userEvent.setup();
    const mockSuccessReport: Report = {
      scanId: "scan-retry-success-1",
      module: "url",
      status: "completed",
      rulesVersion: "url-1.0.0",
      targetSummary: "https://example.com/recover",
      assessment: {
        riskLevel: "none_detected",
        label: "No suspicious signals detected",
        score: 0,
        scoreMeaning: "No suspicious signals detected",
      },
      findings: [],
      limitations: ["Link not visited"],
      details: { host: "example.com" },
      createdAt: "2026-11-13T12:00:00.000Z",
    };

    const submitSpy = vi
      .spyOn(apiClient, "submitUrlScan")
      .mockRejectedValueOnce(
        new ApiClientError({
          code: "INTERNAL",
          status: 500,
          serverMessage: "Database connection failed",
        })
      )
      .mockResolvedValueOnce(mockSuccessReport);

    renderWithClient(<URLAnalyzerView />);

    const input = screen.getByLabelText(/URL to analyze/i);
    await user.type(input, "https://example.com/recover");

    const submitBtn = screen.getByRole("button", { name: /^Analyze URL$/i });
    await user.click(submitBtn);

    // Shows user-friendly message, does not expose raw server message "Database connection failed"
    await waitFor(() => {
      expect(
        screen.getByText(/An unexpected server error occurred while analyzing the URL\. Please try again\./i)
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Database connection failed/i)).not.toBeInTheDocument();
    expect(input).toHaveValue("https://example.com/recover");

    // Click retry
    const retryBtn = screen.getByRole("button", { name: /Retry analysis/i });
    await user.click(retryBtn);

    // Verifies successful recovery
    await waitFor(() => {
      expect(screen.getByTestId("url-scan-result")).toBeInTheDocument();
      expect(screen.getByText("scan-retry-success-1")).toBeInTheDocument();
    });

    expect(submitSpy).toHaveBeenCalledTimes(2);
    submitSpy.mockRestore();
  });

  it("handles request timeout and allows manual retry", async () => {
    const user = userEvent.setup();
    const submitSpy = vi
      .spyOn(apiClient, "submitUrlScan")
      .mockRejectedValueOnce(new ApiTimeoutError());

    renderWithClient(<URLAnalyzerView />);

    const input = screen.getByLabelText(/URL to analyze/i);
    await user.type(input, "https://example.com/timeout-test");

    const submitBtn = screen.getByRole("button", { name: /^Analyze URL$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/The analysis request timed out\. Please check your connection and try again\./i)
      ).toBeInTheDocument();
    });

    expect(input).toHaveValue("https://example.com/timeout-test");
    expect(screen.getByRole("button", { name: /Retry analysis/i })).toBeInTheDocument();

    submitSpy.mockRestore();
  });

  it("handles network failure and allows manual retry", async () => {
    const user = userEvent.setup();
    const submitSpy = vi
      .spyOn(apiClient, "submitUrlScan")
      .mockRejectedValueOnce(new ApiNetworkError());

    renderWithClient(<URLAnalyzerView />);

    const input = screen.getByLabelText(/URL to analyze/i);
    await user.type(input, "https://example.com/network-test");

    const submitBtn = screen.getByRole("button", { name: /^Analyze URL$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Unable to connect to the Threatory API\. Please check your connection and try again\./i)
      ).toBeInTheDocument();
    });

    expect(input).toHaveValue("https://example.com/network-test");
    expect(screen.getByRole("button", { name: /Retry analysis/i })).toBeInTheDocument();

    submitSpy.mockRestore();
  });
});
