import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HistoryPaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (newPage: number) => void;
}

export function HistoryPagination({
  page,
  limit,
  total,
  onPageChange,
}: HistoryPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-2 text-sm text-muted-foreground">
      <div className="text-xs">
        Showing <span className="font-medium text-foreground">{startItem}</span> to{" "}
        <span className="font-medium text-foreground">{endItem}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> scans
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Go to previous page"
            className="h-8 px-2"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Previous</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Go to next page"
            className="h-8 px-2"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Next</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
