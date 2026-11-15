"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PrivacyScanRequest } from "@threatory/contracts";
import { ProfileFields, PrivacyFormValues } from "./ProfileFields";
import { ConsentCheckbox } from "./ConsentCheckbox";

export const PrivacyFormSchema = z.object({
  profiles: z
    .array(
      z.object({
        platform: z
          .string()
          .trim()
          .min(1, "Platform is required")
          .max(30, "Platform must be 30 characters or fewer"),
        username: z
          .string()
          .trim()
          .min(1, "Username is required")
          .max(64, "Username must be 64 characters or fewer")
          .regex(
            /^[A-Za-z0-9._-]+$/,
            "Username may only contain letters, numbers, periods, underscores, and hyphens"
          ),
        url: z
          .string()
          .trim()
          .max(2048, "URL must be 2048 characters or fewer")
          .optional()
          .or(z.literal("")),
      })
    )
    .min(1, "At least one profile is required")
    .max(10, "A maximum of 10 profiles is permitted"),
  displayName: z
    .string()
    .trim()
    .max(80, "Display name must be 80 characters or fewer")
    .optional()
    .or(z.literal("")),
  submittedText: z
    .string()
    .max(10000, "Submitted text must not exceed 10,000 characters")
    .optional()
    .or(z.literal("")),
  consent: z.boolean().refine((val) => val === true, {
    message: "Explicit consent is required to analyze supplied information",
  }),
});

export interface PrivacyScanFormProps {
  onSubmit: (data: PrivacyScanRequest) => void | Promise<void>;
  isLoading?: boolean;
  serverFieldErrors?: Array<{ path: string; message: string }> | null;
  resetTrigger?: number;
}

export function PrivacyScanForm({
  onSubmit,
  isLoading = false,
  serverFieldErrors,
  resetTrigger,
}: PrivacyScanFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors },
  } = useForm<PrivacyFormValues>({
    resolver: zodResolver(PrivacyFormSchema),
    defaultValues: {
      profiles: [{ platform: "GitHub", username: "", url: "" }],
      displayName: "",
      submittedText: "",
      consent: false,
    },
    mode: "onSubmit",
  });

  const watchConsent = watch("consent");
  const watchText = watch("submittedText") || "";
  const charCount = watchText.length;
  const isOverCharLimit = charCount > 10000;

  // Map server validation field errors into form
  useEffect(() => {
    if (serverFieldErrors && serverFieldErrors.length > 0) {
      for (const err of serverFieldErrors) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError(err.path as any, {
          type: "server",
          message: err.message,
        });
      }
    }
  }, [serverFieldErrors, setError]);

  // Reset form upon successful completion signal
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      reset({
        profiles: [{ platform: "GitHub", username: "", url: "" }],
        displayName: "",
        submittedText: "",
        consent: false,
      });
    }
  }, [resetTrigger, reset]);

  const onValidSubmit = async (data: PrivacyFormValues) => {
    if (!data.consent) {
      setError("consent", {
        type: "manual",
        message: "Explicit consent is required to analyze supplied information",
      });
      return;
    }

    // Build contract-compatible request
    const payload: PrivacyScanRequest = {
      profiles: data.profiles.map((p) => ({
        platform: p.platform.trim(),
        username: p.username.trim(),
        ...(p.url && p.url.trim().length > 0 ? { url: p.url.trim() } : {}),
      })),
      ...(data.displayName && data.displayName.trim().length > 0
        ? { displayName: data.displayName.trim() }
        : {}),
      ...(data.submittedText && data.submittedText.length > 0
        ? { submittedText: data.submittedText }
        : {}),
      consent: true,
    };

    try {
      await onSubmit(payload);
    } catch {
      // Error is handled by caller/mutation; preserve entered fields
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onValidSubmit)}
      noValidate
      className="space-y-6"
      aria-label="Privacy Exposure Analyzer form"
    >
      {/* 1. Dynamic Profile Rows */}
      <ProfileFields
        control={control}
        register={register}
        errors={errors}
        disabled={isLoading}
      />

      {/* 2. Display Name & Text to Review Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
        {/* Optional Display Name */}
        <div className="sm:col-span-4 space-y-1">
          <label
            htmlFor="privacy-display-name"
            className="block text-xs font-medium text-slate-700"
          >
            Display name <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="privacy-display-name"
            placeholder="Alex Morgan"
            maxLength={80}
            disabled={isLoading}
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={
              errors.displayName
                ? "display-name-error"
                : "display-name-helper"
            }
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            {...register("displayName")}
          />
          <p id="display-name-helper" className="sr-only">
            Optional: used to detect whether personal-name fragments appear in supplied usernames.
          </p>
          {errors.displayName && (
            <p
              id="display-name-error"
              className="text-xs font-medium text-destructive"
              role="alert"
            >
              {errors.displayName.message}
            </p>
          )}
        </div>

        {/* Optional Text to Review */}
        <div className="sm:col-span-8 space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="privacy-submitted-text"
              className="block text-xs font-medium text-slate-700"
            >
              Text to review <span className="text-slate-400 font-normal">(optional)</span>
              <span className="sr-only"> (Text to analyze)</span>
            </label>
          </div>
          <textarea
            id="privacy-submitted-text"
            placeholder="Reach me at alex.morgan92@example.com or call +1 202 555 0143. Happy to share my CV, I graduated in 2014 and live in Austin..."
            disabled={isLoading}
            aria-invalid={Boolean(errors.submittedText || isOverCharLimit)}
            aria-describedby={
              errors.submittedText
                ? "submitted-text-error"
                : "privacy-text-counter submitted-text-helper"
            }
            className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none font-sans"
            {...register("submittedText")}
          />
          <div
            id="privacy-text-counter"
            data-testid="char-counter"
            aria-live="polite"
            className={`text-[11px] font-mono text-right mt-1 ${
              isOverCharLimit ? "text-destructive font-semibold" : "text-slate-400"
            }`}
          >
            {charCount.toLocaleString("en-US")} / 10,000 characters
          </div>
          <p id="submitted-text-helper" className="sr-only">
            Do not submit passwords, API credentials you intend to keep active, or sensitive government identification.
          </p>
          {errors.submittedText && (
            <p
              id="submitted-text-error"
              className="text-xs font-medium text-destructive"
              role="alert"
            >
              {errors.submittedText.message}
            </p>
          )}
        </div>
      </div>

      {/* 3. Required Consent Checkbox */}
      <ConsentCheckbox
        register={register}
        error={errors.consent?.message}
        disabled={isLoading}
      />

      {/* 4. Form Submission Action */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading || !watchConsent}
          className="inline-flex items-center justify-center font-medium px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white min-w-[160px]"
          style={{ backgroundColor: "#15803d" }}
          aria-label={isLoading ? "Analyzing privacy exposure..." : "Analyze privacy exposure"}
        >
          {isLoading ? "Analyzing exposure..." : "Analyze exposure"}
          <span className="sr-only"> privacy</span>
        </button>
      </div>
    </form>
  );
}
