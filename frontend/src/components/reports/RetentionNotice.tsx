import { Clock } from "lucide-react";
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
        "flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-950 sm:items-center",
        className
      )}
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <p className="leading-relaxed">
        <strong className="font-semibold text-sky-900">Session storage &amp; retention:</strong>{" "}
        Reports belong to this browser session and expire automatically: privacy reports expire
        after 7 days, and URL and website reports after 30 days.
      </p>
    </div>
  );
}
