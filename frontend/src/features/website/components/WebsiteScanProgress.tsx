import React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function WebsiteScanProgress() {
  return (
    <Card
      className="border-primary/20 bg-primary/[0.02]"
      role="status"
      aria-live="polite"
      data-testid="website-scan-progress"
    >
      <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            Auditing website security configuration...
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Passive checks are inspecting TLS certificates, HTTP security headers, cookies, and DNS authentication records. A scan can take up to 25 seconds to complete.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
