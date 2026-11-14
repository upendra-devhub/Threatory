import { Suspense } from "react";
import { HistoryView } from "@/features/history";
import { Skeleton } from "@/components/ui/skeleton";

function HistoryFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistoryFallback />}>
      <HistoryView />
    </Suspense>
  );
}
