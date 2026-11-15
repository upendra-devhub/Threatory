"use client";

import type { DashboardSummary } from "@threatory/contracts";
import { Card, CardContent } from "@/components/ui/card";

export interface RiskLevelDonutChartProps {
  byRiskLevel: DashboardSummary["byRiskLevel"];
}

interface RiskItem {
  key: keyof DashboardSummary["byRiskLevel"];
  name: string;
  color: string;
}

const RISK_LEVELS: RiskItem[] = [
  { key: "none_detected", name: "None detected", color: "#10b981" },
  { key: "low", name: "Low", color: "#eab308" },
  { key: "medium", name: "Medium", color: "#f97316" },
  { key: "high", name: "High", color: "#ef4444" },
];

export function RiskLevelDonutChart({ byRiskLevel }: RiskLevelDonutChartProps) {
  const total = RISK_LEVELS.reduce((sum, item) => sum + (byRiskLevel[item.key] || 0), 0);

  // SVG Donut calculations:
  // Center: 85, 85. Radius: 56. StrokeWidth: 20.
  const r = 56;
  const circumference = 2 * Math.PI * r; // ~351.858

  let accumulatedPercent = 0;
  const segments = RISK_LEVELS.map((item) => {
    const value = byRiskLevel[item.key] || 0;
    const fraction = total > 0 ? value / total : 0;
    const strokeDash = fraction * circumference;
    const gap = value > 0 && total > value ? 3.5 : 0;
    const strokeDasharray = `${Math.max(strokeDash - gap, 0)} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += fraction;

    return {
      ...item,
      value,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm h-full flex flex-col justify-between">
      <CardContent className="p-0 flex flex-col justify-between h-full">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Risk level distribution
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Highest severity found in each report
          </p>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-5 sm:flex-row">
          {/* Donut Chart SVG */}
          <div className="relative flex items-center justify-center shrink-0 w-[170px] h-[170px]" aria-hidden="true">
            <svg
              viewBox="0 0 170 170"
              className="w-full h-full transform -rotate-90"
            >
              {total === 0 ? (
                <circle
                  cx="85"
                  cy="85"
                  r={r}
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="20"
                />
              ) : (
                segments.map((seg) => {
                  if (seg.value === 0) return null;
                  return (
                    <circle
                      key={seg.key}
                      cx="85"
                      cy="85"
                      r={r}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="20"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                    />
                  );
                })
              )}
            </svg>

            {/* Central number inside hole */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold leading-none text-slate-900">
                {total}
              </span>
              <span className="mt-1 text-[11px] font-medium text-slate-400">
                scans
              </span>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="flex flex-1 flex-col justify-center gap-3 w-full">
            {RISK_LEVELS.map((item) => {
              const count = byRiskLevel[item.key] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <div key={item.key} className="flex items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {pct}% of scans
                      </div>
                    </div>
                  </div>
                  <span
                    data-testid={item.key === "high" ? "stat-high-risk-legend" : undefined}
                    className="text-xs font-bold text-slate-900 ml-3"
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accessible text alternative for screen readers and WCAG compliance */}
        <div className="sr-only">
          <h3>Risk level breakdown table</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Risk Level</th>
                <th scope="col">Count</th>
                <th scope="col">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {RISK_LEVELS.map((row) => (
                <tr key={row.key}>
                  <td>{row.name}</td>
                  <td>{byRiskLevel[row.key]}</td>
                  <td>
                    {total > 0
                      ? `${Math.round(((byRiskLevel[row.key] || 0) / total) * 100)}%`
                      : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
