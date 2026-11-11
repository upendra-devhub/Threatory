import type { Finding } from "@threatory/contracts";
import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./EmptyState";
import { FindingCard } from "./FindingCard";

const CATEGORY_LABELS: Record<string, string> = {
  host: "Host & URL Structure",
  reputation: "Reputation & Feeds",
  tls: "TLS & Certificates",
  headers: "HTTP Security Headers",
  cookies: "Cookies",
  dns: "DNS & Email Authentication",
  contact: "Contact & Sensitive Data",
  username: "Username Exposure",
};

export function formatCategoryHeading(category: string): string {
  const known = CATEGORY_LABELS[category];
  if (known) {
    return known;
  }
  return category
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export interface FindingGroupProps {
  findings: Finding[];
}

export function FindingGroup({ findings }: FindingGroupProps) {
  const baseId = useId();

  if (findings.length === 0) {
    return (
      <EmptyState
        title="No findings available"
        description="No rule findings were recorded for this report. The absence of findings does not confirm that all checks passed or that the target is free of risk."
      />
    );
  }

  const grouped = new Map<string, Finding[]>();
  for (const finding of findings) {
    const existing = grouped.get(finding.category);
    if (existing) {
      existing.push(finding);
    } else {
      grouped.set(finding.category, [finding]);
    }
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([category, groupFindings], index) => {
        const headingId = `${baseId}-category-${index}`;

        return (
          <section key={category} aria-labelledby={headingId} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <h3 id={headingId} className="text-base font-semibold text-foreground">
                {formatCategoryHeading(category)}
              </h3>
              <Badge variant="secondary">
                {groupFindings.length} {groupFindings.length === 1 ? "finding" : "findings"}
              </Badge>
            </div>
            <div className="space-y-3">
              {groupFindings.map((finding, findingIndex) => (
                <FindingCard key={`${finding.code}-${findingIndex}`} finding={finding} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
