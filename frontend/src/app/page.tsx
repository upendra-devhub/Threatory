import type { Metadata } from "next";
import { LandingPageView } from "@/features/landing/LandingPageView";

export const metadata: Metadata = {
  title: "Threatory — See what a link, a profile or a website is really exposing",
  description:
    "Threatory runs security checks and explains the evidence behind every result in plain language.",
};

export default function HomePage() {
  return <LandingPageView />;
}
