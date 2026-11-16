"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const nextParam = encodeURIComponent(pathname);
      router.replace(`/signin?next=${nextParam}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="space-y-6 py-6" aria-busy="true" aria-live="polite">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl bg-white" />
          <Skeleton className="h-4 w-72 rounded-lg bg-white" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl bg-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
