"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Report, WebsiteScanRequest } from "@threatory/contracts";
import {
  ApiClientError,
  ApiNetworkError,
  ApiTimeoutError,
  submitWebsiteScan,
} from "@/lib/api-client";

export interface UseWebsiteScanResult {
  scan: (data: WebsiteScanRequest) => Promise<Report | undefined>;
  retry: () => Promise<Report | undefined>;
  report: Report | null;
  isPending: boolean;
  fieldError: string | null;
  generalError: string | null;
  lastSubmittedRequest: WebsiteScanRequest | null;
  reset: () => void;
}

export function useWebsiteScan(): UseWebsiteScanResult {
  const [report, setReport] = useState<Report | null>(null);
  const [lastSubmittedRequest, setLastSubmittedRequest] =
    useState<WebsiteScanRequest | null>(null);

  const mutation = useMutation<Report, Error, WebsiteScanRequest>({
    mutationFn: async (request: WebsiteScanRequest) => {
      return await submitWebsiteScan(request);
    },
    onSuccess: (data) => {
      setReport(data);
    },
  });

  const scan = async (
    data: WebsiteScanRequest
  ): Promise<Report | undefined> => {
    setLastSubmittedRequest(data);
    // Clear previous report so fresh audit state is shown
    setReport(null);
    try {
      return await mutation.mutateAsync(data);
    } catch {
      // Error is safely captured in mutation.error
      return undefined;
    }
  };

  const retry = async (): Promise<Report | undefined> => {
    if (!lastSubmittedRequest || mutation.isPending) {
      return undefined;
    }
    try {
      return await mutation.mutateAsync(lastSubmittedRequest);
    } catch {
      return undefined;
    }
  };

  const reset = () => {
    setReport(null);
    setLastSubmittedRequest(null);
    mutation.reset();
  };

  let fieldError: string | null = null;
  let generalError: string | null = null;

  if (mutation.error) {
    const err = mutation.error;
    if (err instanceof ApiClientError) {
      if (err.code === "TARGET_BLOCKED") {
        // EXACT copy per project brief: never echo internal IP, port, or server details
        generalError = "This address cannot be audited because it is not a public website";
      } else if (err.code === "VALIDATION_ERROR") {
        const urlErr = err.fields?.find(
          (f) => f.path === "url" || f.path.startsWith("url.")
        );
        const authErr = err.fields?.find(
          (f) => f.path === "authorised" || f.path.startsWith("authorised.")
        );
        if (urlErr) {
          fieldError = urlErr.message;
        } else if (authErr) {
          fieldError = authErr.message;
        } else {
          generalError =
            err.serverMessage || "Validation failed for the submitted website audit request.";
        }
      } else if (err.code === "RATE_LIMITED") {
        generalError = "Too many website audit requests. Please try again shortly.";
      } else if (err.code === "INTERNAL" || err.code === "UPSTREAM_FAILURE") {
        generalError =
          "An unexpected server error occurred while auditing the website. Please try again.";
      } else {
        generalError =
          err.serverMessage || "An error occurred while processing the website audit.";
      }
    } else if (err instanceof ApiTimeoutError) {
      generalError =
        "The website audit request timed out. Please check your connection and try again.";
    } else if (err instanceof ApiNetworkError) {
      generalError =
        "Unable to connect to the Threatory API. Please check your connection and try again.";
    } else {
      generalError = err.message || "An unexpected error occurred. Please try again.";
    }
  }

  return {
    scan,
    retry,
    report,
    isPending: mutation.isPending,
    fieldError,
    generalError,
    lastSubmittedRequest,
    reset,
  };
}
