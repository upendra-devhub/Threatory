import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivacyScanForm } from "@/features/privacy/components/PrivacyScanForm";
import { PrivacyAnalyzerView } from "@/features/privacy/components/PrivacyAnalyzerView";
import { renderWithQuery } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/privacy-analyzer",
}));

describe("Privacy Analyzer Form Tests (Task 5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("A. Dynamic Profile Form", () => {
    it("starts with exactly one profile row with platform, username, and optional URL fields", () => {
      renderWithQuery(<PrivacyAnalyzerView />);

      expect(screen.getByText("1 / 10 profiles")).toBeInTheDocument();
      expect(screen.getByLabelText(/Platform/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Profile URL/i)).toBeInTheDocument();

      // Only one remove button or no remove button for the only profile
      const removeButtons = screen.queryAllByRole("button", { name: /Remove profile/i });
      expect(removeButtons.length).toBe(0);
    });

    it("adds new profile rows independently up to the maximum of 10", async () => {
      const user = userEvent.setup();
      renderWithQuery(<PrivacyAnalyzerView />);

      const addBtn = screen.getByRole("button", { name: /Add another profile/i });
      expect(addBtn).toBeInTheDocument();

      // Add 2 more profiles (total 3)
      await user.click(addBtn);
      await user.click(addBtn);

      expect(screen.getByText("3 / 10 profiles")).toBeInTheDocument();
      const usernameInputs = screen.getAllByLabelText(/Username/i);
      expect(usernameInputs).toHaveLength(3);

      // Add up to 10
      for (let i = 3; i < 10; i++) {
        await user.click(addBtn);
      }

      expect(screen.getByText("10 / 10 profiles")).toBeInTheDocument();
      expect(screen.getByText("Maximum of 10 profiles reached.")).toBeInTheDocument();
      expect(addBtn).toBeDisabled();
    });

    it("removes a row and preserves remaining rows when multiple profiles exist", async () => {
      const user = userEvent.setup();
      renderWithQuery(<PrivacyAnalyzerView />);

      const addBtn = screen.getByRole("button", { name: /Add another profile/i });
      await user.click(addBtn);
      await user.click(addBtn);

      const usernameInputs = screen.getAllByLabelText(/Username/i);
      await user.type(usernameInputs[0]!, "user_one");
      await user.type(usernameInputs[1]!, "user_two");
      await user.type(usernameInputs[2]!, "user_three");

      // Remove middle row (profile 2)
      const removeProfile2Btn = screen.getByRole("button", { name: /Remove profile 2/i });
      await user.click(removeProfile2Btn);

      expect(screen.getByText("2 / 10 profiles")).toBeInTheDocument();
      const remainingInputs = screen.getAllByLabelText(/Username/i);
      expect(remainingInputs).toHaveLength(2);
      expect(remainingInputs[0]).toHaveValue("user_one");
      expect(remainingInputs[1]).toHaveValue("user_three");
    });

    it("prevents removal of the last remaining profile", async () => {
      renderWithQuery(<PrivacyAnalyzerView />);
      expect(screen.getByText("1 / 10 profiles")).toBeInTheDocument();
      const removeButtons = screen.queryAllByRole("button", { name: /Remove profile/i });
      expect(removeButtons).toHaveLength(0);
    });
  });

  describe("B. Optional Display Name and Text Area", () => {
    it("renders optional display name with 80 character limit helper", () => {
      renderWithQuery(<PrivacyAnalyzerView />);
      const displayNameInput = screen.getByLabelText(/Display name/i);
      expect(displayNameInput).toBeInTheDocument();
      expect(displayNameInput).toHaveAttribute("maxLength", "80");
      expect(displayNameInput).not.toBeRequired();
    });

    it("updates character counter live as text is entered", async () => {
      const user = userEvent.setup();
      renderWithQuery(<PrivacyAnalyzerView />);

      const counter = screen.getByText(/0 \/ 10,000 characters/i);
      expect(counter).toBeInTheDocument();

      const textArea = screen.getByLabelText(/Text to analyze/i);
      await user.type(textArea, "Hello privacy world");

      expect(screen.getByText(/19 \/ 10,000 characters/i)).toBeInTheDocument();
    });

    it("confirms text area is not a password field", () => {
      renderWithQuery(<PrivacyAnalyzerView />);
      const textArea = screen.getByLabelText(/Text to analyze/i);
      expect(textArea.tagName.toLowerCase()).toBe("textarea");
      expect(textArea).not.toHaveAttribute("type", "password");
    });
  });

  describe("C. Consent Enforcement & Blocking", () => {
    it("initializes consent unchecked and keeps submit button disabled", () => {
      renderWithQuery(<PrivacyAnalyzerView />);

      const consentCheckbox = screen.getByRole("checkbox", {
        name: /I confirm that I have the right to submit this information/i,
      });
      expect(consentCheckbox).not.toBeChecked();

      const submitBtn = screen.getByRole("button", { name: /Analyze privacy exposure/i });
      expect(submitBtn).toBeDisabled();
    });

    it("enables submit button only when consent checkbox is checked", async () => {
      const user = userEvent.setup();
      renderWithQuery(<PrivacyAnalyzerView />);

      const consentCheckbox = screen.getByRole("checkbox", {
        name: /I confirm that I have the right to submit this information/i,
      });
      const submitBtn = screen.getByRole("button", { name: /Analyze privacy exposure/i });

      expect(submitBtn).toBeDisabled();
      await user.click(consentCheckbox);
      expect(consentCheckbox).toBeChecked();
      expect(submitBtn).not.toBeDisabled();

      await user.click(consentCheckbox);
      expect(consentCheckbox).not.toBeChecked();
      expect(submitBtn).toBeDisabled();
    });

    it("blocks form submission before any network call when consent is unchecked", async () => {
      const onSubmit = vi.fn();
      render(<PrivacyScanForm onSubmit={onSubmit} />);

      const submitBtn = screen.getByRole("button", { name: /Analyze privacy exposure/i });
      expect(submitBtn).toBeDisabled();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("supports keyboard interaction (Space key) to toggle consent checkbox", async () => {
      const user = userEvent.setup();
      renderWithQuery(<PrivacyAnalyzerView />);

      const consentCheckbox = screen.getByRole("checkbox", {
        name: /I confirm that I have the right to submit this information/i,
      });

      consentCheckbox.focus();
      expect(consentCheckbox).toHaveFocus();

      await user.keyboard(" ");
      expect(consentCheckbox).toBeChecked();

      await user.keyboard(" ");
      expect(consentCheckbox).not.toBeChecked();
    });
  });

  describe("D. Scope Notice and Zero Password Fields", () => {
    it("renders the scope notice with all required limitation points", () => {
      renderWithQuery(<PrivacyAnalyzerView />);

      const scopeNotice = screen.getByTestId("privacy-scope-notice");
      expect(scopeNotice).toBeInTheDocument();

      // Check key required scope concepts
      expect(screen.getByText(/Only information explicitly supplied/i)).toBeInTheDocument();
      expect(screen.getByText(/No internet-wide search/i)).toBeInTheDocument();
      expect(screen.getByText(/No profile page visits/i)).toBeInTheDocument();
      expect(screen.getByText(/No identity verification/i)).toBeInTheDocument();
      expect(screen.getByText(/No breach database lookup/i)).toBeInTheDocument();
      expect(screen.getByText(/Do not enter passwords/i)).toBeInTheDocument();
    });

    it("guarantees no input[type='password'] exists in the entire DOM", () => {
      const { container } = renderWithQuery(<PrivacyAnalyzerView />);
      const passwordInputs = container.querySelectorAll("input[type='password']");
      expect(passwordInputs).toHaveLength(0);

      // Verify no elements with password attributes or controls
      const allInputs = container.querySelectorAll("input");
      for (const input of allInputs) {
        expect(input.getAttribute("type")).not.toBe("password");
        expect(input.getAttribute("autocomplete") || "").not.toContain("password");
      }
    });
  });

  describe("E. Error Handling and Input Preservation", () => {
    it("preserves all entered values and consent state after a submission failure", async () => {
      const user = userEvent.setup();
      let rejected = false;
      const onSubmit = vi.fn().mockImplementation(async () => {
        rejected = true;
        throw new Error("Server error");
      });

      render(<PrivacyScanForm onSubmit={onSubmit} />);

      // Fill form values
      const usernameInput = screen.getByLabelText(/Username/i);
      const displayNameInput = screen.getByLabelText(/Display name/i);
      const textArea = screen.getByLabelText(/Text to analyze/i);
      const consentCheckbox = screen.getByRole("checkbox", {
        name: /I confirm that I have the right to submit this information/i,
      });

      await user.type(usernameInput, "test_preserve_user");
      await user.type(displayNameInput, "Test User");
      await user.type(textArea, "Important submitted text note");
      await user.click(consentCheckbox);

      const submitBtn = screen.getByRole("button", { name: /Analyze privacy exposure/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(rejected).toBe(true);
      });

      // Verify values remain intact in form fields after failure
      expect(usernameInput).toHaveValue("test_preserve_user");
      expect(displayNameInput).toHaveValue("Test User");
      expect(textArea).toHaveValue("Important submitted text note");
      expect(consentCheckbox).toBeChecked();
    });

    it("displays server field validation errors mapped to respective inputs", () => {
      const serverErrors = [
        { path: "profiles.0.username", message: "Username has invalid characters" },
        { path: "displayName", message: "Display name is too long" },
      ];

      render(
        <PrivacyScanForm
          onSubmit={vi.fn()}
          serverFieldErrors={serverErrors}
        />
      );

      expect(screen.getByText("Username has invalid characters")).toBeInTheDocument();
      expect(screen.getByText("Display name is too long")).toBeInTheDocument();
    });
  });
});
