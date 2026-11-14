"use client";

import type { DashboardSummary } from "@threatory/contracts";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ModuleBarChartProps {
  byModule: DashboardSummary["byModule"];
}

const MODULE_DISPLAY = [
  { key: "url", name: "URL Analyzer", fill: "#2563eb" },
  { key: "privacy", name: "Privacy", fill: "#7c3aed" },
  { key: "website", name: "Website", fill: "#0d9488" },
] as const;

export function ModuleBarChart({ byModule }: ModuleBarChartProps) {
  const data = MODULE_DISPLAY.map((item) => ({
    name: item.name,
    key: item.key,
    count: byModule[item.key as keyof DashboardSummary["byModule"]],
    fill: item.fill,
  }));

  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle as="h2" className="text-sm font-semibold text-foreground">
          Scans by analyzer module
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            No scan data available yet
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-56 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: unknown) => [String(val), "Scans"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "0.375rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>

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
                  {data.map((row) => (
                    <tr key={row.key}>
                      <td>{row.name}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
