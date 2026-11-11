import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WebsiteAuditorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Auditor"
        description="Inspects publicly visible HTTPS, TLS, security header, cookie, and email DNS configuration for authorised targets."
      />
      <Card>
        <CardHeader>
          <CardTitle>Website audit workflow</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The website audit form and authorisation workflow will be implemented in a later checkpoint.
        </CardContent>
      </Card>
    </div>
  );
}
