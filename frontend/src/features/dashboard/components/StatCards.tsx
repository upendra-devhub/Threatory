import type { DashboardSummary } from "@threatory/contracts";
import { AlertTriangle, Globe, Link2, ShieldCheck, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface StatCardsProps {
  summary: DashboardSummary;
}

export function StatCards({ summary }: StatCardsProps) {
  const cards = [
    {
      title: "Total Scans",
      count: summary.totalScans,
      description: "Total security audits performed in this session",
      icon: ShieldCheck,
      iconClass: "text-primary",
      bgClass: "bg-primary/10",
      testId: "stat-total-scans",
    },
    {
      title: "URL Scans",
      count: summary.byModule.url,
      description: "URLs checked against phishing feeds and heuristics",
      icon: Link2,
      iconClass: "text-blue-600",
      bgClass: "bg-blue-50",
      testId: "stat-url-scans",
    },
    {
      title: "Privacy Scans",
      count: summary.byModule.privacy,
      description: "Public handles audited for identity exposure",
      icon: UserCheck,
      iconClass: "text-purple-600",
      bgClass: "bg-purple-50",
      testId: "stat-privacy-scans",
    },
    {
      title: "Website Scans",
      count: summary.byModule.website,
      description: "Domains audited for TLS, headers, and DNS",
      icon: Globe,
      iconClass: "text-teal-600",
      bgClass: "bg-teal-50",
      testId: "stat-website-scans",
    },
    {
      title: "High Risk",
      count: summary.byRiskLevel.high,
      description: "Audits with critical warnings or high-severity risks",
      icon: AlertTriangle,
      iconClass: summary.byRiskLevel.high > 0 ? "text-red-600" : "text-muted-foreground",
      bgClass: summary.byRiskLevel.high > 0 ? "bg-red-50" : "bg-muted/50",
      testId: "stat-high-risk",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle as="h2" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`flex h-7 w-7 items-center justify-center rounded-md ${card.bgClass}`}>
                <Icon className={`h-4 w-4 ${card.iconClass}`} aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div data-testid={card.testId} className="text-2xl font-bold tracking-tight text-foreground">
                {card.count}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
