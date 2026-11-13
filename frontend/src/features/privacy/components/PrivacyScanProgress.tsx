import React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PrivacyScanProgress() {
  return (
    <Card className="border-primary/20 bg-primary/[0.02]" role="status" aria-live="polite" data-testid="privacy-scan-progress">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            Analyzing privacy exposure indicators...
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Examining supplied profiles and text for pattern exposures. Threatory does not crawl social networks or fetch profile pages.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
