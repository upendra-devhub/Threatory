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

  const isEmpty = data && data.totalScans === 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEmpty
              ? "Your security checks will appear here."
              : "Your recent security checks."}
          </p>
        </div>
        {!isEmpty && !isPending && !error && (
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
        )}
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
      ) : isEmpty ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-10 shadow-xs">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Run your first scan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick a tool to get started. Your reports are saved to your account.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* URL Analyzer Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 transition-all hover:border-blue-200 hover:bg-blue-50/20">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100/70 text-blue-600">
                  <Link2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  URL Analyzer
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Check whether a link looks like phishing, without opening it.
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/url-analyzer"
                  className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 group"
                >
                  Start <span className="ml-1 transition-transform group-hover:translate-x-0.5">&gt;</span>
                </Link>
              </div>
            </div>

            {/* Privacy Analyzer Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 transition-all hover:border-emerald-200 hover:bg-emerald-50/20">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-600">
                  <UserCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  Privacy Analyzer
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  See what the details you choose to share could reveal.
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/privacy-analyzer"
                  className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 group"
                >
                  Start <span className="ml-1 transition-transform group-hover:translate-x-0.5">&gt;</span>
                </Link>
              </div>
            </div>

            {/* Website Auditor Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 transition-all hover:border-amber-200 hover:bg-amber-50/20">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100/70 text-amber-600">
                  <Globe className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  Website Auditor
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Review the security setup of a site you are allowed to test.
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/website-auditor"
                  className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 group"
                >
                  Start <span className="ml-1 transition-transform group-hover:translate-x-0.5">&gt;</span>
                </Link>
              </div>
            </div>
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
