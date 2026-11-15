"use client";

import Link from "next/link";
import { useState } from "react";
import { Globe, Link2, Plus, ShieldCheck, UserCheck } from "lucide-react";
import { EmptyState } from "@/components/reports/EmptyState";
import { ErrorState } from "@/components/reports/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { ModuleBarChart } from "./ModuleBarChart";
import { NewScanModal } from "./NewScanModal";
import { RecentScansTable } from "./RecentScansTable";
import { RiskLevelDonutChart } from "./RiskLevelDonutChart";
import { StartScanCard } from "./StartScanCard";
import { StatCards } from "./StatCards";

export function DashboardView() {
  const { data, error, isPending, isFetching, refetch } = useDashboardSummary();
  const [newScanOpen, setNewScanOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            A summary of your recent security checks. Counts come from your saved reports.
          </p>
        </div>
        <div>
          <Button
            type="button"
            onClick={() => setNewScanOpen(true)}
            style={{ backgroundColor: "#1d4ed8", color: "#ffffff" }}
            className="hover:bg-blue-700 font-medium px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 text-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New scan</span>
          </Button>
        </div>
      </div>

      {/* New Scan modal */}
      <NewScanModal isOpen={newScanOpen} onClose={() => setNewScanOpen(false)} />

      {/* Content states */}
      {isPending ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl bg-white" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            <Skeleton className="h-72 w-full rounded-2xl bg-white md:col-span-5" />
            <Skeleton className="h-72 w-full rounded-2xl bg-white md:col-span-4" />
            <Skeleton className="h-72 w-full rounded-2xl bg-white md:col-span-3" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl bg-white" />
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
            <Card className="rounded-2xl border border-slate-200/80 bg-white transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Link2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle as="h2" className="mt-2 text-base font-semibold text-slate-900">
                  URL Analyzer
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Inspect suspicious URLs against phishing databases, lookalike heuristics, and open-redirect checks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="default" size="sm" asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link href="/url-analyzer">Analyze a URL</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/80 bg-white transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <UserCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle as="h2" className="mt-2 text-base font-semibold text-slate-900">
                  Privacy Analyzer
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Check public profiles and identifiers for cross-platform correlation, email exposure, and data leakage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="default" size="sm" asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/privacy-analyzer">Audit Privacy</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/80 bg-white transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Globe className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle as="h2" className="mt-2 text-base font-semibold text-slate-900">
                  Website Auditor
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Audit external domains for TLS configuration, security headers, cookie security, and DNS SPF/DMARC.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="default" size="sm" asChild className="w-full bg-amber-600 hover:bg-amber-700">
                  <Link href="/website-auditor">Audit Website</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat cards (4 in a row) */}
          <StatCards summary={data} />

          {/* Middle row: 3 columns (Risk distribution, Scans by module, Start a scan) */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12 items-stretch">
            <div className="md:col-span-5 flex flex-col">
              <RiskLevelDonutChart byRiskLevel={data.byRiskLevel} />
            </div>
            <div className="md:col-span-4 flex flex-col">
              <ModuleBarChart byModule={data.byModule} />
            </div>
            <div className="md:col-span-3 flex flex-col">
              <StartScanCard />
            </div>
          </div>

          {/* Bottom row: Recent scans table with retention notice */}
          {data.recent.length > 0 ? <RecentScansTable recent={data.recent} /> : null}
        </div>
      )}
    </div>
  );
}
