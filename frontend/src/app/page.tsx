import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Deterministic, evidence-backed checks for suspicious URLs, personal privacy exposure, and website security configuration."
      />
      <Card>
        <CardHeader>
          <CardTitle>Platform dashboard</CardTitle>
          <CardDescription>
            Summary statistics and recent scan activity will appear here in a later checkpoint.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use the navigation menu to browse the analyzer modules or open a saved report directly at{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-foreground">
            /reports/&lt;scanId&gt;
          </code>
          .
        </CardContent>
      </Card>
    </div>
  );
}
