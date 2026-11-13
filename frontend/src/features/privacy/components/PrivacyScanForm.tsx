"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PrivacyScanRequest } from "@threatory/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProfileFields, PrivacyFormValues } from "./ProfileFields";
import { PrivacyScopeNotice } from "./PrivacyScopeNotice";
import { ConsentCheckbox } from "./ConsentCheckbox";
import { Loader2, ShieldCheck } from "lucide-react";

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

    await onSubmit(payload);
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

      {/* 2. Optional Display Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="privacy-display-name"
          className="block text-xs font-medium text-foreground"
        >
          Display name <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          id="privacy-display-name"
          placeholder="e.g. Jane Doe"
          maxLength={80}
          disabled={isLoading}
          aria-invalid={Boolean(errors.displayName)}
          aria-describedby={
            errors.displayName
              ? "display-name-error"
              : "display-name-helper"
          }
          {...register("displayName")}
        />
        <p id="display-name-helper" className="text-xs text-muted-foreground">
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

      {/* 3. Optional Submitted Text with Live Character Counter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="privacy-submitted-text"
            className="block text-xs font-medium text-foreground"
          >
            Text to analyze <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <div
            id="privacy-text-counter"
            aria-live="polite"
            className={`text-xs font-medium ${
              isOverCharLimit ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {charCount.toLocaleString("en-US")} / 10,000 characters
          </div>
        </div>
        <Textarea
          id="privacy-submitted-text"
          placeholder="Paste public bios, messages, or text snippets you wish to check for exposed email addresses, phone numbers, secret tokens, or payment card numbers..."
          disabled={isLoading}
          aria-invalid={Boolean(errors.submittedText || isOverCharLimit)}
          aria-describedby={
            errors.submittedText
              ? "submitted-text-error"
              : "privacy-text-counter submitted-text-helper"
          }
          className="min-h-[140px] font-mono text-xs sm:text-sm"
          {...register("submittedText")}
        />
        <p id="submitted-text-helper" className="text-xs text-muted-foreground">
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

      {/* 4. Scope and Privacy Notice */}
      <PrivacyScopeNotice />

      {/* 5. Required Consent Checkbox */}
      <ConsentCheckbox
        register={register}
        error={errors.consent?.message}
        disabled={isLoading}
      />

      {/* 6. Form Submission Action */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="submit"
          size="default"
          disabled={isLoading || !watchConsent}
          className="min-w-[200px]"
          aria-label={isLoading ? "Analyzing privacy exposure..." : "Analyze privacy exposure"}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Analyzing exposure...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Analyze privacy exposure</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
