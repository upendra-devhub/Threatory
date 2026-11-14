"use client";

import { useState } from "react";
import * as navigation from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Report } from "@threatory/contracts";
import { Check, Copy, FileCode, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteScan } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { generateReportMarkdown } from "./format-markdown";

function useSafeRouterPush(): (url: string) => void {
  try {
    if (typeof navigation.useRouter === "function") {
      const r = navigation.useRouter();
      if (r && typeof r.push === "function") {
        return (url: string) => r.push(url);
      }
    }
  } catch {
    // Router not mounted
  }

  return (url: string) => {
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
  };
}

function useSafeQueryClient() {
  try {
    return useQueryClient();
  } catch {
    return undefined;
  }
}

export interface ReportActionsProps {
  report: Report;
  className?: string;
}

export function ReportActions({ report, className }: ReportActionsProps) {
  const routerPush = useSafeRouterPush();
  const queryClient = useSafeQueryClient();

  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCopyMarkdown = async () => {
    try {
      const markdown = generateReportMarkdown(report);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      }
    } catch {
      // Clipboard fallback
    } finally {
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    }
  };

  const handleCopyJson = async () => {
    try {
      const jsonStr = JSON.stringify(report, null, 2);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonStr);
      }
    } catch {
      // Clipboard fallback
    } finally {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteScan(report.scanId);
      if (queryClient) {
        await queryClient.invalidateQueries({ queryKey: ["history"] });
        await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        queryClient.removeQueries({ queryKey: ["report", report.scanId] });
      }
      setIsDialogOpen(false);
      routerPush("/history");
    } catch (err) {
      setIsDeleting(false);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete report. Please try again."
      );
    }
  };

  return (
    <>
      <div
        data-no-print
        className={cn(
          "no-print flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4",
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyMarkdown}
            className="h-8 gap-1.5 text-xs"
            aria-label="Copy report as Markdown"
          >
            {copiedMd ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied Markdown!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy Markdown</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyJson}
            className="h-8 gap-1.5 text-xs"
            aria-label="Copy report as JSON"
          >
            {copiedJson ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied JSON!</span>
              </>
            ) : (
              <>
                <FileCode className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy JSON</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1.5 text-xs"
            aria-label="Print report"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Print</span>
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete report"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Delete report</span>
        </Button>
      </div>

      {deleteError ? (
        <div data-no-print className="no-print text-xs text-destructive">
          {deleteError}
        </div>
      ) : null}

      <DeleteConfirmDialog
        isOpen={isDialogOpen}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!isDeleting) setIsDialogOpen(false);
        }}
      />
    </>
  );
}
