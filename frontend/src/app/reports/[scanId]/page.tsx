import { PageHeader } from "@/components/layout/PageHeader";

export interface ReportPageProps {
  params: Promise<{ scanId: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { scanId } = await params;

  return (
    <div className="space-y-6">
      <PageHeader title="Saved Report" description={`Report ID: ${scanId}`} />
    </div>
  );
}
