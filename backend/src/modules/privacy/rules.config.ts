export const rulesVersion = "privacy-1.0.0";

export type PrivacyRuleCode =
  | "PRIV_USERNAME_REUSE"
  | "PRIV_USERNAME_SIMILAR"
  | "PRIV_URL_USERNAME_MISMATCH"
  | "PRIV_USERNAME_PERSONAL_HINT"
  | "PRIV_EMAIL_FOUND"
  | "PRIV_USERNAME_MATCHES_EMAIL"
  | "PRIV_PHONE_FOUND"
  | "PRIV_SECRET_FOUND"
  | "PRIV_CARD_FOUND";

export interface PrivacyRuleConfig {
  code: PrivacyRuleCode;
  category: string;
  title: string;
  triggeredSeverity: "low" | "medium" | "high";
  triggeredOutcome: "warn" | "fail";
}

export const privacyRuleConfigs: Record<PrivacyRuleCode, PrivacyRuleConfig> = {
  PRIV_USERNAME_REUSE: {
    code: "PRIV_USERNAME_REUSE",
    category: "identity",
    title: "Username reuse across profiles",
    triggeredSeverity: "low", // medium for 3+ profiles
    triggeredOutcome: "warn",
  },
  PRIV_USERNAME_SIMILAR: {
    code: "PRIV_USERNAME_SIMILAR",
    category: "identity",
    title: "Similar username variations",
    triggeredSeverity: "low",
    triggeredOutcome: "warn",
  },
  PRIV_URL_USERNAME_MISMATCH: {
    code: "PRIV_URL_USERNAME_MISMATCH",
    category: "identity",
    title: "Profile URL username mismatch",
    triggeredSeverity: "low",
    triggeredOutcome: "warn",
  },
  PRIV_USERNAME_PERSONAL_HINT: {
    code: "PRIV_USERNAME_PERSONAL_HINT",
    category: "identity",
    title: "Personal identifier in username",
    triggeredSeverity: "low",
    triggeredOutcome: "warn",
  },
  PRIV_EMAIL_FOUND: {
    code: "PRIV_EMAIL_FOUND",
    category: "contact",
    title: "Exposed email address",
    triggeredSeverity: "medium",
    triggeredOutcome: "warn",
  },
  PRIV_USERNAME_MATCHES_EMAIL: {
    code: "PRIV_USERNAME_MATCHES_EMAIL",
    category: "correlation",
    title: "Username matches email address",
    triggeredSeverity: "medium",
    triggeredOutcome: "warn",
  },
  PRIV_PHONE_FOUND: {
    code: "PRIV_PHONE_FOUND",
    category: "contact",
    title: "Exposed phone number",
    triggeredSeverity: "medium",
    triggeredOutcome: "warn",
  },
  PRIV_SECRET_FOUND: {
    code: "PRIV_SECRET_FOUND",
    category: "credentials",
    title: "Exposed secret credential",
    triggeredSeverity: "high",
    triggeredOutcome: "fail",
  },
  PRIV_CARD_FOUND: {
    code: "PRIV_CARD_FOUND",
    category: "financial",
    title: "Exposed payment card number",
    triggeredSeverity: "high",
    triggeredOutcome: "fail",
  },
};
