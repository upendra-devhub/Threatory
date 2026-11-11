import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help"
        description="Understand Threatory findings, severity levels, limitations, and assessment methodology."
      />
      <Card>
        <CardHeader>
          <CardTitle>Methodology &amp; reading reports</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Detailed guidance and glossary references will be expanded in a later checkpoint.
        </CardContent>
      </Card>
    </div>
  );
}
