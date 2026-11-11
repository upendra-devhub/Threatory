export interface ReportPageProps {
  params: Promise<{ scanId: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { scanId } = await params;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Saved Report</h1>
      <p className="mt-2 text-sm text-muted-foreground">Report ID: {scanId}</p>
    </main>
  );
}

