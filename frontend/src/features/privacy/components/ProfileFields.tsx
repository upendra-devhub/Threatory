import React from "react";
import { Control, FieldErrors, UseFormRegister, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Supplied profiles
          </h3>
          <p className="text-xs text-muted-foreground">
            Add 1 to 10 profiles you wish to examine for username reuse or pattern exposure.
          </p>
        </div>
        <Badge variant="secondary" aria-label={`Current profile count: ${fields.length} of 10`}>
          {fields.length} / 10 profiles
        </Badge>
      </div>

      {errors.profiles?.root?.message && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {errors.profiles.root.message}
        </p>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => {
          const rowError = errors.profiles?.[index];
          const platformErrorId = `profile-platform-error-${index}`;
          const usernameErrorId = `profile-username-error-${index}`;
          const urlErrorId = `profile-url-error-${index}`;

          return (
            <div
              key={field.id}
              className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-xs"
              data-testid={`profile-row-${index}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Profile {index + 1}
                </span>
                {canRemoveProfile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    disabled={disabled}
                    aria-label={`Remove profile ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                    <span className="text-xs">Remove</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                {/* Platform Input */}
                <div className="sm:col-span-3 space-y-1">
                  <label
                    htmlFor={`profiles.${index}.platform`}
                    className="block text-xs font-medium text-foreground"
                  >
                    Platform <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id={`profiles.${index}.platform`}
                    list={`platforms-list-${index}`}
                    placeholder="e.g. GitHub"
                    disabled={disabled}
                    aria-invalid={Boolean(rowError?.platform)}
                    aria-describedby={rowError?.platform ? platformErrorId : undefined}
                    {...register(`profiles.${index}.platform` as const)}
                  />
                  <datalist id={`platforms-list-${index}`}>
                    <option value="GitHub" />
                    <option value="X" />
                    <option value="Instagram" />
                    <option value="LinkedIn" />
                    <option value="Reddit" />
                  </datalist>
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
                <div className="sm:col-span-4 space-y-1">
                  <label
                    htmlFor={`profiles.${index}.username`}
                    className="block text-xs font-medium text-foreground"
                  >
                    Username <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id={`profiles.${index}.username`}
                    placeholder="e.g. Jane.Doe"
                    disabled={disabled}
                    aria-invalid={Boolean(rowError?.username)}
                    aria-describedby={rowError?.username ? usernameErrorId : undefined}
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
                <div className="sm:col-span-5 space-y-1">
                  <label
                    htmlFor={`profiles.${index}.url`}
                    className="block text-xs font-medium text-foreground"
                  >
                    Profile URL <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Input
                    id={`profiles.${index}.url`}
                    placeholder="https://github.com/jane-doe"
                    disabled={disabled}
                    aria-invalid={Boolean(rowError?.url)}
                    aria-describedby={rowError?.url ? urlErrorId : undefined}
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
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddProfile}
          disabled={disabled || !canAddProfile}
          aria-label="Add another profile"
        >
          <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
          <span>Add profile</span>
        </Button>

        {!canAddProfile && (
          <span className="text-xs text-muted-foreground font-medium">
            Maximum of 10 profiles reached.
          </span>
        )}
      </div>
    </div>
  );
}
