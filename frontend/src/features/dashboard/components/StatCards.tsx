import type { DashboardSummary } from "@threatory/contracts";
import { Globe, LayoutGrid, Link2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface StatCardsProps {
  summary: DashboardSummary;
}

export function StatCards({ summary }: StatCardsProps) {
  const cards = [
    {
      title: "Total scans",
      count: summary.totalScans,
      description: "All saved reports",
      icon: LayoutGrid,
      iconColor: "#2563eb",
      bgColor: "#eff6ff",
      testId: "stat-total-scans",
    },
    {
      title: "URL checks",
      count: summary.byModule.url,
      description: "Analysed as data, never visited",
      icon: Link2,
      iconColor: "#2563eb",
      bgColor: "#eff6ff",
      testId: "stat-url-scans",
    },
    {
      title: "Privacy reviews",
      count: summary.byModule.privacy,
      description: "Only what you submitted",
      icon: User,
      iconColor: "#059669",
      bgColor: "#ecfdf5",
      testId: "stat-privacy-scans",
    },
    {
      title: "Website audits",
      count: summary.byModule.website,
      description: "Authorised targets only",
      icon: Globe,
      iconColor: "#d97706",
      bgColor: "#fffbeb",
      testId: "stat-website-scans",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow"
          >
            <CardContent className="p-0 flex flex-col justify-between h-full">
              <div className="flex items-start gap-3.5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: card.bgColor, color: card.iconColor }}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-500">
                    {card.title}
                  </div>
                  <div
                    data-testid={card.testId}
                    className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900 leading-none"
                  >
                    {card.count}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400 font-normal">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}

      {/* Screen-reader / test fixture fallback for high-risk count */}
      <span data-testid="stat-high-risk" className="sr-only">
        {summary.byRiskLevel.high}
      </span>
    </div>
  );
}
