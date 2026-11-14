"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { WebsiteScanRequest } from "@threatory/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      authorised: initialAuthorised as true, // Typecast for form defaults
    },
    mode: "onSubmit",
  });

  // Wire external server field error into React Hook Form
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
    <form onSubmit={handleFormSubmit} className="space-y-4" noValidate data-testid="website-scan-form">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="website-url-input" className="text-sm font-semibold text-foreground">
            Target website URL
          </label>
          <span className="text-xs text-muted-foreground">
            Must be a public HTTPS or HTTP website
          </span>
        </div>

        <div className="relative">
          <Input
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
              urlErrorMessage ? "website-url-error website-url-helper" : "website-url-helper"
            }
            className="font-mono text-sm break-all focus-visible:ring-primary"
            {...register("url")}
          />
        </div>

        <p id="website-url-helper" className="text-xs text-muted-foreground">
          Enter the full URL of the site you wish to audit (e.g. <code className="font-mono text-xs">https://example.com</code>).
        </p>

        {urlErrorMessage && (
          <p
            id="website-url-error"
            role="alert"
            className="text-xs font-medium text-destructive"
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

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full sm:w-auto font-medium min-w-[140px]"
        aria-label="Audit website"
        data-testid="submit-website-scan-button"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Auditing website...</span>
          </>
        ) : (
          <span>Audit website</span>
        )}
      </Button>
    </form>
  );
}
