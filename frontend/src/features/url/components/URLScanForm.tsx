"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UrlScanRequest } from "@threatory/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { URLExamples } from "./URLExamples";
import { Loader2 } from "lucide-react";

export interface URLScanFormProps {
  onSubmit: (data: UrlScanRequest) => void | Promise<void>;
  isLoading?: boolean;
  fieldError?: string | null;
  initialValue?: string;
}

export function URLScanForm({
  onSubmit,
  isLoading = false,
  fieldError,
  initialValue = "",
}: URLScanFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<UrlScanRequest>({
    resolver: zodResolver(UrlScanRequest),
    defaultValues: {
      url: initialValue,
    },
    mode: "onSubmit",
  });

  const currentUrl = watch("url") || "";
  const charCount = currentUrl.length;

  useEffect(() => {
    if (fieldError) {
      setError("url", {
        type: "server",
        message: fieldError,
      });
    }
  }, [fieldError, setError]);

  const handleSelectExample = (url: string) => {
    setValue("url", url, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
    clearErrors("url");
  };

  const handleFormSubmit = handleSubmit(async (data) => {
    if (isLoading) return;
    await onSubmit(data);
  });

  const errorMessage = errors.url?.message;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="url-input" className="block text-xs font-semibold text-slate-700">
          URL to analyze
        </label>

        <div className="relative">
          <Input
            id="url-input"
            type="text"
            placeholder="http://198.51.100.23/login"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={isLoading}
            aria-invalid={!!errorMessage}
            aria-describedby={errorMessage ? "url-error url-helper" : "url-helper"}
            className="font-mono text-xs sm:text-sm text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-3 pr-24 w-full focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600"
            {...register("url")}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
            {charCount} / 2048
          </span>
        </div>

        {errorMessage && (
          <p id="url-error" role="alert" className="text-xs font-medium text-red-600 mt-1">
            {errorMessage}
          </p>
        )}

        <p id="url-helper" className="text-xs text-slate-400 mt-1">
          Enter a complete URL beginning with <code className="font-mono">http://</code> or{" "}
          <code className="font-mono">https://</code>. The destination website will not be visited.
        </p>
      </div>

      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <URLExamples onSelect={handleSelectExample} disabled={isLoading} />

        <Button
          type="submit"
          disabled={isLoading}
          style={{ backgroundColor: "#1d4ed8", color: "#ffffff" }}
          className="hover:bg-blue-700 font-medium px-6 py-2.5 rounded-xl text-sm shadow-sm transition-all min-w-[130px] self-end sm:self-auto shrink-0"
          aria-label="Analyze URL"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Analyzing...</span>
            </>
          ) : (
            "Analyze URL"
          )}
        </Button>
      </div>
    </form>
  );
}
