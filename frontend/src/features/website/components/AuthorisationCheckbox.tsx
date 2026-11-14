import React from "react";
import { UseFormRegister } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { WebsiteFormValues } from "./WebsiteScanForm";

export interface AuthorisationCheckboxProps {
  register: UseFormRegister<WebsiteFormValues>;
  error?: string;
  disabled?: boolean;
}

export function AuthorisationCheckbox({
  register,
  error,
  disabled = false,
}: AuthorisationCheckboxProps) {
  const errorId = "authorisation-field-error";

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-4 transition-colors",
        error ? "border-destructive/60 bg-destructive/5" : "border-border bg-card"
      )}
      data-testid="website-authorisation-container"
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="website-authorisation"
          data-testid="website-authorisation-checkbox"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "mt-1 h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 accent-primary cursor-pointer"
          )}
          {...register("authorised")}
        />
        <label
          htmlFor="website-authorisation"
          className="text-xs sm:text-sm font-medium leading-relaxed text-foreground select-none cursor-pointer"
        >
          I own this site or have permission to assess it
        </label>
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-destructive ml-7"
          data-testid="website-authorisation-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
