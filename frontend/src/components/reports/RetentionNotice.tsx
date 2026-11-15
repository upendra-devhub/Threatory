import React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RetentionNoticeProps {
  className?: string;
}

export function RetentionNotice({ className }: RetentionNoticeProps) {
  return (
    <div
      role="region"
      aria-label="Data retention notice"
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border border-blue-100 bg-[#eff6ff] p-3.5 text-xs text-slate-700",
        className
      )}
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <p className="leading-relaxed">
        <span>
          Privacy reports are kept for 7 days and other reports for 30 days, then deleted automatically. You can delete any report earlier.
        </span>
        <span className="sr-only">
          Reports belong to this browser session and expire automatically: privacy reports expire after 7 days, and URL and website reports after 30 days.
        </span>
      </p>
    </div>
  );
}
