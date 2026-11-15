import type { Metadata } from "next";
import { URLAnalyzerView, DEFAULT_URL_DEMO_REPORT } from "@/features/url";

export const metadata: Metadata = {
  title: "URL Analyzer",
  description: "Inspect links as data to detect phishing signals and rule-based risk indicators.",
};

export default function UrlAnalyzerPage() {
  return <URLAnalyzerView initialReport={DEFAULT_URL_DEMO_REPORT} />;
}
