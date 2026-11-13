import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivacyAnalyzerView } from "@/features/privacy/components/PrivacyAnalyzerView";
import { renderWithQuery } from "./test-utils";
import type { Report, PrivacyScanRequest } from "@threatory/contracts";

vi.mock("next/navigation", () => ({
  usePathname: () => "/privacy-analyzer",
}));

describe("CRITICAL: Privacy DOM Leakage Prevention Tests (Task 5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("proves raw sensitive values never appear in the rendered result DOM and form resets after success", async () => {
    const user = userEvent.setup();

    const rawEmail = "jane.doe@example.com";
    const rawPhone = "+1 213 373 4253";
    const rawToken = "AKIAIOSFODNN7EXAMPLE";
    const rawCard = "4111 1111 1111 1111";
    const rawUsername = "Jane.Doe";
    const rawDisplayName = "Jane Doe";

    // Sanitized Report fixture matching CP-07 backend output
    const sanitizedReport: Report = {
      scanId: "scan-priv-test-leakage-001",
      module: "privacy",
      status: "completed",
      rulesVersion: "privacy-1.0.0",
      targetSummary: "1 profile, text provided (120 characters)",
      assessment: {
        riskLevel: "high",
        label: "4 exposure signals found",
      },
      findings: [
        {
          code: "PRIV_USERNAME_REUSE",
          category: "identity",
          title: "Username reuse across profiles",
          outcome: "warn",
          severity: "low",
          evidence: "The same username was supplied across 2 profiles (masked: J***e).",
          explanation: "The same username was supplied across multiple profiles.",
          recommendation: "Consider using distinct usernames across services.",
        },
        {
          code: "PRIV_EMAIL_FOUND",
          category: "contact",
          title: "Exposed email address",
          outcome: "warn",
          severity: "medium",
          evidence: "Detected email: j***@example.com",
          explanation: "An email address was found in the submitted text.",
          recommendation: "Remove email addresses from public text.",
        },
        {
          code: "PRIV_PHONE_FOUND",
          category: "contact",
          title: "Exposed phone number",
          outcome: "warn",
          severity: "medium",
          evidence: "Detected phone number: +1 *** *** **53",
          explanation: "A valid phone number was detected in the submitted text.",
          recommendation: "Remove phone numbers from public text.",
        },
        {
          code: "PRIV_SECRET_FOUND",
          category: "credentials",
          title: "Exposed secret credential",
          outcome: "fail",
          severity: "high",
          evidence: "Exposed secret detected: AWS key: AKIA********",
          explanation: "An exposed secret token was found in the submitted text.",
          recommendation: "Immediately revoke and rotate any exposed secret.",
        },
        {
          code: "PRIV_CARD_FOUND",
          category: "financial",
          title: "Exposed payment card number",
          outcome: "fail",
          severity: "high",
          evidence: "Detected payment card: **** **** **** 1111",
          explanation: "A valid payment card was found in the submitted text.",
          recommendation: "Remove payment card numbers immediately.",
        },
      ],
      limitations: [
        "Only information explicitly supplied by the user was analysed.",
        "No internet-wide account or username search was performed.",
        "No profile page was fetched or visited.",
        "No account ownership or real-world identity was verified.",
        "No data breach database lookup was performed.",
      ],
      details: {
        profilesCount: 1,
        textLength: 120,
        hasDisplayName: true,
        evaluatedRulesCount: 9,
      },
      createdAt: "2026-11-13T12:00:00.000Z",
    };

    let capturedRequest: PrivacyScanRequest | null = null;
    const onScanOverride = vi.fn().mockImplementation(async (data: PrivacyScanRequest) => {
      capturedRequest = data;
      return sanitizedReport;
    });

    renderWithQuery(
      <PrivacyAnalyzerView
        onScanOverride={onScanOverride}
        initialReport={sanitizedReport}
      />
    );

    // 1. Enter all raw sensitive values into form inputs
    const form = screen.getByRole("form");
    const usernameInput = within(form).getByPlaceholderText("e.g. Jane.Doe");
    const displayNameInput = within(form).getByLabelText(/Display name/i);
    const textArea = within(form).getByLabelText(/Text to analyze/i);
    const consentCheckbox = within(form).getByRole("checkbox", {
      name: /I confirm that I have the right to submit this information/i,
    });

    await user.type(usernameInput, rawUsername);
    await user.type(displayNameInput, rawDisplayName);
    await user.type(
      textArea,
      `Reach me at ${rawEmail} or call ${rawPhone}. Secret AWS key: ${rawToken} and card: ${rawCard}.`
    );
    await user.click(consentCheckbox);

    const submitBtn = screen.getByRole("button", { name: /Analyze privacy exposure/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onScanOverride).toHaveBeenCalled();
    });

    // Verify request payload was properly formed
    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.consent).toBe(true);

    // 2. Locate the rendered result container
    const resultSection = screen.getByTestId("privacy-scan-result");
    expect(resultSection).toBeInTheDocument();
    const resultHtml = resultSection.innerHTML;

    // 3. Assert MASKED values are visible in the result section
    expect(resultHtml).toContain("j***@example.com");
    expect(resultHtml).toContain("+1 *** *** **53");
    expect(resultHtml).toContain("AKIA********");
    expect(resultHtml).toContain("**** **** **** 1111");
    expect(resultHtml).toContain("J***e");

    // 4. Assert RAW sensitive values are ABSENT from the result section
    expect(resultHtml).not.toContain(rawEmail);
    expect(resultHtml).not.toContain(rawPhone);
    expect(resultHtml).not.toContain(rawToken);
    expect(resultHtml).not.toContain(rawCard);
    expect(resultHtml).not.toContain(rawUsername);
    expect(resultHtml).not.toContain(rawDisplayName);

    // 5. Assert Form Reset on successful completion (clean state)
    // The previously typed raw values should be cleared from active inputs
    await waitFor(() => {
      const activeForm = screen.getByRole("form");
      expect(within(activeForm).getByPlaceholderText("e.g. Jane.Doe")).toHaveValue("");
      expect(within(activeForm).getByLabelText(/Display name/i)).toHaveValue("");
      expect(within(activeForm).getByLabelText(/Text to analyze/i)).toHaveValue("");
      expect(
        within(activeForm).getByRole("checkbox", {
          name: /I confirm that I have the right to submit this information/i,
        })
      ).not.toBeChecked();
    });
  });
});
