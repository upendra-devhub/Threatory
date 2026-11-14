import { useQuery } from "@tanstack/react-query";
import { getHistory, type HistoryQueryParams, queryKeys } from "@/lib/api-client";

export function useHistoryQuery(params: HistoryQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.history(params),
    queryFn: ({ signal }) => getHistory(params, { signal }),
  });
}
