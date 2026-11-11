import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ReportSkeleton() {
  return (
    <div role="status" aria-label="Loading report" className="space-y-6">
      <span className="sr-only">Loading report…</span>

      {/* Heading skeleton */}
      <div className="space-y-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-8 w-3/4 max-w-lg" />
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* Assessment skeleton */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-56" />
            </div>
            <Skeleton className="h-20 w-44" />
          </div>
        </CardContent>
      </Card>

      {/* Finding group & cards skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-20" />
        </div>
        {[0, 1].map((item) => (
          <Card key={item}>
            <CardHeader className="gap-2 border-b border-border/70 pb-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-60" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Limitations skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </CardContent>
      </Card>
    </div>
  );
}
