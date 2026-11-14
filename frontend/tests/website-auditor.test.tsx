import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WebsiteAuditorView } from "@/features/website/components/WebsiteAuditorView";
import { WebsiteScanForm } from "@/features/website/components/WebsiteScanForm";
import { WebsiteScopeNotice } from "@/features/website/components/WebsiteScopeNotice";
import { WebsiteResult } from "@/features/website/components/WebsiteResult";
import { WebsiteScanProgress } from "@/features/website/components/WebsiteScanProgress";
import { CertificateCard } from "@/features/website/components/CertificateCard";
import {
  renderWithQuery,
  expectNoAxeViolations,
  loadReportFixture,
} from "./test-utils";
import type { Report } from "@threatory/contracts";

vi.mock("next/navigation", () => ({
  usePathname: () => "/website-auditor",
}));

describe("Website Auditor Component Tests & Accessibility (CP-10 Task 5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("A. Form State & Authorisation Enforcement", () => {
    it("renders URL input, mandatory authorisation checkbox, and scope disclosures", () => {
      renderWithQuery(<WebsiteAuditorView />);

      expect(screen.getByRole("heading", { name: "Website Auditor", level: 1 })).toBeInTheDocument();
      expect(screen.getByLabelText(/Target website URL/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText("I own this site or have permission to assess it")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Audit website/i })
      ).toBeInTheDocument();

      // Scope notice landmark region
      expect(screen.getByTestId("website-scope-notice")).toBeInTheDocument();
      expect(screen.getByText(/What is tested/i)).toBeInTheDocument();
      expect(screen.getByText(/What is NOT tested/i)).toBeInTheDocument();
      expect(screen.getByText(/No vulnerability exploits or attack payloads are transmitted/i)).toBeInTheDocument();
    });

    it("STRICT REQUIREMENT: form cannot be submitted without authorisation checkbox", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderWithQuery(
        <WebsiteScanForm onSubmit={onSubmit} />
      );

      const urlInput = screen.getByLabelText(/Target website URL/i);
      const submitButton = screen.getByRole("button", { name: /Audit website/i });
      const authCheckbox = screen.getByLabelText("I own this site or have permission to assess it");

      expect(authCheckbox).not.toBeChecked();

      // Enter a valid URL but leave checkbox unticked
      await user.type(urlInput, "https://example.com");
      await user.click(submitButton);

      // Validation fails: onSubmit is NOT called
      expect(onSubmit).not.toHaveBeenCalled();

      // Error message is displayed for authorisation
      await waitFor(() => {
        expect(
          screen.getByText("You must confirm authorisation to audit this website")
        ).toBeInTheDocument();
      });

      // Now tick the checkbox and submit again
      await user.click(authCheckbox);
      expect(authCheckbox).toBeChecked();

      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          url: "https://example.com",
          authorised: true,
        });
      });
    });

    it("rejects empty URL input with friendly validation error", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderWithQuery(
        <WebsiteScanForm onSubmit={onSubmit} />
      );

      const authCheckbox = screen.getByLabelText("I own this site or have permission to assess it");
      const submitButton = screen.getByRole("button", { name: /Audit website/i });

      // Tick checkbox but URL remains empty
      await user.click(authCheckbox);
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText("Website URL is required")).toBeInTheDocument();
      });
    });
  });

  describe("B. Progress State (25s Scan Budget)", () => {
    it("clearly announces that the audit can take up to 25 seconds", () => {
      renderWithQuery(<WebsiteScanProgress />);

      const progress = screen.getByTestId("website-scan-progress");
      expect(progress).toHaveAttribute("role", "status");
      expect(progress).toHaveAttribute("aria-live", "polite");
      expect(
        screen.getByText(/Auditing website security configuration\.\.\./i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/A scan can take up to 25 seconds to complete\./i)
      ).toBeInTheDocument();
    });
  });

  describe("C. Error Handling & TARGET_BLOCKED", () => {
    it("TARGET_BLOCKED: displays EXACT copy and suppresses all internal IP / server details", async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "TARGET_BLOCKED",
              message: "Target IP 127.0.0.1 is non-public loopback address on interface eth0",
            },
          }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        )
      );

      renderWithQuery(<WebsiteAuditorView />);

      const urlInput = screen.getByLabelText(/Target website URL/i);
      const authCheckbox = screen.getByLabelText("I own this site or have permission to assess it");
      const submitButton = screen.getByRole("button", { name: /Audit website/i });

      await user.type(urlInput, "http://127.0.0.1");
      await user.click(authCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("This address cannot be audited because it is not a public website")
        ).toBeInTheDocument();
      });

      // INVARIANT: Verify no internal IP, interface, or server message leaked
      expect(screen.queryByText(/127\.0\.0\.1/)).not.toBeInTheDocument();
      expect(screen.queryByText(/eth0/)).not.toBeInTheDocument();
      expect(screen.queryByText(/loopback/)).not.toBeInTheDocument();

      // Retry button is available
      expect(screen.getByRole("button", { name: /Retry audit/i })).toBeInTheDocument();
    });
  });

  describe("D. Grouped Results, Certificate Summary, & Invariants", () => {
    it("renders grouped categories: Connection and TLS, HTTP headers, Cookies, DNS and email", () => {
      const report = loadReportFixture("website-report-completed.json");
      renderWithQuery(<WebsiteResult report={report} />);

      // Verify the 4 exact category group headings
      expect(screen.getByRole("heading", { name: "Connection and TLS", level: 3 })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "HTTP headers", level: 3 })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Cookies", level: 3 })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "DNS and email", level: 3 })).toBeInTheDocument();

      // Verify NO score is displayed
      expect(screen.queryByText(/Rule-based score/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/\/ 100/i)).not.toBeInTheDocument();

      // Assessment summary label is shown as text
      expect(screen.getByText(report.assessment.label)).toBeInTheDocument();
    });

    it("partial fixture shows not_assessed separately from pass and names unassessed checks in banner", () => {
      const partialReport = loadReportFixture("website-report-partial.json");
      renderWithQuery(<WebsiteResult report={partialReport} />);

      // Partial banner is visible and explicitly names unassessed checks
      const banner = screen.getByTestId("partial-scan-banner");
      expect(banner).toBeInTheDocument();
      expect(screen.getByTestId("unassessed-checks-list")).toHaveTextContent("SITE_DMARC");
      expect(screen.getAllByText(/SITE_DMARC/).length).toBeGreaterThanOrEqual(1);

      // Finding with not_assessed outcome is rendered with distinct badge
      const notAssessedBadge = screen.getByTestId("unassessed-checks-list");
      expect(notAssessedBadge).toBeInTheDocument();

      const outcomeBadges = screen.getAllByTestId("outcome-badge");
      const notAssessedOutcomes = outcomeBadges.filter(
        (b) => b.getAttribute("data-outcome") === "not_assessed"
      );
      expect(notAssessedOutcomes.length).toBeGreaterThan(0);
      expect(notAssessedOutcomes[0]).toHaveTextContent("Not assessed");
    });

    it("an unreachable target (failed report) is NEVER displayed as a pass or safe", () => {
      const failedReport = loadReportFixture("website-report-failed.json");
      renderWithQuery(<WebsiteResult report={failedReport} />);

      // Never shows "Safe"
      expect(screen.queryByText(/\bSafe\b/i)).not.toBeInTheDocument();

      // Findings empty state indicates absence of findings without claiming target is safe
      expect(
        screen.getByText(/The absence of findings does not confirm that all checks passed/i)
      ).toBeInTheDocument();
    });

    it("renders CertificateCard with subject, issuer, validity, protocol, and days remaining as text", () => {
      renderWithQuery(
        <CertificateCard
          certificate={{
            subject: "CN=example.com",
            issuer: "CN=DigiCert Global Root G2",
            validFrom: "2026-01-01T00:00:00.000Z",
            validTo: "2027-01-01T00:00:00.000Z",
            protocol: "TLSv1.3",
            daysRemaining: 180,
            authorized: true,
          }}
        />
      );

      expect(screen.getByTestId("cert-subject")).toHaveTextContent("CN=example.com");
      expect(screen.getByTestId("cert-issuer")).toHaveTextContent("CN=DigiCert Global Root G2");
      expect(screen.getByTestId("cert-protocol")).toHaveTextContent("TLSv1.3");
      expect(screen.getByTestId("cert-days-remaining")).toHaveTextContent("180 days");
      expect(screen.getByText("Authorized")).toBeInTheDocument();
    });

    it("INVARIANT: submitted target URL is strictly plain text and NEVER a clickable link", () => {
      const testReport: Report = {
        scanId: "scan-web-link-check",
        module: "website",
        status: "completed",
        rulesVersion: "website-1.0.0",
        targetSummary: "https://malicious-redirect.example.com/payload?a=1",
        assessment: {
          label: "Low",
          riskLevel: "low",
        },
        findings: [
          {
            code: "SITE_HTTPS_AVAILABLE",
            category: "tls",
            title: "HTTPS availability",
            outcome: "pass",
            severity: "info",
            evidence: "Target accepts TLS on port 443",
            explanation: "Port 443 opened",
          },
        ],
        limitations: ["Passive check"],
        details: {
          finalUrl: "https://malicious-redirect.example.com/",
        },
        createdAt: "2026-11-14T10:00:00.000Z",
      };

      const { container } = renderWithQuery(<WebsiteResult report={testReport} />);

      // Plain text element is rendered
      const urlText = screen.getByTestId("scanned-website-text");
      expect(urlText).toHaveTextContent("https://malicious-redirect.example.com/payload?a=1");

      // Verify NO anchor tag wraps the target or points to the target
      const anchors = container.querySelectorAll("a");
      for (const anchor of Array.from(anchors)) {
        const href = anchor.getAttribute("href");
        expect(href).not.toContain("malicious-redirect");
        expect(href).not.toContain("https://");
        expect(href).toMatch(/^\/reports\//);
      }
    });
  });

  describe("E. Accessibility (vitest-axe)", () => {
    it("has zero axe violations on the empty WebsiteAuditorView", async () => {
      const { container } = renderWithQuery(<WebsiteAuditorView />);
      await expectNoAxeViolations(container);
    });

    it("has zero axe violations on WebsiteScopeNotice", async () => {
      const { container } = renderWithQuery(<WebsiteScopeNotice />);
      await expectNoAxeViolations(container);
    });

    it("has zero axe violations on WebsiteScanProgress", async () => {
      const { container } = renderWithQuery(<WebsiteScanProgress />);
      await expectNoAxeViolations(container);
    });

    it("has zero axe violations on WebsiteResult with completed report fixture", async () => {
      const report = loadReportFixture("website-report-completed.json");
      const { container } = renderWithQuery(<WebsiteResult report={report} />);
      await expectNoAxeViolations(container);
    });

    it("has zero axe violations on WebsiteResult with partial report fixture", async () => {
      const report = loadReportFixture("website-report-partial.json");
      const { container } = renderWithQuery(<WebsiteResult report={report} />);
      await expectNoAxeViolations(container);
    });

    it("has zero axe violations on CertificateCard", async () => {
      const { container } = renderWithQuery(
        <CertificateCard
          certificate={{
            subject: "CN=example.com",
            issuer: "CN=Let's Encrypt Authority X3",
            validFrom: "2026-01-01T00:00:00.000Z",
            validTo: "2026-04-01T00:00:00.000Z",
            protocol: "TLSv1.3",
            daysRemaining: 45,
            authorized: true,
          }}
        />
      );
      await expectNoAxeViolations(container);
    });
  });
});
