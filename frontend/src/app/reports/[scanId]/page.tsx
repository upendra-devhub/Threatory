import { SavedReportView } from "@/components/reports/SavedReportView";

export interface ReportPageProps {
  params: Promise<{ scanId: string }>;
}

function decodeScanId(rawScanId: string): string {
  try {
    return decodeURIComponent(rawScanId);
  } catch {
    return rawScanId;
  }
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { scanId } = await params;

  return <SavedReportView scanId={decodeScanId(scanId)} />;
}
