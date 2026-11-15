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
    <div
      className={cn(
        "space-y-2 rounded-xl border p-4 transition-colors",
        error
          ? "border-destructive/60 bg-destructive/5"
          : "border-blue-100 bg-[#f0f7ff]"
      )}
      data-testid="privacy-consent-container"
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="privacy-consent"
          data-testid="privacy-consent-checkbox"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          aria-label="I consent to this analysis. I confirm that I have the right to submit this information and consent to its analysis by Threatory."
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
          {...register("consent")}
        />
        <label
          htmlFor="privacy-consent"
          className="text-xs sm:text-sm leading-relaxed text-slate-800 select-none cursor-pointer"
        >
          <span className="font-bold text-slate-900 block">
            I consent to this analysis.
          </span>
          <span className="text-xs text-slate-600 block mt-0.5">
            This information is mine, or I am authorised to submit it. It is analysed exactly as entered. No profile page is visited.
          </span>
          <span className="sr-only">
            I confirm that I have the right to submit this information and consent to its analysis by Threatory.
          </span>
        </label>
      </div>

      {error && (
        <p
          id={errorId}
          data-testid="consent-error-message"
          className="text-xs font-medium text-destructive pl-7"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
