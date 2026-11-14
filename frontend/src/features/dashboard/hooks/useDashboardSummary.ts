import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary, queryKeys } from "@/lib/api-client";

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboardSummary(),
    queryFn: ({ signal }) => getDashboardSummary({ signal }),
  });
}
