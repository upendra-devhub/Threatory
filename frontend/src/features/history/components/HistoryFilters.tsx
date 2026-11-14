import type { Module } from "@threatory/contracts";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HistoryFiltersProps {
  module?: Module;
  status?: "completed" | "partial" | "failed";
  onModuleChange: (module: Module | undefined) => void;
  onStatusChange: (status: "completed" | "partial" | "failed" | undefined) => void;
  onReset: () => void;
}

export function HistoryFilters({
  module,
  status,
  onModuleChange,
  onStatusChange,
  onReset,
}: HistoryFiltersProps) {
  const isFiltered = Boolean(module || status);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" aria-hidden="true" />
          <span>Filters:</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="history-module-filter" className="text-xs font-medium text-foreground">
            Module
          </label>
          <select
            id="history-module-filter"
            value={module ?? "all"}
            onChange={(e) => {
              const val = e.target.value;
              onModuleChange(val === "all" ? undefined : (val as Module));
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All modules</option>
            <option value="url">URL Analyzer</option>
            <option value="privacy">Privacy Analyzer</option>
            <option value="website">Website Auditor</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="history-status-filter" className="text-xs font-medium text-foreground">
            Status
          </label>
          <select
            id="history-status-filter"
            value={status ?? "all"}
            onChange={(e) => {
              const val = e.target.value;
              onStatusChange(val === "all" ? undefined : (val as "completed" | "partial" | "failed"));
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {isFiltered ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-8 gap-1.5 text-xs"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          <span>Reset filters</span>
        </Button>
      ) : null}
    </div>
  );
}
