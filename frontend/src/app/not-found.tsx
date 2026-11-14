import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-md w-full text-center border-border">
        <CardHeader className="flex flex-col items-center pb-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
            <FileQuestion className="w-6 h-6" aria-hidden="true" />
          </div>
          <CardTitle as="h1" className="text-xl font-bold">
            Page Not Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The requested page does not exist or may have been moved. If you were looking for a scan report, it may have expired or been deleted.
          </p>
          <div className="pt-2">
            <Button asChild variant="default">
              <Link href="/" className="inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
