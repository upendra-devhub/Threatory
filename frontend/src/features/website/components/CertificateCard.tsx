import React from "react";
import { ShieldCheck, ShieldAlert, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CertificateDetails {
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  protocol?: string;
  daysRemaining?: number;
  authorized?: boolean;
  authorizationError?: string;
}

export interface CertificateCardProps {
  certificate?: CertificateDetails | null;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Unknown";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toUTCString();
  } catch {
    return dateStr;
  }
}

export function CertificateCard({ certificate }: CertificateCardProps) {
  if (!certificate) {
    return (
      <Card data-testid="certificate-summary-card">
        <CardHeader className="pb-3">
          <CardTitle as="h2" className="text-base font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Certificate summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            No certificate details were recorded or retrieved for this target.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isAuthorized = certificate.authorized === true;

  return (
    <Card data-testid="certificate-summary-card">
      <CardHeader className="pb-3 border-b border-border/70 bg-slate-50/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h2" className="text-base font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Certificate summary</span>
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1 font-medium text-xs",
              isAuthorized
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-red-400 bg-red-50 text-red-900"
            )}
          >
            {isAuthorized ? (
              <>
                <ShieldCheck className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                <span>Authorized</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-3 w-3 text-destructive" aria-hidden="true" />
                <span>Unauthorized / Untrusted</span>
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-border bg-slate-50/70 p-2.5">
            <dt className="font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">
              Subject
            </dt>
            {/* STRICT PLAIN TEXT: never wrapped in <a> or Link */}
            <dd className="mt-1 font-mono text-foreground break-all" data-testid="cert-subject">
              {certificate.subject || "Not specified"}
            </dd>
          </div>

          <div className="rounded-md border border-border bg-slate-50/70 p-2.5">
            <dt className="font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">
              Issuer
            </dt>
            <dd className="mt-1 font-mono text-foreground break-all" data-testid="cert-issuer">
              {certificate.issuer || "Not specified"}
            </dd>
          </div>

          <div className="rounded-md border border-border bg-slate-50/70 p-2.5">
            <dt className="font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">
              Valid From
            </dt>
            <dd className="mt-1 font-mono text-foreground" data-testid="cert-valid-from">
              {formatDate(certificate.validFrom)}
            </dd>
          </div>

          <div className="rounded-md border border-border bg-slate-50/70 p-2.5">
            <dt className="font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">
              Valid To (Expires)
            </dt>
            <dd className="mt-1 font-mono text-foreground" data-testid="cert-valid-to">
              {formatDate(certificate.validTo)}
            </dd>
          </div>

          <div className="rounded-md border border-border bg-slate-50/70 p-2.5">
            <dt className="font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">
              Negotiated Protocol
            </dt>
            <dd className="mt-1 font-mono text-foreground" data-testid="cert-protocol">
              {certificate.protocol || "Not observed"}
            </dd>
          </div>

          <div className="rounded-md border border-border bg-slate-50/70 p-2.5">
            <dt className="font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">
              Days Remaining
            </dt>
            <dd className="mt-1 font-mono text-foreground" data-testid="cert-days-remaining">
              {typeof certificate.daysRemaining === "number"
                ? `${certificate.daysRemaining} ${certificate.daysRemaining === 1 ? "day" : "days"}`
                : "Unknown"}
            </dd>
          </div>

          {certificate.authorizationError && (
            <div className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
              <dt className="font-semibold text-destructive uppercase text-[11px] tracking-wide">
                Authorization Error
              </dt>
              <dd className="mt-1 font-mono text-xs text-destructive break-all" data-testid="cert-auth-error">
                {certificate.authorizationError}
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
