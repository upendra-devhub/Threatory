import type { Metadata } from "next";
import { WebsiteAuditorView } from "@/features/website";
import { ProtectedRoute } from "@/features/auth";

export const metadata: Metadata = {
  title: "Website Security Auditor",
  description: "Review public security configurations including TLS certificates, HTTP headers, cookies, and DNS.",
};

export default function WebsiteAuditorPage() {
  return (
    <ProtectedRoute>
      <WebsiteAuditorView />
    </ProtectedRoute>
  );
}

