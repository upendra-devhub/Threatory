import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivacyAnalyzerView } from "@/features/privacy/components/PrivacyAnalyzerView";
import { renderWithQuery } from "./test-utils";
import type { PrivacyScanRequest } from "@threatory/contracts";

vi.mock("next/navigation", () => ({
  usePathname: () => "/privacy-analyzer",
}));

describe("CRITICAL: Browser Storage Invariant Tests (Task 5)", () => {
  let localStorageSpy: ReturnType<typeof vi.spyOn>;
  let sessionStorageSpy: ReturnType<typeof vi.spyOn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let indexedDbSpy: any = null;

  beforeEach(() => {
    localStorageSpy = vi.spyOn(Storage.prototype, "setItem");
    sessionStorageSpy = vi.spyOn(Storage.prototype, "setItem");

    if (typeof window !== "undefined" && window.indexedDB) {
      indexedDbSpy = vi.spyOn(window.indexedDB, "open");
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("guarantees form input is never persisted to localStorage, sessionStorage, IndexedDB, or URL", async () => {
    const user = userEvent.setup();

    const sensitiveUsername = "secret_storage_user_42";
    const sensitiveDisplayName = "Secret Storage Person";
    const sensitiveText = "My secret contact is secret_storage@example.com with key AKIASECRET12345678";

    let submitCount = 0;
    const onScanOverride = vi.fn().mockImplementation(async (_data: PrivacyScanRequest) => {
      submitCount++;
      if (submitCount === 1) {
        throw new Error("Simulated temporary network error");
      }
      return undefined;
    });

    renderWithQuery(<PrivacyAnalyzerView onScanOverride={onScanOverride} />);

    // 1. Initial render check: no storage calls
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(sessionStorageSpy).not.toHaveBeenCalled();

    // 2. Typing profile and sensitive fields
    const usernameInput = screen.getByLabelText(/Username/i);
    const displayNameInput = screen.getByLabelText(/Display name/i);
    const textArea = screen.getByLabelText(/Text to analyze/i);
    const consentCheckbox = screen.getByRole("checkbox", {
      name: /I confirm that I have the right to submit this information/i,
    });

    await user.type(usernameInput, sensitiveUsername);
    await user.type(displayNameInput, sensitiveDisplayName);
    await user.type(textArea, sensitiveText);
    await user.click(consentCheckbox);

    // Assert that keystrokes and typing did NOT invoke storage APIs
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(sessionStorageSpy).not.toHaveBeenCalled();

    // 3. Failed submission
    const submitBtn = screen.getByRole("button", { name: /Analyze privacy exposure/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onScanOverride).toHaveBeenCalledTimes(1);
    });

    // Assert storage remains uninvoked after error
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(sessionStorageSpy).not.toHaveBeenCalled();

    // 4. Successful submission
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onScanOverride).toHaveBeenCalledTimes(2);
    });

    // Assert storage was never called with any sensitive data
    const allStorageCalls = [
      ...localStorageSpy.mock.calls,
      ...sessionStorageSpy.mock.calls,
    ];

    for (const call of allStorageCalls) {
      const serializedCall = JSON.stringify(call);
      expect(serializedCall).not.toContain(sensitiveUsername);
      expect(serializedCall).not.toContain(sensitiveDisplayName);
      expect(serializedCall).not.toContain("secret_storage@example.com");
      expect(serializedCall).not.toContain("AKIASECRET12345678");
    }

    if (indexedDbSpy) {
      expect(indexedDbSpy).not.toHaveBeenCalled();
    }

    // 5. URL Query and Hash invariant
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("");
  });
});
