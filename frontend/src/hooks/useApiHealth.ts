"use client";

import { useQuery } from "@tanstack/react-query";
import { checkApiHealth, type HealthStatusResult, queryKeys } from "@/lib/api-client";

export const HEALTH_REFETCH_INTERVAL_MS = 30_000;

export type ApiHealthState = "checking" | "connected" | "unavailable";

export function useApiHealth() {
  const query = useQuery<HealthStatusResult>({
    queryKey: queryKeys.health(),
    queryFn: ({ signal }) => checkApiHealth({ signal }),
    refetchInterval: HEALTH_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
    retry: false,
  });

  let state: ApiHealthState = "unavailable";
  if (query.isPending) {
    state = "checking";
  } else if (query.data?.available) {
    state = "connected";
  }

  return {
    ...query,
    state,
  };
}

