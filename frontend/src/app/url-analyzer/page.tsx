import type { Metadata } from "next";
import { URLAnalyzerView } from "@/features/url";
import { ProtectedRoute } from "@/features/auth";

export const metadata: Metadata = {
  title: "URL Analyzer",
  description: "Inspect links as data to detect phishing signals and rule-based risk indicators.",
};

export default function UrlAnalyzerPage() {
  return (
    <ProtectedRoute>
      <URLAnalyzerView />
    </ProtectedRoute>
  );
}

