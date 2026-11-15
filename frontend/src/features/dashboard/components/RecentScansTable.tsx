"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HistoryItem, Module, RiskLevel } from "@threatory/contracts";
import { ChevronRight, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface RecentScansTableProps {
  recent: HistoryItem[];
}

const MODULE_CONFIG: Record<
  Module,
  { label: string; bg: string; color: string; border: string }
> = {
  url: {
    label: "URL",
    bg: "#eff6ff",
    color: "#2563eb",
    border: "#dbeafe",
  },
  privacy: {
    label: "Privacy",
    bg: "#ecfdf5",
    color: "#047857",
    border: "#d1fae5",
  },
  website: {
    label: "Website",
    bg: "#fffbeb",
    color: "#b45309",
    border: "#fef3c7",
  },
};

const RISK_CONFIG: Record<
  RiskLevel,
  { dot: string; bg: string; color: string; border: string }
> = {
  none_detected: {
    dot: "#10b981",
    bg: "#ecfdf5",
    color: "#047857",
    border: "#d1fae5",
  },
  low: {
    dot: "#f59e0b",
    bg: "#fffbeb",
    color: "#b45309",
    border: "#fef3c7",
  },
  medium: {
    dot: "#f97316",
    bg: "#fff7ed",
    color: "#c2410c",
    border: "#ffedd5",
  },
  high: {
    dot: "#ef4444",
    bg: "#fef2f2",
    color: "#b91c1c",
    border: "#fee2e2",
  },
};

function formatRecentDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return isoTimestamp;
  }
  const day = date.getUTCDate();
  const month = date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month}, ${hours}:${minutes}`;
}

export function RecentScansTable({ recent }: RecentScansTableProps) {
  const router = useRouter();

  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            Recent scans
          </h2>
          <Link
            href="/history"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            View all history
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Recent scans">
            <thead className="border-b border-slate-100 bg-white text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3.5">WHEN</th>
                <th scope="col" className="px-5 py-3.5">MODULE</th>
                <th scope="col" className="px-5 py-3.5">TARGET</th>
                <th scope="col" className="px-5 py-3.5">ASSESSMENT</th>
                <th scope="col" className="px-5 py-3.5">STATUS</th>
                <th scope="col" className="px-5 py-3.5 text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((item) => {
                const reportUrl = `/reports/${encodeURIComponent(item.scanId)}`;
                const moduleCfg = MODULE_CONFIG[item.module];
                const riskCfg = RISK_CONFIG[item.assessment.riskLevel];

                return (
                  <tr
                    key={item.scanId}
                    onClick={() => router.push(reportUrl)}
                    className="cursor-pointer transition-colors hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 font-normal">
                      <time dateTime={item.createdAt}>
                        {formatRecentDate(item.createdAt)}
                      </time>
                    </td>

                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span
                        className="inline-block rounded-md border px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: moduleCfg.bg,
                          color: moduleCfg.color,
                          borderColor: moduleCfg.border,
                        }}
                      >
                        {moduleCfg.label}
                      </span>
                    </td>

                    {/* CRITICAL: Target summary is rendered as PLAIN TEXT only. Never clickable, never raw privacy input */}
                    <td className="max-w-xs px-5 py-3.5">
                      <span
                        data-testid="recent-target-summary"
                        className="block truncate font-mono text-xs text-slate-700"
                        title={item.targetSummary}
                      >
                        {item.targetSummary}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: riskCfg.bg,
                          color: riskCfg.color,
                          borderColor: riskCfg.border,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: riskCfg.dot }}
                          aria-hidden="true"
                        />
                        <span>{item.assessment.label}</span>
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              item.status === "completed"
                                ? "#10b981"
                                : item.status === "failed"
                                ? "#ef4444"
                                : "#f59e0b",
                          }}
                          aria-hidden="true"
                        />
                        <span className="capitalize">{item.status}</span>
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <Link
                        href={reportUrl}
                        aria-label="View"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center text-slate-300 hover:text-slate-600"
                      >
                        <span className="sr-only">View</span>
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Data retention notice */}
        <div className="p-4 pt-3">
          <div
            className="flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs"
            style={{
              backgroundColor: "#eff6ff",
              borderColor: "#dbeafe",
              color: "#1d4ed8",
            }}
          >
            <Info className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            <p className="leading-relaxed">
              Privacy reports are kept for 7 days and other reports for 30 days, then deleted automatically. You can delete any report earlier.
              <span className="sr-only">
                Reports belong to this browser session and expire automatically: privacy reports expire after 7 days, and URL and website reports after 30 days.
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
