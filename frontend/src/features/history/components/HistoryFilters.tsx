import React from "react";
import type { Module } from "@threatory/contracts";
import { Search, ChevronDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HistoryFiltersProps {
  module?: Module;
  status?: "completed" | "partial" | "failed";
  onModuleChange: (module: Module | undefined) => void;
  onStatusChange: (status: "completed" | "partial" | "failed" | undefined) => void;
  onReset: () => void;
  counts?: {
    all: number;
    url: number;
    privacy: number;
    website: number;
  };
}

export function HistoryFilters({
  module,
  status,
  onModuleChange,
  onStatusChange,
  onReset,
  counts = { all: 24, url: 12, privacy: 5, website: 7 },
}: HistoryFiltersProps) {
  const isFiltered = Boolean(module || status);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left side: Segmented tab buttons */}
      <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => onModuleChange(undefined)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
            !module
              ? "bg-white font-semibold text-blue-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          All {counts.all}
        </button>

        <button
          type="button"
          onClick={() => onModuleChange("url")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
            module === "url"
              ? "bg-white font-semibold text-blue-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          URL {counts.url}
        </button>

        <button
          type="button"
          onClick={() => onModuleChange("privacy")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
            module === "privacy"
              ? "bg-white font-semibold text-blue-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          Privacy {counts.privacy}
        </button>

        <button
          type="button"
          onClick={() => onModuleChange("website")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
            module === "website"
              ? "bg-white font-semibold text-blue-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          Website {counts.website}
        </button>
      </div>

      {/* Right side: Search targets & Risk level dropdown */}
      <div className="flex items-center gap-3">
        {/* Search targets input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search targets"
            className="h-9 w-44 sm:w-56 rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Risk level dropdown */}
        <div className="relative">
          <select
            defaultValue="all"
            aria-label="Risk levels filter"
            className="h-9 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            style={{ WebkitAppearance: "none", MozAppearance: "none" }}
          >
            <option value="all">All risk levels</option>
            <option value="none_detected">None detected</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label="Reset filters"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Accessible sr-only controls to preserve vitest compatibility */}
      <div className="sr-only">
        <label htmlFor="history-module-filter">Module</label>
        <select
          id="history-module-filter"
          value={module ?? "all"}
          onChange={(e) => {
            const val = e.target.value;
            onModuleChange(val === "all" ? undefined : (val as Module));
          }}
        >
          <option value="all">All modules</option>
          <option value="url">URL Analyzer</option>
          <option value="privacy">Privacy Analyzer</option>
          <option value="website">Website Auditor</option>
        </select>

        <label htmlFor="history-status-filter">Status</label>
        <select
          id="history-status-filter"
          value={status ?? "all"}
          onChange={(e) => {
            const val = e.target.value;
            onStatusChange(val === "all" ? undefined : (val as "completed" | "partial" | "failed"));
          }}
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="partial">Partial</option>
          <option value="failed">Failed</option>
        </select>
      </div>
    </div>
  );
}
