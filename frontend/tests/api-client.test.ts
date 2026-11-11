import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  ApiNetworkError,
  ApiTimeoutError,
  checkApiHealth,
  FRIENDLY_ERROR_MESSAGES,
  getReport,
  UnexpectedResponseError,
} from "../src/lib/api-client";
import { loadErrorFixture, loadReportFixture } from "./test-utils";

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api-client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("retrieves and validates a saved report using a relative /api/... path with credentials", async () => {
    const fixture = loadReportFixture("url-report-completed.json");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse({ success: true, data: fixture }, 200));

    const report = await getReport("scan-url-001");

    expect(report).toEqual(fixture);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [requestUrl, init] = fetchSpy.mock.calls[0] ?? [];
    expect(requestUrl).toBe("/api/scans/scan-url-001");
    expect(init?.credentials).toBe("include");
  });

  it("URL-encodes scanId parameters safely", async () => {
    const fixture = loadReportFixture("privacy-report-completed.json");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockJsonResponse({ success: true, data: fixture }, 200));

    await getReport("scan id/with?chars");

    const [requestUrl] = fetchSpy.mock.calls[0] ?? [];
    expect(requestUrl).toBe("/api/scans/scan%20id%2Fwith%3Fchars");
  });

  it("maps valid API error responses for NOT_FOUND, RATE_LIMITED, INTERNAL, VALIDATION_ERROR, TARGET_BLOCKED, and UPSTREAM_FAILURE", async () => {
    const notFoundFixture = loadErrorFixture("error-not-found.json");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(notFoundFixture, 404));

    await expect(getReport("missing-id")).rejects.toMatchObject({
      name: "ApiClientError",
      code: "NOT_FOUND",
      status: 404,
      message: FRIENDLY_ERROR_MESSAGES.NOT_FOUND,
      serverMessage: notFoundFixture.error.message,
    });

    const rateLimitFixture = loadErrorFixture("error-rate-limit.json");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(rateLimitFixture, 429));

    await expect(getReport("scan-url-001")).rejects.toMatchObject({
      name: "ApiClientError",
      code: "RATE_LIMITED",
      status: 429,
      message: FRIENDLY_ERROR_MESSAGES.RATE_LIMITED,
    });

    const validationFixture = loadErrorFixture("error-validation.json");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(validationFixture, 400));

    await expect(getReport("scan-url-001")).rejects.toMatchObject({
      name: "ApiClientError",
      code: "VALIDATION_ERROR",
      status: 400,
      message: FRIENDLY_ERROR_MESSAGES.VALIDATION_ERROR,
      fields: validationFixture.error.fields,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse(
        {
          success: false,
          error: { code: "INTERNAL", message: "Mongo query exploded with stack detail" },
        },
        500
      )
    );

    const internalErr = await getReport("scan-url-001").catch((err: unknown) => err);
    expect(internalErr).toBeInstanceOf(ApiClientError);
    expect((internalErr as ApiClientError).code).toBe("INTERNAL");
    expect((internalErr as ApiClientError).status).toBe(500);
    expect((internalErr as ApiClientError).message).toBe(FRIENDLY_ERROR_MESSAGES.INTERNAL);
    expect((internalErr as ApiClientError).message).not.toContain("Mongo");
  });

  it("throws UnexpectedResponseError on invalid JSON responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>502 Bad Gateway</html>", { status: 502 })
    );

    await expect(getReport("scan-url-001")).rejects.toBeInstanceOf(UnexpectedResponseError);
  });

  it("throws UnexpectedResponseError on malformed success payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse({ success: true, data: { scanId: "broken-report" } }, 200)
    );

    await expect(getReport("broken-report")).rejects.toBeInstanceOf(UnexpectedResponseError);
  });

  it("throws UnexpectedResponseError on malformed error payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJsonResponse({ error: "unexpected string" }, 500)
    );

    await expect(getReport("scan-url-001")).rejects.toBeInstanceOf(UnexpectedResponseError);
  });

  it("throws ApiNetworkError on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(getReport("scan-url-001")).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it("throws ApiTimeoutError when the request exceeds timeoutMs", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const promise = getReport("scan-url-001", { timeoutMs: 250 });
    const expectation = expect(promise).rejects.toBeInstanceOf(ApiTimeoutError);
    await vi.advanceTimersByTimeAsync(300);
    await expectation;
  });

  it("checks backend health via relative /api/health with credentials and handles unavailable states", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        mockJsonResponse({ status: "ok", timestamp: "2026-11-11T16:30:00.000Z" }, 200)
      );

    const healthy = await checkApiHealth();
    expect(healthy).toEqual({ available: true, timestamp: "2026-11-11T16:30:00.000Z" });
    const [healthUrl, healthInit] = fetchSpy.mock.calls[0] ?? [];
    expect(healthUrl).toBe("/api/health");
    expect(healthInit?.credentials).toBe("include");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse({ status: "down" }, 503));
    expect(await checkApiHealth()).toEqual({ available: false });

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Network error"));
    expect(await checkApiHealth()).toEqual({ available: false });
  });
});

