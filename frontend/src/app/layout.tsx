import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Threatory — Web Security & Privacy Analysis",
    template: "%s | Threatory",
  },
  description:
    "Deterministic, evidence-backed security analysis for URLs, personal privacy exposure, and website security configuration.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Threatory — Web Security & Privacy Analysis",
    description:
      "Deterministic, evidence-backed security analysis for URLs, personal privacy exposure, and website security configuration.",
    type: "website",
  },
};

export interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
