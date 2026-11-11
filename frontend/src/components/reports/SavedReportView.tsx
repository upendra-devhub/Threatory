"use client";

import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReportQuery } from "@/hooks/useReportQuery";
import {
  ApiClientError,
  ApiNetworkError,
  ApiTimeoutError,
  UnexpectedResponseError,
} from "@/lib/api-client";
import { ErrorState } from "./ErrorState";
import { ReportSkeleton } from "./ReportSkeleton";
import { ReportView } from "./ReportView";

export interface SavedReportViewProps {
  scanId: string;
}

function getSafeErrorDetails(error: Error): { title: string; description: string } {
  if (error instanceof UnexpectedResponseError) {
    return {
      title: "Unexpected server response",
      description: error.message,
    };
  }

  if (error instanceof ApiTimeoutError) {
    return {
      title: "Request timed out",
      description: error.message,
    };
  }

  if (error instanceof ApiNetworkError) {
    return {
      title: "Unable to reach the API",
      description: error.message,
    };
  }

  if (error instanceof ApiClientError) {
    if (error.code === "RATE_LIMITED") {
      return {
        title: "Too many requests",
        description: error.message,
      };
    }
    return {
      title: "Unable to load report",
      description: error.message,
    };
  }

  return {
    title: "Unable to load report",
    description: "An unexpected error occurred while retrieving this report. Please try again.",
  };
}

export function SavedReportView({ scanId }: SavedReportViewProps) {
  const trimmedScanId = scanId.trim();
  const { data, error, isPending, isFetching, refetch } = useReportQuery(trimmedScanId);

  if (trimmedScanId.length === 0) {
    return (
      <ErrorState
        title="Missing report ID"
        description="A valid report ID is required in the URL to view a saved report."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Return to Overview</span>
            </Link>
          </Button>
        }
      />
    );
  }

  if (isPending) {
    return <ReportSkeleton />;
  }

  if (error) {
    if (error instanceof ApiClientError && error.code === "NOT_FOUND") {
      return (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
                <FileQuestion className="h-5 w-5" aria-hidden="true" />
              </span>
              <CardTitle as="h1" className="text-xl font-semibold text-foreground">
                Report not found
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              The requested report could not be found. It may have expired, been removed, or may not
              be available in this session.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="default" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Return to Overview</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/history">Browse History</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    const { title, description } = getSafeErrorDetails(error);

    return (
      <ErrorState
        title={title}
        description={description}
        onRetry={() => {
          void refetch();
        }}
        isRetrying={isFetching}
        retryLabel="Retry"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Return to Overview</Link>
          </Button>
        }
      />
    );
  }

  if (!data) {
    return <ReportSkeleton />;
  }

  return <ReportView report={data} />;
}
