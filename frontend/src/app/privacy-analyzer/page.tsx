import type { Metadata } from "next";
import { PrivacyAnalyzerView } from "@/features/privacy/components/PrivacyAnalyzerView";

export const metadata: Metadata = {
  title: "Privacy Exposure Analyzer",
  description: "Detect personal information exposure and cross-profile correlation in usernames and text.",
};

export default function PrivacyAnalyzerPage() {
  return <PrivacyAnalyzerView />;
}
