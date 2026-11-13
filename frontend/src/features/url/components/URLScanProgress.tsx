import React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function URLScanProgress() {
  return (
    <Card className="border-primary/20 bg-primary/[0.02]" role="status" aria-live="polite">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            Analyzing URL indicators...
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            The submitted URL is examined as text. Threatory does not visit the destination website.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
