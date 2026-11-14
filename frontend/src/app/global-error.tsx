"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";
import "./globals.css";

export interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global application error boundary caught an error:", error.message);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 border rounded-lg bg-card text-card-foreground text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertCircle className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold">Application Error</h1>
          <p className="text-sm text-muted-foreground">
            A critical error interrupted the application shell. Please reload the application or try again.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button onClick={() => reset()} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reload application
            </Button>
            <Button asChild variant="default">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
