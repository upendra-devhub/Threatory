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
        "rounded-xl border p-4 transition-colors",
        error
          ? "border-destructive/60 bg-destructive/5"
          : "border-[#fef08a] bg-[#fffbeb]"
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
          className="mt-1 h-4 w-4 shrink-0 rounded border-amber-300 text-amber-700 focus:ring-amber-500 cursor-pointer accent-[#b45309]"
          {...register("authorised")}
        />
        <div>
          <label
            htmlFor="website-authorisation"
            className="text-xs sm:text-sm font-bold text-slate-900 block select-none cursor-pointer"
          >
            I own this site or have permission to assess it
          </label>
          <p className="text-xs text-slate-600 mt-0.5">
            Only run audits on sites you are authorised to test. Threatory sends a few standard requests and nothing intrusive.
          </p>
        </div>
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-destructive mt-2 ml-7"
          data-testid="website-authorisation-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
