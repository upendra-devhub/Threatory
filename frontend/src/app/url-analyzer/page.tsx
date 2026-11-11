import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UrlAnalyzerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="URL Analyzer"
        description="Inspects a link structurally without visiting, fetching, or resolving the target."
      />
      <Card>
        <CardHeader>
          <CardTitle>URL analysis workflow</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The URL submission form and rule engine will be implemented in a later checkpoint.
        </CardContent>
      </Card>
    </div>
  );
}
