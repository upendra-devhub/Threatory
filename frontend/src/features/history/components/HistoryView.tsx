"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Module } from "@threatory/contracts";
import { History as HistoryIcon, Link2, ShieldCheck, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/reports/EmptyState";
import { ErrorState } from "@/components/reports/ErrorState";
import { RetentionNotice } from "@/components/reports/RetentionNotice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHistoryQuery } from "../hooks/useHistoryQuery";
import { HistoryFilters } from "./HistoryFilters";
import { HistoryPagination } from "./HistoryPagination";
import { HistoryTable } from "./HistoryTable";

const DEFAULT_LIMIT = 20;

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
    <div className="space-y-6">
      <PageHeader
        title="History"
        description="Browse and manage saved reports associated with your browser session."
      />

      {/* Retention Notice */}
      <RetentionNotice />

      {/* Filters */}
      <HistoryFilters
        module={moduleFilter}
        status={statusFilter}
        onModuleChange={handleModuleChange}
        onStatusChange={handleStatusChange}
        onReset={handleResetFilters}
      />

      {/* Content State */}
      {isPending ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-6 shadow-sm">
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
            description="You have not run any scans in this browser session. Start analyzing a URL, privacy footprint, or website below."
          >
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button variant="default" size="sm" asChild>
                <Link href="/url-analyzer" className="gap-1.5">
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>URL Analyzer</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/privacy-analyzer" className="gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Privacy Analyzer</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/website-auditor" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Website Auditor</span>
                </Link>
              </Button>
            </div>
          </EmptyState>
        )
      ) : (
        <div className="space-y-4">
          <HistoryTable items={data.items} />
          <HistoryPagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
