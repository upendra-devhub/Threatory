import type { Metadata } from "next";
import { WebsiteAuditorView } from "@/features/website";

export const metadata: Metadata = {
  title: "Website Security Auditor",
  description: "Review public security configurations including TLS certificates, HTTP headers, cookies, and DNS.",
};

export default function WebsiteAuditorPage() {
  return <WebsiteAuditorView />;
}
