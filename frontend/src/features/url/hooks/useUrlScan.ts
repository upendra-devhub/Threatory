"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Report, UrlScanRequest } from "@threatory/contracts";
import {
  ApiClientError,
  ApiNetworkError,
  ApiTimeoutError,
  submitUrlScan,
} from "@/lib/api-client";

export interface UseUrlScanResult {
  scan: (data: UrlScanRequest) => Promise<Report | undefined>;
  retry: () => Promise<Report | undefined>;
  report: Report | null;
  isPending: boolean;
  fieldError: string | null;
  generalError: string | null;
  lastSubmittedUrl: string;
  reset: () => void;
}

export function useUrlScan(): UseUrlScanResult {
  const [report, setReport] = useState<Report | null>(null);
  const [lastSubmittedUrl, setLastSubmittedUrl] = useState<string>("");

  const mutation = useMutation<Report, Error, UrlScanRequest>({
    mutationFn: async (request: UrlScanRequest) => {
      return await submitUrlScan(request);
    },
    onSuccess: (data) => {
      setReport(data);
    },
  });

  const scan = async (data: UrlScanRequest): Promise<Report | undefined> => {
    setLastSubmittedUrl(data.url);
    // Clear previous report so fresh analysis state is shown
    setReport(null);
    try {
      return await mutation.mutateAsync(data);
    } catch {
      // Error is safely captured in mutation.error
      return undefined;
    }
  };

  const retry = async (): Promise<Report | undefined> => {
    if (!lastSubmittedUrl || mutation.isPending) {
      return undefined;
    }
    try {
      return await mutation.mutateAsync({ url: lastSubmittedUrl });
    } catch {
      // Error is safely captured in mutation.error
      return undefined;
    }
  };

  const reset = () => {
    setReport(null);
    mutation.reset();
  };

  let fieldError: string | null = null;
  let generalError: string | null = null;

  if (mutation.error) {
    const err = mutation.error;
    if (err instanceof ApiClientError) {
      if (err.code === "VALIDATION_ERROR") {
        const urlFieldErr = err.fields?.find(
          (f) => f.path === "url" || f.path.startsWith("url.")
        );
        if (urlFieldErr) {
          fieldError = urlFieldErr.message;
        } else {
          generalError = err.serverMessage || "Validation failed for the submitted URL.";
        }
      } else if (err.code === "RATE_LIMITED") {
        generalError = "Too many URL analysis requests. Please try again shortly.";
      } else if (err.code === "INTERNAL" || err.code === "UPSTREAM_FAILURE") {
        generalError =
          "An unexpected server error occurred while analyzing the URL. Please try again.";
      } else {
        generalError = err.serverMessage || "An error occurred while processing the URL.";
      }
    } else if (err instanceof ApiTimeoutError) {
      generalError = "The analysis request timed out. Please check your connection and try again.";
    } else if (err instanceof ApiNetworkError) {
      generalError = "Unable to connect to the Threatory API. Please check your connection and try again.";
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
    lastSubmittedUrl,
    reset,
  };
}
