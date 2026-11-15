"use client";

import Link from "next/link";
import { ChevronRight, Globe, Link2, User, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export interface NewScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewScanModal({ isOpen, onClose }: NewScanModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tools = [
    {
      title: "URL Analyzer",
      description: "Inspect links against threat feeds, typosquatting, and heuristic checks.",
      href: "/url-analyzer",
      icon: Link2,
      iconClass: "text-blue-600",
      bgClass: "bg-blue-50",
      hoverClass: "hover:border-blue-200 hover:bg-blue-50/30",
    },
    {
      title: "Privacy Analyzer",
      description: "Detect exposed credentials, handles, email addresses, and phone numbers.",
      href: "/privacy-analyzer",
      icon: User,
      iconClass: "text-emerald-600",
      bgClass: "bg-emerald-50",
      hoverClass: "hover:border-emerald-200 hover:bg-emerald-50/30",
    },
    {
      title: "Website Auditor",
      description: "Non-invasively audit TLS configurations, security headers, cookies, and DNS.",
      href: "/website-auditor",
      icon: Globe,
      iconClass: "text-amber-600",
      bgClass: "bg-amber-50",
      hoverClass: "hover:border-amber-200 hover:bg-amber-50/30",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-scan-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 id="new-scan-title" className="text-lg font-bold text-slate-900">
              Start a new scan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an analyzer to run an evidence-backed security check
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full text-slate-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                href={tool.href}
                onClick={onClose}
                className={`group flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/40 p-4 transition-all ${tool.hoverClass}`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tool.bgClass}`}
                  >
                    <Icon className={`h-5 w-5 ${tool.iconClass}`} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {tool.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {tool.description}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
