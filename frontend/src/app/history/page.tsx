import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="History"
        description="Browse and manage saved reports associated with your browser session."
      />
      <Card>
        <CardHeader>
          <CardTitle>Scan history</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Paginated history and report filtering will be implemented in a later checkpoint.
        </CardContent>
      </Card>
    </div>
  );
}
