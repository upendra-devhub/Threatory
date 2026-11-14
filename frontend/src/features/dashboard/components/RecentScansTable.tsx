"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HistoryItem, Module, RiskLevel } from "@threatory/contracts";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface RecentScansTableProps {
  recent: HistoryItem[];
}

const MODULE_LABELS: Record<Module, string> = {
  url: "URL",
  privacy: "Privacy",
  website: "Website",
};

const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  none_detected: "border-slate-300 bg-slate-100 text-slate-800",
  low: "border-sky-300 bg-sky-50 text-sky-900",
  medium: "border-amber-400 bg-amber-50 text-amber-950",
  high: "border-red-600 bg-red-50 text-red-950 font-semibold",
};

function formatRecentDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return isoTimestamp;
  }
  return (
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}

export function RecentScansTable({ recent }: RecentScansTableProps) {
  const router = useRouter();

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle as="h2" className="text-sm font-semibold text-foreground">
          Recent scan activity
        </CardTitle>
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
        >
          <span>View all in History</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" aria-label="Recent scans">
            <thead className="border-y border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-2.5">Date (UTC)</th>
                <th scope="col" className="px-4 py-2.5">Module</th>
                <th scope="col" className="px-4 py-2.5">Target</th>
                <th scope="col" className="px-4 py-2.5">Assessment</th>
                <th scope="col" className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((item) => {
                const reportUrl = `/reports/${encodeURIComponent(item.scanId)}`;
                return (
                  <tr
                    key={item.scanId}
                    onClick={() => router.push(reportUrl)}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                      <time dateTime={item.createdAt}>{formatRecentDate(item.createdAt)}</time>
                    </td>

                    <td className="whitespace-nowrap px-4 py-2.5">
                      <Badge variant="secondary" className="text-xs">
                        {MODULE_LABELS[item.module]}
                      </Badge>
                    </td>

                    {/* CRITICAL: Target summary is rendered as PLAIN TEXT only. Never clickable, never raw privacy input */}
                    <td className="max-w-xs px-4 py-2.5">
                      <span
                        data-testid="recent-target-summary"
                        className="block truncate font-mono text-xs text-foreground"
                        title={item.targetSummary}
                      >
                        {item.targetSummary}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                          RISK_BADGE_CLASSES[item.assessment.riskLevel]
                        )}
                      >
                        {item.assessment.label}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <Link
                        href={reportUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        <span>View</span>
                        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
