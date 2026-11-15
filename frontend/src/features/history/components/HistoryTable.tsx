"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HistoryItem, Module, RiskLevel } from "@threatory/contracts";
import { ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MODULE_LABELS: Record<Module, string> = {
  url: "URL",
  privacy: "Privacy",
  website: "Website",
};

const MODULE_CLASSES: Record<Module, string> = {
  url: "bg-[#eff6ff] text-[#2563eb]",
  website: "bg-[#fff7ed] text-[#ea580c]",
  privacy: "bg-[#ecfdf5] text-[#059669]",
};

const RISK_BADGE_CLASSES: Record<RiskLevel, { badge: string; dot: string }> = {
  none_detected: {
    badge: "bg-[#dcfce7] text-[#15803d]",
    dot: "bg-[#15803d]",
  },
  low: {
    badge: "bg-[#fef9c3] text-[#a16207]",
    dot: "bg-[#a16207]",
  },
  medium: {
    badge: "bg-[#ffedd5] text-[#c2410c]",
    dot: "bg-[#c2410c]",
  },
  high: {
    badge: "bg-[#fee2e2] text-[#dc2626]",
    dot: "bg-[#dc2626]",
  },
};

const STATUS_DOT_CLASSES: Record<HistoryItem["status"], string> = {
  completed: "bg-[#15803d]",
  partial: "bg-[#b45309]",
  failed: "bg-[#dc2626]",
};

function formatHistoryDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return isoTimestamp;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

export interface HistoryTableProps {
  items: HistoryItem[];
  onDelete?: (scanId: string) => void;
}

export function HistoryTable({ items, onDelete }: HistoryTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" aria-label="Scan history list">
          <thead className="border-b border-slate-100 bg-white text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-3.5">WHEN</th>
              <th scope="col" className="px-4 py-3.5">MODULE</th>
              <th scope="col" className="px-4 py-3.5">TARGET</th>
              <th scope="col" className="px-4 py-3.5">ASSESSMENT</th>
              <th scope="col" className="px-4 py-3.5">STATUS</th>
              <th scope="col" className="px-6 py-3.5 text-right"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const reportUrl = `/reports/${encodeURIComponent(item.scanId)}`;
              const riskCfg = RISK_BADGE_CLASSES[item.assessment.riskLevel] ?? RISK_BADGE_CLASSES.none_detected;
              const statusDot = STATUS_DOT_CLASSES[item.status] ?? "bg-slate-400";

              return (
                <tr
                  key={item.scanId}
                  onClick={() => router.push(reportUrl)}
                  className="cursor-pointer transition-colors hover:bg-slate-50/70"
                >
                  {/* When / Timestamp */}
                  <td className="whitespace-nowrap px-6 py-3.5 text-xs font-medium text-slate-600">
                    <time dateTime={item.createdAt}>{formatHistoryDate(item.createdAt)}</time>
                  </td>

                  {/* Module badge */}
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                        MODULE_CLASSES[item.module] ?? "bg-slate-100 text-slate-700"
                      )}
                    >
                      {MODULE_LABELS[item.module]}
                    </span>
                  </td>

                  {/* Plain text target - strictly not an <a> tag */}
                  <td className="max-w-md px-4 py-3.5">
                    <span
                      data-testid="history-target-summary"
                      className="block truncate font-mono text-xs text-slate-800"
                      title={item.targetSummary}
                    >
                      {item.targetSummary}
                    </span>
                  </td>

                  {/* Assessment risk badge */}
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        riskCfg.badge
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", riskCfg.dot)} aria-hidden="true" />
                      <span>{item.assessment.label}</span>
                    </span>
                  </td>

                  {/* Status dot + text */}
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-slate-700">
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} aria-hidden="true" />
                      <span>{item.status}</span>
                    </span>
                  </td>

                  {/* Actions: Trash button + Right Chevron Link */}
                  <td className="whitespace-nowrap px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onDelete?.(item.scanId)}
                        aria-label={`Delete scan ${item.scanId}`}
                        className="rounded-md p-1.5 text-slate-300 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      <Link
                        href={reportUrl}
                        aria-label={`View report ${item.scanId}`}
                        className="rounded-md p-1 text-slate-300 hover:text-slate-600 transition-colors inline-flex items-center"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">View report</span>
                      </Link>
                    </div>
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
