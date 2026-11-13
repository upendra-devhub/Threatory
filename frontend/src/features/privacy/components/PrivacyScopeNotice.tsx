import React from "react";
import { AlertTriangle, Shield, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PrivacyScopeNotice() {
  return (
    <section aria-label="Privacy analysis scope notice">
      <Card className="border-border bg-muted/40 shadow-xs" data-testid="privacy-scope-notice">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
          <CardTitle as="h2" className="text-sm sm:text-base font-semibold text-foreground">
            Analysis Scope and Privacy Notice
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* What Threatory does */}
          <div className="rounded-md border border-border/80 bg-background/80 p-3.5 space-y-2">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs sm:text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
              What Threatory analyses:
            </span>
            <ul className="list-disc pl-4 space-y-1.5 text-xs">
              <li>
                <strong>Only information explicitly supplied:</strong> Evaluates only the handles, profile entries, and text you submit in this form.
              </li>
              <li>
                <strong>Local structural analysis:</strong> Identifies pattern signals such as username reuse across services, birth year suffixes, and exposed contact information.
              </li>
              <li>
                <strong>Automatic masking:</strong> Sanitizes and masks all sensitive entities (emails, phones, secret keys, payment cards, usernames) in reports and storage.
              </li>
            </ul>
          </div>

          {/* What Threatory does not do */}
          <div className="rounded-md border border-border/80 bg-background/80 p-3.5 space-y-2">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs sm:text-sm">
              <XCircle className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
              What Threatory does NOT do:
            </span>
            <ul className="list-disc pl-4 space-y-1.5 text-xs">
              <li>
                <strong>No internet-wide search:</strong> Does not search external social media platforms, websites, or directories for your accounts.
              </li>
              <li>
                <strong>No profile page visits:</strong> Profile URLs are parsed strictly as offline text; Threatory never visits, crawls, or contacts remote profiles.
              </li>
              <li>
                <strong>No identity verification:</strong> Does not verify account ownership, confirm real-world personhood, or link individuals.
              </li>
              <li>
                <strong>No breach database lookup:</strong> Does not consult third-party breach databases or leak repositories.
              </li>
            </ul>
          </div>
        </div>

        {/* Submission guidelines and warning */}
        <div className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50/80 p-3.5 text-amber-950 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <span className="font-semibold text-amber-900">Submission Safety Guidelines:</span>
            <p>
              Submit only information you are authorized to process. <strong>Do not enter passwords, PINs, or government identification numbers.</strong> Threatory does not provide password storage, password cracking, or password management features, and no password input field is provided on this platform.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
    </section>
  );
}
