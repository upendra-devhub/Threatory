"use client";

import Link from "next/link";
import { Globe, History, Link2, ShieldCheck, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/reports/EmptyState";
import { ErrorState } from "@/components/reports/ErrorState";
import { RetentionNotice } from "@/components/reports/RetentionNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { ModuleBarChart } from "./ModuleBarChart";
import { RecentScansTable } from "./RecentScansTable";
import { RiskLevelDonutChart } from "./RiskLevelDonutChart";
import { StatCards } from "./StatCards";

export function DashboardView() {
  const { data, error, isPending, isFetching, refetch } = useDashboardSummary();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Dashboard"
          description="Overview of scans and risk distribution in this browser session."
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/history" className="gap-1.5">
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Browse History</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Retention notice */}
      <RetentionNotice />

      {/* Content states */}
      {isPending ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 w-full rounded-lg" />
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
          <Skeleton className="h-60 w-full rounded-lg" />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load dashboard"
          description={error.message || "Failed to retrieve dashboard summary. Please try again."}
          onRetry={() => {
            void refetch();
          }}
          isRetrying={isFetching}
        />
      ) : data.totalScans === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={ShieldCheck}
            title="Welcome to Threatory"
            description="You have not run any scans in this browser session. Select one of the analyzer tools below to get started."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-border transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Link2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle as="h2" className="mt-2 text-base font-semibold">
                  URL Analyzer
                </CardTitle>
                <CardDescription className="text-xs">
                  Inspect suspicious URLs against phishing databases, lookalike heuristics, and open-redirect checks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="default" size="sm" asChild className="w-full">
                  <Link href="/url-analyzer">Analyze a URL</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <UserCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle as="h2" className="mt-2 text-base font-semibold">
                  Privacy Analyzer
                </CardTitle>
                <CardDescription className="text-xs">
                  Check public profiles and identifiers for cross-platform correlation, email exposure, and data leakage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="default" size="sm" asChild className="w-full">
                  <Link href="/privacy-analyzer">Audit Privacy</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Globe className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle as="h2" className="mt-2 text-base font-semibold">
                  Website Auditor
                </CardTitle>
                <CardDescription className="text-xs">
                  Audit external domains for TLS configuration, security headers, cookie security, and DNS SPF/DMARC.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="default" size="sm" asChild className="w-full">
                  <Link href="/website-auditor">Audit Website</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <StatCards summary={data} />

          {/* Charts grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RiskLevelDonutChart byRiskLevel={data.byRiskLevel} />
            <ModuleBarChart byModule={data.byModule} />
          </div>

          {/* Recent scans table */}
          {data.recent.length > 0 ? <RecentScansTable recent={data.recent} /> : null}
        </div>
      )}
    </div>
  );
}
