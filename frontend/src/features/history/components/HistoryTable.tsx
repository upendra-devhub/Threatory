"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HistoryItem, Module, RiskLevel } from "@threatory/contracts";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

const STATUS_BADGE_CLASSES: Record<HistoryItem["status"], string> = {
  completed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  partial: "border-amber-400 bg-amber-50 text-amber-950",
  failed: "border-red-400 bg-red-50 text-red-900",
};

function formatHistoryDate(isoTimestamp: string): string {
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

export interface HistoryTableProps {
  items: HistoryItem[];
}

export function HistoryTable({ items }: HistoryTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" aria-label="Scan history list">
          <thead className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3">Date (UTC)</th>
              <th scope="col" className="px-4 py-3">Module</th>
              <th scope="col" className="px-4 py-3">Target</th>
              <th scope="col" className="px-4 py-3">Assessment</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const reportUrl = `/reports/${encodeURIComponent(item.scanId)}`;
              return (
                <tr
                  key={item.scanId}
                  onClick={() => router.push(reportUrl)}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    <time dateTime={item.createdAt}>{formatHistoryDate(item.createdAt)}</time>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge variant="secondary" className="text-xs">
                      {MODULE_LABELS[item.module]}
                    </Badge>
                  </td>

                  {/* CRITICAL: Target summary is rendered as PLAIN TEXT only. Never clickable, never raw privacy input */}
                  <td className="max-w-xs px-4 py-3">
                    <span
                      data-testid="history-target-summary"
                      className="block truncate font-mono text-xs text-foreground"
                      title={item.targetSummary}
                    >
                      {item.targetSummary}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                        RISK_BADGE_CLASSES[item.assessment.riskLevel]
                      )}
                    >
                      {item.assessment.label}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
                        STATUS_BADGE_CLASSES[item.status]
                      )}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link
                      href={reportUrl}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      <span>View report</span>
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
