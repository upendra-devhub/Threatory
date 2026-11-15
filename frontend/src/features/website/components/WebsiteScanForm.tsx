"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { WebsiteScanRequest } from "@threatory/contracts";
import { AuthorisationCheckbox } from "./AuthorisationCheckbox";
import { Loader2 } from "lucide-react";

export const websiteFormSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Website URL is required")
    .max(2048, "URL must be 2048 characters or less"),
  authorised: z.literal(true, {
    errorMap: () => ({
      message: "You must confirm authorisation to audit this website",
    }),
  }),
});

export type WebsiteFormValues = z.infer<typeof websiteFormSchema>;

export interface WebsiteScanFormProps {
  onSubmit: (data: WebsiteScanRequest) => void | Promise<void>;
  isLoading?: boolean;
  fieldError?: string | null;
  initialUrl?: string;
  initialAuthorised?: boolean;
}

export function WebsiteScanForm({
  onSubmit,
  isLoading = false,
  fieldError,
  initialUrl = "",
  initialAuthorised = false,
}: WebsiteScanFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<WebsiteFormValues>({
    resolver: zodResolver(websiteFormSchema),
    defaultValues: {
      url: initialUrl,
      authorised: initialAuthorised as true,
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (fieldError) {
      setError("url", {
        type: "server",
        message: fieldError,
      });
    }
  }, [fieldError, setError]);

  const handleFormSubmit = handleSubmit(async (data) => {
    if (isLoading) return;
    await onSubmit({
      url: data.url,
      authorised: true,
    });
  });

  const urlErrorMessage = errors.url?.message;
  const authorisationErrorMessage = errors.authorised?.message;

  return (
    <form
      onSubmit={handleFormSubmit}
      className="space-y-4"
      noValidate
      data-testid="website-scan-form"
    >
      <div className="space-y-1.5">
        <label
          htmlFor="website-url-input"
          className="block text-xs sm:text-sm font-medium text-slate-700"
        >
          Website to audit
          <span className="sr-only">Target website URL</span>
        </label>

        <div className="relative">
          <input
            id="website-url-input"
            data-testid="website-url-input"
            type="text"
            placeholder="https://example.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={isLoading}
            aria-invalid={!!urlErrorMessage}
            aria-describedby={
              urlErrorMessage
                ? "website-url-error website-url-helper"
                : "website-url-helper"
            }
            className="h-10 w-full font-mono rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            {...register("url")}
          />
        </div>

        <p id="website-url-helper" className="text-xs text-slate-400">
          Public http:// or https:// addresses only. Internal and private addresses are blocked.
        </p>

        {urlErrorMessage && (
          <p
            id="website-url-error"
            role="alert"
            className="text-xs font-medium text-destructive mt-1"
            data-testid="website-url-error"
          >
            {urlErrorMessage}
          </p>
        )}
      </div>

      {/* Mandatory authorisation checkbox */}
      <AuthorisationCheckbox
        register={register}
        error={authorisationErrorMessage}
        disabled={isLoading}
      />

      {/* Submit Button */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isLoading}
          aria-label="Audit website · Run audit"
          data-testid="submit-website-scan-button"
          className="inline-flex items-center justify-center rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs sm:text-sm font-semibold px-6 py-2.5 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Auditing website...</span>
            </>
          ) : (
            <span>Run audit</span>
          )}
        </button>
      </div>
    </form>
  );
}
