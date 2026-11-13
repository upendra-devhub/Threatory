import React from "react";
import { Info, AlertTriangle, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PrivacyScopeNotice() {
  return (
    <Card className="border-border bg-muted/40">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
          <CardTitle as="h2" className="text-sm sm:text-base font-semibold text-foreground">
            Analysis Scope and Privacy Notice
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md border border-border/60 bg-background/60 p-3 space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
              What Threatory does:
            </span>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>Analyses <strong>only</strong> the profile handles and text explicitly supplied here.</li>
              <li>Detects structural patterns like username reuse, birth years, and exposed credentials.</li>
              <li>Masks all sensitive entities before saving or presenting the security report.</li>
            </ul>
          </div>

          <div className="rounded-md border border-border/60 bg-background/60 p-3 space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              What Threatory does NOT do:
            </span>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>Does not search the internet or query social media platforms.</li>
              <li>Does not visit, crawl, or fetch submitted profile URLs.</li>
              <li>Does not verify real-world identity or account ownership.</li>
              <li>Does not search data breach databases or external sources.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-amber-950 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <span className="font-semibold">Important Submission Safety Guidelines:</span>
            <p>
              Submit only information you are authorized to process. <strong>Do not submit passwords, PINs, or government identification numbers.</strong> Threatory does not provide password storage or verification services.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
