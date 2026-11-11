"use client";

import type { Report } from "@threatory/contracts";
import { useQuery } from "@tanstack/react-query";
import { getReport, queryKeys } from "@/lib/api-client";

export function useReportQuery(scanId: string) {
  const trimmedScanId = scanId.trim();

  return useQuery<Report, Error>({
    queryKey: queryKeys.report(trimmedScanId),
    queryFn: ({ signal }) => getReport(trimmedScanId, { signal }),
    enabled: trimmedScanId.length > 0,
    retry: false,
  });
}
