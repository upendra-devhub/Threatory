import type { Metadata } from "next";
import { WebsiteAuditorView, DEFAULT_WEBSITE_DEMO_REPORT } from "@/features/website";

export const metadata: Metadata = {
  title: "Website Security Auditor",
  description: "Review public security configurations including TLS certificates, HTTP headers, cookies, and DNS.",
};

export default function WebsiteAuditorPage() {
  return (
    <WebsiteAuditorView
      initialUrl="https://example.com"
      initialAuthorised={true}
      initialReport={DEFAULT_WEBSITE_DEMO_REPORT}
    />
  );
}
