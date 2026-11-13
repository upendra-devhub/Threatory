import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface URLDetailsCardProps {
  details?: Record<string, unknown>;
}

function safeString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return null;
}

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  return null;
}

function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  return [];
}

export function URLDetailsCard({ details }: URLDetailsCardProps) {
  if (!details || typeof details !== "object") {
    return null;
  }

  const host = safeString(details.host);
  const registrableDomain = safeString(details.registrableDomain);
  const scheme = safeString(details.scheme);
  const port = safeNumber(details.port);
  const subdomainLabels = safeStringArray(details.subdomainLabels);
  const queryParamNames = safeStringArray(details.queryParamNames);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle as="h2" className="text-base font-semibold text-foreground">
          Technical URL details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Host */}
          <div className="rounded-md border border-border bg-slate-50/70 p-3 dark:bg-slate-900/50">
            <dt className="text-xs font-medium text-muted-foreground">Host</dt>
            <dd className="mt-1 break-all font-mono text-xs font-semibold text-foreground">
              {host ?? "Not available"}
            </dd>
          </div>

          {/* Registrable Domain */}
          <div className="rounded-md border border-border bg-slate-50/70 p-3 dark:bg-slate-900/50">
            <dt className="text-xs font-medium text-muted-foreground">Registrable domain</dt>
            <dd className="mt-1 break-all font-mono text-xs text-foreground">
              {registrableDomain ?? "None (IP or standalone host)"}
            </dd>
          </div>

          {/* Port */}
          <div className="rounded-md border border-border bg-slate-50/70 p-3 dark:bg-slate-900/50">
            <dt className="text-xs font-medium text-muted-foreground">Port</dt>
            <dd className="mt-1 font-mono text-xs text-foreground">
              {port !== null ? (
                <span>Explicit port: {port}</span>
              ) : (
                <span className="text-muted-foreground">Default (standard scheme port)</span>
              )}
            </dd>
          </div>

          {/* Scheme */}
          {scheme && (
            <div className="rounded-md border border-border bg-slate-50/70 p-3 dark:bg-slate-900/50">
              <dt className="text-xs font-medium text-muted-foreground">Scheme</dt>
              <dd className="mt-1 font-mono text-xs text-foreground">{scheme}</dd>
            </div>
          )}

          {/* Subdomain labels */}
          <div className="rounded-md border border-border bg-slate-50/70 p-3 dark:bg-slate-900/50">
            <dt className="text-xs font-medium text-muted-foreground">Subdomain labels</dt>
            <dd className="mt-1 text-xs">
              {subdomainLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {subdomainLabels.map((label, idx) => (
                    <Badge
                      key={`${label}-${idx}`}
                      variant="outline"
                      className="font-mono text-[11px] font-normal"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground font-mono text-xs">None</span>
              )}
            </dd>
          </div>

          {/* Query Parameter Names (names only, NEVER values) */}
          <div className="rounded-md border border-border bg-slate-50/70 p-3 dark:bg-slate-900/50">
            <dt className="text-xs font-medium text-muted-foreground">
              Query parameter names
            </dt>
            <dd className="mt-1 text-xs">
              {queryParamNames.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {queryParamNames.map((paramName, idx) => (
                    <Badge
                      key={`${paramName}-${idx}`}
                      variant="secondary"
                      className="font-mono text-[11px] font-medium"
                    >
                      {paramName}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground font-mono text-xs">None detected</span>
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
