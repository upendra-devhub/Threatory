"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Module } from "@threatory/contracts";
import { History as HistoryIcon } from "lucide-react";
import { EmptyState } from "@/components/reports/EmptyState";
import { ErrorState } from "@/components/reports/ErrorState";
import { RetentionNotice } from "@/components/reports/RetentionNotice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHistoryQuery } from "../hooks/useHistoryQuery";
import { HistoryFilters } from "./HistoryFilters";
import { HistoryPagination } from "./HistoryPagination";
import { HistoryTable } from "./HistoryTable";

const DEFAULT_LIMIT = 9;

export function HistoryView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL search params
  const rawModule = searchParams.get("module");
  const moduleFilter: Module | undefined =
    rawModule === "url" || rawModule === "privacy" || rawModule === "website"
      ? rawModule
      : undefined;

  const rawStatus = searchParams.get("status");
  const statusFilter: "completed" | "partial" | "failed" | undefined =
    rawStatus === "completed" || rawStatus === "partial" || rawStatus === "failed"
      ? rawStatus
      : undefined;

  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;

  // Query API
  const { data, error, isPending, isFetching, refetch } = useHistoryQuery({
    module: moduleFilter,
    status: statusFilter,
    page,
    limit: DEFAULT_LIMIT,
  });

  // URL search params updater
  const updateQuery = (updates: {
    module?: Module | null;
    status?: "completed" | "partial" | "failed" | null;
    page?: number;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.module !== undefined) {
      if (updates.module) params.set("module", updates.module);
      else params.delete("module");
    }

    if (updates.status !== undefined) {
      if (updates.status) params.set("status", updates.status);
      else params.delete("status");
    }

    if (updates.page !== undefined) {
      if (updates.page > 1) params.set("page", String(updates.page));
      else params.delete("page");
    }

    const queryStr = params.toString();
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
    router.push(targetUrl);
  };

  const handleModuleChange = (newModule: Module | undefined) => {
    updateQuery({ module: newModule ?? null, page: 1 });
  };

  const handleStatusChange = (newStatus: "completed" | "partial" | "failed" | undefined) => {
    updateQuery({ status: newStatus ?? null, page: 1 });
  };

  const handleResetFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("module");
    params.delete("status");
    params.delete("page");
    const queryStr = params.toString();
    router.push(queryStr ? `${pathname}?${queryStr}` : pathname);
  };

  const handlePageChange = (newPage: number) => {
    updateQuery({ page: newPage });
  };

  const isFiltered = Boolean(moduleFilter || statusFilter);

  return (
    <div className="space-y-6" data-testid="history-view">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Scan history
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
          Every report saved to your account. Reports expire automatically and can be deleted at any time.
        </p>
      </div>

      {/* Top Filter Controls (Segmented module pills, Search input, Risk level dropdown) */}
      <HistoryFilters
        module={moduleFilter}
        status={statusFilter}
        onModuleChange={handleModuleChange}
        onStatusChange={handleStatusChange}
        onReset={handleResetFilters}
      />

      {/* Main Content Area */}
      {isPending ? (
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load history"
          description={error.message || "Failed to retrieve scan history. Please try again."}
          onRetry={() => {
            void refetch();
          }}
          isRetrying={isFetching}
        />
      ) : data.items.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={HistoryIcon}
            title="No matching scans"
            description="No scans match the currently selected module or status filters."
          >
            <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={HistoryIcon}
            title="No scans yet"
            description="You have not run any scans yet. Run your first security check to see your saved reports here."
          >
            <div className="pt-2">
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl">
                <Link href="/url-analyzer">Run a scan</Link>
              </Button>
            </div>
          </EmptyState>
        )
      ) : (
        <div className="space-y-4">
          {/* Main Scans Table */}
          <HistoryTable items={data.items} />

          {/* Pagination Controls */}
          {data.total > 0 && (
            <HistoryPagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}

      {/* Retention Notice Banner at bottom */}
      <RetentionNotice />
    </div>
  );
}
