"use client";

import React from "react";
import { Control, FieldErrors, UseFormRegister, useFieldArray } from "react-hook-form";
import { ChevronDown, X } from "lucide-react";

export interface ProfileFormValue {
  platform: string;
  username: string;
  url?: string;
}

export interface PrivacyFormValues {
  profiles: ProfileFormValue[];
  displayName?: string;
  submittedText?: string;
  consent: boolean;
}

export interface ProfileFieldsProps {
  control: Control<PrivacyFormValues>;
  register: UseFormRegister<PrivacyFormValues>;
  errors: FieldErrors<PrivacyFormValues>;
  disabled?: boolean;
}

export function ProfileFields({
  control,
  register,
  errors,
  disabled = false,
}: ProfileFieldsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "profiles",
  });

  const canAddProfile = fields.length < 10;
  const canRemoveProfile = fields.length > 1;

  const handleAddProfile = () => {
    if (canAddProfile && !disabled) {
      append({ platform: "GitHub", username: "", url: "" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <h2 className="text-sm sm:text-base font-bold text-slate-900">
          Profiles to review
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Add up to 10 profiles you own or are authorised to review.
        </p>
      </div>

      {errors.profiles?.root?.message && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {errors.profiles.root.message}
        </p>
      )}

      {/* Profile Rows */}
      <div className="space-y-3.5">
        {fields.map((field, index) => {
          const rowError = errors.profiles?.[index];
          const platformErrorId = `profile-platform-error-${index}`;
          const usernameErrorId = `profile-username-error-${index}`;
          const urlErrorId = `profile-url-error-${index}`;

          return (
            <div
              key={field.id}
              className="grid grid-cols-1 sm:grid-cols-[125px_165px_1fr_auto] gap-3 items-start"
              data-testid={`profile-row-${index}`}
            >
              {/* Platform Select */}
              <div className="space-y-1">
                <label
                  htmlFor={`profiles.${index}.platform`}
                  className="block text-xs font-medium text-slate-700"
                >
                  Platform
                </label>
                <div className="relative">
                  <select
                    id={`profiles.${index}.platform`}
                    disabled={disabled}
                    aria-invalid={Boolean(rowError?.platform)}
                    aria-describedby={rowError?.platform ? platformErrorId : undefined}
                    style={{
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      appearance: "none",
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    {...register(`profiles.${index}.platform` as const)}
                  >
                    <option value="GitHub">GitHub</option>
                    <option value="X / Twitter">X / Twitter</option>
                    <option value="Instagram">Instagram</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Reddit">Reddit</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                </div>
                {rowError?.platform && (
                  <p
                    id={platformErrorId}
                    className="text-[11px] font-medium text-destructive"
                    role="alert"
                  >
                    {rowError.platform.message}
                  </p>
                )}
              </div>

              {/* Username Input */}
              <div className="space-y-1">
                <label
                  htmlFor={`profiles.${index}.username`}
                  className="block text-xs font-medium text-slate-700"
                >
                  Username
                </label>
                <input
                  id={`profiles.${index}.username`}
                  placeholder="e.g. Jane.Doe"
                  disabled={disabled}
                  aria-invalid={Boolean(rowError?.username)}
                  aria-describedby={rowError?.username ? usernameErrorId : undefined}
                  className="h-10 w-full font-mono rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  {...register(`profiles.${index}.username` as const)}
                />
                {rowError?.username && (
                  <p
                    id={usernameErrorId}
                    className="text-[11px] font-medium text-destructive"
                    role="alert"
                  >
                    {rowError.username.message}
                  </p>
                )}
              </div>

              {/* Profile URL Input */}
              <div className="space-y-1">
                <label
                  htmlFor={`profiles.${index}.url`}
                  className="block text-xs font-medium text-slate-700 truncate"
                >
                  Profile URL <span className="text-slate-400 font-normal">(optional, never opened)</span>
                </label>
                <input
                  id={`profiles.${index}.url`}
                  placeholder={
                    index === 0
                      ? "https://github.com/alex.morgan92"
                      : "https://x.com/alexm_dev"
                  }
                  disabled={disabled}
                  aria-invalid={Boolean(rowError?.url)}
                  aria-describedby={rowError?.url ? urlErrorId : undefined}
                  className="h-10 w-full font-mono rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  {...register(`profiles.${index}.url` as const)}
                />
                {rowError?.url && (
                  <p
                    id={urlErrorId}
                    className="text-[11px] font-medium text-destructive"
                    role="alert"
                  >
                    {rowError.url.message}
                  </p>
                )}
              </div>

              {/* Remove Button */}
              <div className="flex items-center justify-center">
                {canRemoveProfile ? (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={disabled}
                    className="mt-6 h-10 w-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={`Remove profile ${index + 1}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <div className="hidden sm:block w-8" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add profile button + Count */}
      <div className="flex items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={handleAddProfile}
          disabled={disabled || !canAddProfile}
          className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
          aria-label="Add another profile"
        >
          <span>+ Add another profile</span>
        </button>
        <span className="text-xs text-slate-400">
          · {fields.length} of 10
        </span>
        <span className="sr-only">{fields.length} / 10 profiles</span>
        {!canAddProfile && (
          <span className="text-xs text-muted-foreground font-medium ml-2">
            Maximum of 10 profiles reached.
          </span>
        )}
      </div>
    </div>
  );
}
