"use client";

import type { DashboardSummary } from "@threatory/contracts";
import { Card, CardContent } from "@/components/ui/card";

export interface ModuleBarChartProps {
  byModule: DashboardSummary["byModule"];
}

interface ModuleItem {
  key: keyof DashboardSummary["byModule"];
  name: string;
  color: string;
}

const MODULES: ModuleItem[] = [
  {
    key: "url",
    name: "URL Analyzer",
    color: "#2563eb",
  },
  {
    key: "privacy",
    name: "Privacy Analyzer",
    color: "#059669",
  },
  {
    key: "website",
    name: "Website Auditor",
    color: "#ea580c",
  },
];

export function ModuleBarChart({ byModule }: ModuleBarChartProps) {
  const maxCount = Math.max(byModule.url, byModule.privacy, byModule.website, 1);

  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm h-full flex flex-col justify-between">
      <CardContent className="p-0 flex flex-col justify-between h-full">
        <div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Scans by module
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Number of saved reports per tool
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {MODULES.map((item) => {
              const count = byModule[item.key] || 0;
              const widthPct = count > 0 ? Math.max(Math.round((count / maxCount) * 100), 10) : 0;

              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      {item.name}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {count}
                    </span>
                  </div>
                  <div
                    className="h-2.5 w-full rounded-full overflow-hidden"
                    style={{ backgroundColor: "#f1f5f9" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-6 pt-1 text-xs text-slate-400">
          Counts update after every new scan.
        </p>

        {/* Accessible text alternative for screen readers and WCAG compliance */}
        <div className="sr-only">
          <h3>Module breakdown table</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">Count</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((row) => (
                <tr key={row.key}>
                  <td>{row.name}</td>
                  <td>{byModule[row.key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
