"use client";

import Link from "next/link";
import { ChevronRight, Globe, Link2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StartScanCard() {
  const tools = [
    {
      title: "URL Analyzer",
      description: "Is this link suspicious?",
      href: "/url-analyzer",
      icon: Link2,
      iconColor: "#2563eb",
      bgColor: "#eff6ff",
    },
    {
      title: "Privacy Analyzer",
      description: "What am I exposing?",
      href: "/privacy-analyzer",
      icon: User,
      iconColor: "#059669",
      bgColor: "#ecfdf5",
    },
    {
      title: "Website Auditor",
      description: "Is my site configured safely?",
      href: "/website-auditor",
      icon: Globe,
      iconColor: "#d97706",
      bgColor: "#fffbeb",
    },
  ];

  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm h-full flex flex-col justify-between">
      <CardContent className="p-0 flex flex-col justify-between h-full">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Start a scan
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Pick the tool that fits your question
          </p>
        </div>

        <div className="mt-4 space-y-2.5">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                href={tool.href}
                className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 transition-all hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: tool.bgColor, color: tool.iconColor }}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 truncate">
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {tool.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {tool.description}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
