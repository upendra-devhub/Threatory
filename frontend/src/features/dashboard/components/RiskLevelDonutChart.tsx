"use client";

import type { DashboardSummary, RiskLevel } from "@threatory/contracts";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface RiskLevelDonutChartProps {
  byRiskLevel: DashboardSummary["byRiskLevel"];
}

const RISK_CONFIG: Record<RiskLevel, { name: string; color: string }> = {
  none_detected: { name: "None detected", color: "#64748b" },
  low: { name: "Low risk", color: "#0284c7" },
  medium: { name: "Medium risk", color: "#d97706" },
  high: { name: "High risk", color: "#dc2626" },
};

export function RiskLevelDonutChart({ byRiskLevel }: RiskLevelDonutChartProps) {
  const data = (Object.keys(RISK_CONFIG) as RiskLevel[]).map((level) => ({
    key: level,
    name: RISK_CONFIG[level].name,
    value: byRiskLevel[level],
    color: RISK_CONFIG[level].color,
  }));

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle as="h2" className="text-sm font-semibold text-foreground">
          Risk level distribution
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
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [String(val), "Scans"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "0.375rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
                  {data.map((row) => (
                    <tr key={row.key}>
                      <td>{row.name}</td>
                      <td>{row.value}</td>
                      <td>{total > 0 ? `${Math.round((row.value / total) * 100)}%` : "0%"}</td>
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
