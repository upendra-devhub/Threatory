import React from "react";
import { Shield, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function WebsiteScopeNotice() {
  return (
    <Card className="border-border bg-card/60" data-testid="website-scope-notice">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Scope of website assessment</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 rounded-md border border-emerald-200 bg-emerald-50/50 p-3 text-emerald-950">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              <span>What is tested</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-emerald-900/90 leading-relaxed">
              <li>Public TLS certificates, validity, and protocol version (TLS 1.2+).</li>
              <li>Standard HTTP security headers (HSTS, CSP, X-Content-Type-Options, framing).</li>
              <li>Cookie security attributes (Secure, HttpOnly, SameSite) without reading values.</li>
              <li>Public DNS and email authentication records (SPF, DMARC, CAA).</li>
            </ul>
          </div>

          <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50/50 p-3 text-amber-950">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-800" aria-hidden="true" />
              <span>What is NOT tested</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-900/90 leading-relaxed">
              <li>No vulnerability exploits or attack payloads are transmitted.</li>
              <li>No brute-force attacks or aggressive automated fuzzing.</li>
              <li>No spidering of internal or authenticated application routes.</li>
              <li>No scanning of private, non-public, or internal IP addresses.</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
