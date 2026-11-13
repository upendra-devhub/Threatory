"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Report, PrivacyScanRequest } from "@threatory/contracts";
import {
  ApiClientError,
  ApiNetworkError,
  ApiTimeoutError,
  submitPrivacyScan,
} from "@/lib/api-client";

export interface UsePrivacyScanResult {
  scan: (data: PrivacyScanRequest) => Promise<Report | undefined>;
  retry: () => Promise<Report | undefined>;
  report: Report | null;
  isPending: boolean;
  serverFieldErrors: Array<{ path: string; message: string }> | null;
  generalError: string | null;
  lastSubmittedRequest: PrivacyScanRequest | null;
  reset: () => void;
  resetTrigger: number;
}

export function usePrivacyScan(): UsePrivacyScanResult {
  const [report, setReport] = useState<Report | null>(null);
  const [lastSubmittedRequest, setLastSubmittedRequest] =
    useState<PrivacyScanRequest | null>(null);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  const mutation = useMutation<Report, Error, PrivacyScanRequest>({
    mutationFn: async (request: PrivacyScanRequest) => {
      return await submitPrivacyScan(request);
    },
    onSuccess: (data) => {
      setReport(data);
      // Trigger form field cleanup so sensitive input does not remain visible
      setResetTrigger((prev) => prev + 1);
      // Invariant: Clear submitted sensitive data from component memory
      setLastSubmittedRequest(null);
    },
  });

  const scan = async (
    data: PrivacyScanRequest
  ): Promise<Report | undefined> => {
    // Retain in memory solely for manual retry capability on failure
    setLastSubmittedRequest(data);
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

  let serverFieldErrors: Array<{ path: string; message: string }> | null = null;
  let generalError: string | null = null;

  if (mutation.error) {
    const err = mutation.error;
    if (err instanceof ApiClientError) {
      if (err.code === "VALIDATION_ERROR") {
        if (err.fields && err.fields.length > 0) {
          serverFieldErrors = err.fields;
        } else {
          generalError =
            err.serverMessage ||
            "Validation failed for the submitted privacy information.";
        }
      } else if (err.code === "RATE_LIMITED") {
        generalError =
          "Too many privacy analysis requests. Please try again shortly.";
      } else if (err.code === "INTERNAL" || err.code === "UPSTREAM_FAILURE") {
        generalError =
          "An unexpected server error occurred while analyzing the information. Please try again.";
      } else {
        generalError =
          err.serverMessage ||
          "An error occurred while processing the privacy scan.";
      }
    } else if (err instanceof ApiTimeoutError) {
      generalError =
        "The analysis request timed out. Please check your connection and try again.";
    } else if (err instanceof ApiNetworkError) {
      generalError =
        "Unable to connect to the Threatory API. Please check your connection and try again.";
    } else {
      generalError =
        err.message || "An unexpected error occurred. Please try again.";
    }
  }

  return {
    scan,
    retry,
    report,
    isPending: mutation.isPending,
    serverFieldErrors,
    generalError,
    lastSubmittedRequest,
    reset,
    resetTrigger,
  };
}
