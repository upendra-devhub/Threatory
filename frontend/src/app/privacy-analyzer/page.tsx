import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyAnalyzerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Privacy Analyzer"
        description="Reviews user-supplied usernames and text with explicit consent and masks detected values."
      />
      <Card>
        <CardHeader>
          <CardTitle>Privacy exposure workflow</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The privacy input form and masking analyzer will be implemented in a later checkpoint.
        </CardContent>
      </Card>
    </div>
  );
}
