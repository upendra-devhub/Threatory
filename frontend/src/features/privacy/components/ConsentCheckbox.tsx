import React from "react";
import { UseFormRegister } from "react-hook-form";
import { PrivacyFormValues } from "./ProfileFields";
import { cn } from "@/lib/utils";

export interface ConsentCheckboxProps {
  register: UseFormRegister<PrivacyFormValues>;
  error?: string;
  disabled?: boolean;
}

export function ConsentCheckbox({
  register,
  error,
  disabled = false,
}: ConsentCheckboxProps) {
  const errorId = "consent-field-error";

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="privacy-consent"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "mt-1 h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 accent-primary cursor-pointer"
          )}
          {...register("consent")}
        />
        <label
          htmlFor="privacy-consent"
          className="text-xs sm:text-sm font-medium leading-relaxed text-foreground select-none cursor-pointer"
        >
          I confirm that I have the right to submit this information and consent to its analysis by Threatory.
        </label>
      </div>

      {error && (
        <p
          id={errorId}
          className="text-xs font-medium text-destructive pl-7"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
