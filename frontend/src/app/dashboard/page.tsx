import type { Metadata } from "next";
import { DashboardView } from "@/features/dashboard";
import { ProtectedRoute } from "@/features/auth";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your security scans, risk distributions, and recent assessments.",
};

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardView />
    </ProtectedRoute>
  );
}
