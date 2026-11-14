import {
  ApiError,
  ApiSuccess,
  HistoryPage,
  Module,
  PrivacyScanRequest,
  Report,
  UrlScanRequest,
  WebsiteScanRequest,
} from "@threatory/contracts";
import { z } from "zod";

export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_WEBSITE_REQUEST_TIMEOUT_MS = 30_000;
export const DEFAULT_HEALTH_TIMEOUT_MS = 5_000;

export type ApiErrorCode = ApiError["error"]["code"];
export type ApiErrorField = NonNullable<ApiError["error"]["fields"]>[number];

export const FRIENDLY_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR:
    "The request could not be processed because the supplied information was invalid.",
  NOT_FOUND: "The requested report could not be found.",
  TARGET_BLOCKED: "This address cannot be audited because it is not a public website",
  RATE_LIMITED: "Too many requests. Try again later.",
  INTERNAL: "Something went wrong while processing the request.",
  UPSTREAM_FAILURE: "A required external service could not complete the operation.",
};

export interface ApiClientErrorOptions {
  code: ApiErrorCode;
  status: number;
  serverMessage: string;
  fields?: ApiErrorField[];
}

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields?: ApiErrorField[];
  readonly serverMessage: string;

  constructor({ code, status, serverMessage, fields }: ApiClientErrorOptions) {
    super(FRIENDLY_ERROR_MESSAGES[code]);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.serverMessage = serverMessage;
    this.fields = fields;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

export class UnexpectedResponseError extends Error {
  readonly status?: number;

  constructor(message = "Received an unexpected response from the server.", status?: number) {
    super(message);
    this.name = "UnexpectedResponseError";
    this.status = status;
    Object.setPrototypeOf(this, UnexpectedResponseError.prototype);
  }
}

export class ApiTimeoutError extends Error {
  constructor(message = "The request timed out. Please try again.") {
    super(message);
    this.name = "ApiTimeoutError";
    Object.setPrototypeOf(this, ApiTimeoutError.prototype);
  }
}

export class ApiNetworkError extends Error {
  constructor(message = "Unable to connect to the Threatory API. Please try again.") {
    super(message);
    this.name = "ApiNetworkError";
    Object.setPrototypeOf(this, ApiNetworkError.prototype);
  }
}

export interface ApiRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  method?: "GET" | "POST" | "DELETE" | "PUT";
  body?: string;
  headers?: Record<string, string>;
}

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string().min(1),
});

export type HealthStatusResult =
  | { available: true; timestamp: string }
  | { available: false };

