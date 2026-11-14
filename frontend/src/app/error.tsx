"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log client error without sensitive details
    console.error("Application error boundary caught an error:", error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-md w-full text-center border-destructive/20">
        <CardHeader className="flex flex-col items-center pb-2">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" aria-hidden="true" />
          </div>
          <CardTitle as="h1" className="text-xl font-bold">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred while rendering this page. You can try refreshing the view or returning to the dashboard.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={() => reset()} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Try again
            </Button>
            <Button asChild variant="default">
              <Link href="/" className="gap-2">
                <Home className="w-4 h-4" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
