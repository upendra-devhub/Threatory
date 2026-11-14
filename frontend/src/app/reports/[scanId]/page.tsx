import type { Metadata } from "next";
import { SavedReportView } from "@/components/reports/SavedReportView";

export const metadata: Metadata = {
  title: "Report Details",
  robots: {
    index: false,
    follow: false,
  },
};

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