export const queryKeys = {
  report: (scanId: string) => ["report", scanId] as const,
  health: () => ["api-health"] as const,
  urlScan: () => ["url-scan"] as const,
  privacyScan: () => ["privacy-scan"] as const,
  websiteScan: () => ["website-scan"] as const,
  history: (params: HistoryQueryParams = {}) => ["history", params] as const,
};

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function performRelativeFetch(
  path: string,
  options: ApiRequestOptions & { defaultTimeoutMs: number }
): Promise<Response> {
  if (!path.startsWith("/api/")) {
    throw new Error(`API requests must use a relative /api/... path (received: ${path})`);
  }

  const { signal: externalSignal, timeoutMs = options.defaultTimeoutMs } = options;

  if (externalSignal?.aborted) {
    throw createAbortError();
  }

  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => {
    controller.abort();
  };

  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers ?? {}),
    };

    return await fetch(path, {
      method: options.method ?? "GET",
      credentials: "include",
      headers,
      body: options.body,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new ApiTimeoutError();
    }
    if (externalSignal?.aborted || isAbortError(error)) {
      throw createAbortError();
    }
    throw new ApiNetworkError();
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

async function parseJsonBody(response: Response): Promise<unknown> {
  let rawText: string;
  try {
    rawText = await response.text();
  } catch {
    throw new UnexpectedResponseError(
      "Failed to read the response body from the server.",
      response.status
    );
  }

  if (rawText.trim().length === 0) {
    throw new UnexpectedResponseError("Received an empty response from the server.", response.status);
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    throw new UnexpectedResponseError(
      "Received a non-JSON response from the server.",
      response.status
    );
  }
}

export const ReportSuccessSchema = ApiSuccess(Report);
export const HistorySuccessSchema = ApiSuccess(HistoryPage);

export const DeleteScanSuccessSchema = ApiSuccess(
  z.object({
    deleted: z.boolean(),
    scanId: z.string(),
  })
);

export interface HistoryQueryParams {
  module?: Module;
  status?: "completed" | "partial" | "failed";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function getHistory(
  params: HistoryQueryParams = {},
  options: ApiRequestOptions = {}
): Promise<HistoryPage> {
  const query = new URLSearchParams();
  if (params.module) query.set("module", params.module);
  if (params.status) query.set("status", params.status);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  const queryString = query.toString();
  const path = queryString ? `/api/scans?${queryString}` : "/api/scans";

  return requestApi<HistoryPage>(
    path,
    (payload) => {
      const parsed = HistorySuccessSchema.safeParse(payload);
      if (!parsed.success || !parsed.data.data) {
        return { success: false };
      }
      const page = HistoryPage.safeParse(parsed.data.data);
      if (!page.success) {
        return { success: false };
      }
      return { success: true, data: page.data };
    },
    options
  );
}

async function parseErrorAndThrow(response: Response, payload: unknown): Promise<never> {
  const parsedError = ApiError.safeParse(payload);
  if (!parsedError.success) {
    throw new UnexpectedResponseError(
      "The server returned an unexpected error response format.",
      response.status
    );
  }

  throw new ApiClientError({
    code: parsedError.data.error.code,
    status: response.status,
    serverMessage: parsedError.data.error.message,
    fields: parsedError.data.error.fields,
  });
}

async function requestApi<T>(
  path: string,
  parseSuccessData: (payload: unknown) => { success: true; data: T } | { success: false },
  options: ApiRequestOptions = {}
): Promise<T> {
  const response = await performRelativeFetch(path, {
    ...options,
    defaultTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  });

  const payload = await parseJsonBody(response);

  if (response.ok) {
    const parsedSuccess = parseSuccessData(payload);
    if (!parsedSuccess.success) {
      throw new UnexpectedResponseError(
        "The server returned a response that does not match the expected contract.",
        response.status
      );
    }
    return parsedSuccess.data;
  }

  return parseErrorAndThrow(response, payload);
}

export async function getReport(
  scanId: string,
  options: ApiRequestOptions = {}
): Promise<Report> {
  const trimmedScanId = scanId.trim();
  if (trimmedScanId.length === 0) {
    throw new ApiClientError({
      code: "VALIDATION_ERROR",
      status: 400,
      serverMessage: "scanId parameter is required",
      fields: [{ path: "scanId", message: "Report ID is required" }],
    });
  }

  return requestApi<Report>(
    `/api/scans/${encodeURIComponent(trimmedScanId)}`,
    (payload) => {
      const parsed = ReportSuccessSchema.safeParse(payload);
      if (!parsed.success || !parsed.data.data) {
        return { success: false };
      }
      const report = Report.safeParse(parsed.data.data);
      if (!report.success) {
        return { success: false };
      }
      return { success: true, data: report.data };
    },
    options
  );
}

export async function deleteScan(
  scanId: string,
  options: ApiRequestOptions = {}
): Promise<boolean> {
  const trimmedScanId = scanId.trim();
  if (trimmedScanId.length === 0) {
    throw new ApiClientError({
      code: "VALIDATION_ERROR",
      status: 400,
      serverMessage: "scanId parameter is required",
      fields: [{ path: "scanId", message: "Report ID is required" }],
    });
  }

  const result = await requestApi<{ deleted: boolean; scanId: string }>(
    `/api/scans/${encodeURIComponent(trimmedScanId)}`,
    (payload) => {
      const parsed = DeleteScanSuccessSchema.safeParse(payload);
      if (!parsed.success || !parsed.data.data) {
        return { success: false };
      }
      return { success: true, data: parsed.data.data };
    },
    {
      ...options,
      method: "DELETE",
    }
  );

  return result.deleted;
}

export async function submitUrlScan(
  request: UrlScanRequest,
  options: ApiRequestOptions = {}
): Promise<Report> {
  const validated = UrlScanRequest.safeParse(request);
  if (!validated.success) {
    throw new ApiClientError({
      code: "VALIDATION_ERROR",
      status: 400,
      serverMessage: "Invalid URL scan request",
      fields: validated.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  return requestApi<Report>(
    "/api/scans/url",
    (payload) => {
      const parsed = ReportSuccessSchema.safeParse(payload);
      if (!parsed.success || !parsed.data.data) {
        return { success: false };
      }
      const report = Report.safeParse(parsed.data.data);
      if (!report.success) {
        return { success: false };
      }
      return { success: true, data: report.data };
    },
    {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      body: JSON.stringify(validated.data),
    }
  );
}

export async function submitPrivacyScan(
  request: PrivacyScanRequest,
  options: ApiRequestOptions = {}
): Promise<Report> {
  const validated = PrivacyScanRequest.safeParse(request);
  if (!validated.success) {
    throw new ApiClientError({
      code: "VALIDATION_ERROR",
      status: 400,
      serverMessage: "Invalid privacy scan request",
      fields: validated.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  return requestApi<Report>(
    "/api/scans/privacy",
    (payload) => {
      const parsed = ReportSuccessSchema.safeParse(payload);
      if (!parsed.success || !parsed.data.data) {
        return { success: false };
      }
      const report = Report.safeParse(parsed.data.data);
      if (!report.success) {
        return { success: false };
      }
      return { success: true, data: report.data };
    },
    {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      body: JSON.stringify(validated.data),
    }
  );
}

export async function submitWebsiteScan(
  request: WebsiteScanRequest,
  options: ApiRequestOptions = {}
): Promise<Report> {
  const validated = WebsiteScanRequest.safeParse(request);
  if (!validated.success) {
    throw new ApiClientError({
      code: "VALIDATION_ERROR",
      status: 400,
      serverMessage: "Invalid website scan request",
      fields: validated.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  return requestApi<Report>(
    "/api/scans/website",
    (payload) => {
      const parsed = ReportSuccessSchema.safeParse(payload);
      if (!parsed.success || !parsed.data.data) {
        return { success: false };
      }
      const report = Report.safeParse(parsed.data.data);
      if (!report.success) {
        return { success: false };
      }
      return { success: true, data: report.data };
    },
    {
      timeoutMs: DEFAULT_WEBSITE_REQUEST_TIMEOUT_MS,
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      body: JSON.stringify(validated.data),
    }
  );
}

export async function checkApiHealth(
  options: ApiRequestOptions = {}
): Promise<HealthStatusResult> {
  try {
    const response = await performRelativeFetch("/api/health", {
      ...options,
      defaultTimeoutMs: options.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS,
    });

    if (!response.ok) {
      return { available: false };
    }

    const payload = await parseJsonBody(response);
    const parsed = HealthResponseSchema.safeParse(payload);
    if (!parsed.success) {
      return { available: false };
    }

    return {
      available: true,
      timestamp: parsed.data.timestamp,
    };
  } catch (error) {
    if (options.signal?.aborted || isAbortError(error)) {
      throw error;
    }
    return { available: false };
  }
}
