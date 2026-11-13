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
    formState: { errors },
  } = useForm<UrlScanRequest>({
    resolver: zodResolver(UrlScanRequest),
    defaultValues: {
      url: initialValue,
    },
    mode: "onSubmit",
  });

  // Wire external field error from backend into React Hook Form
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="url-input" className="text-sm font-semibold text-foreground">
            URL to analyze
          </label>
          <span className="text-xs text-muted-foreground">
            Accepted schemes: <code className="font-mono text-xs">http://</code>,{" "}
            <code className="font-mono text-xs">https://</code>
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Input
              id="url-input"
              type="text"
              placeholder="https://example.com/path"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={isLoading}
              aria-invalid={!!errorMessage}
              aria-describedby={errorMessage ? "url-error url-helper" : "url-helper"}
              className="font-mono text-sm break-all focus-visible:ring-primary"
              {...register("url")}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto font-medium min-w-[130px]"
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

        {errorMessage && (
          <p id="url-error" role="alert" className="text-xs font-medium text-destructive">
            {errorMessage}
          </p>
        )}

        <p id="url-helper" className="text-xs text-muted-foreground">
          Enter a complete URL beginning with <code className="font-mono">http://</code> or{" "}
          <code className="font-mono">https://</code>. The destination website will not be visited.
        </p>
      </div>

      <URLExamples onSelect={handleSelectExample} disabled={isLoading} />
    </form>
  );
}
