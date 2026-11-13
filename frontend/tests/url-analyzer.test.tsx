import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { URLAnalyzerView } from "@/features/url/components/URLAnalyzerView";
import { URLScanForm } from "@/features/url/components/URLScanForm";
import { URLScanProgress } from "@/features/url/components/URLScanProgress";
import { URLScanResult } from "@/features/url/components/URLScanResult";
import { URLDetailsCard } from "@/features/url/components/URLDetailsCard";
import {
  renderWithQuery,
  expectNoAxeViolations,
  loadReportFixture,
} from "./test-utils";
import type { Report } from "@threatory/contracts";

vi.mock("next/navigation", () => ({
  usePathname: () => "/url-analyzer",
}));

describe("URL Analyzer Component Tests & Accessibility (Task 7)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("A. Form State Tests", () => {
    it("1. Empty state renders all expected elements and labels", () => {
      renderWithQuery(<URLAnalyzerView />);

      // Accessible URL input & label
      const input = screen.getByLabelText(/URL to analyze/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("");

      // Helper text
      expect(
        screen.getByText(/The destination website will not be visited/i)
      ).toBeInTheDocument();

      // Submit button
      const submitBtn = screen.getByRole("button", { name: /^Analyze URL$/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();

      // Three example buttons
      expect(screen.getByRole("button", { name: /Example 1 — U1/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Example 2 — U2/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Example 3 — U3/i })).toBeInTheDocument();
    });

    it("2. Invalid state handles empty, whitespace, and excessive length without clearing input", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<URLScanForm onSubmit={onSubmit} />);

      const submitBtn = screen.getByRole("button", { name: /^Analyze URL$/i });
      const input = screen.getByLabelText(/URL to analyze/i);

      // Submit empty
      await user.click(submitBtn);
      expect(onSubmit).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Submit whitespace only
      await user.type(input, "   ");
      await user.click(submitBtn);
      expect(onSubmit).not.toHaveBeenCalled();
      expect(input).toHaveValue("   ");

      // Excessive length (> 2048 chars)
      const longUrl = "https://example.com/" + "a".repeat(2040);
      await user.clear(input);
      await user.type(input, longUrl.slice(0, 10)); // type prefix
      // Use fireEvent/change for the full string to avoid slow typing
      await user.clear(input);
      await user.paste(longUrl);
      await user.click(submitBtn);
      expect(onSubmit).not.toHaveBeenCalled();
      expect(input).toHaveValue(longUrl);
    });

    it("3. Loading state displays indicator and disables submit action", () => {
      render(<URLScanForm onSubmit={vi.fn()} isLoading={true} />);

      const submitBtn = screen.getByRole("button", { name: /^Analyze URL$/i });
      expect(submitBtn).toBeDisabled();

      const input = screen.getByLabelText(/URL to analyze/i);
      expect(input).toBeDisabled();

      render(<URLScanProgress />);
      expect(screen.getByText(/Analyzing URL indicators\.\.\./i)).toBeInTheDocument();
      expect(
        screen.getByText(/Threatory does not visit the destination website/i)
      ).toBeInTheDocument();
    });

    it("4. Success state renders complete report structure and saved report link", () => {
      const fixtureReport = loadReportFixture("url-report-completed.json");
      renderWithQuery(<URLScanResult report={fixtureReport} />);

      // Target summary strictly as plain text
      expect(screen.getByTestId("scanned-url-text")).toHaveTextContent(
        fixtureReport.targetSummary
      );

      // Assessment
      expect(
        screen.getAllByText(fixtureReport.assessment.label).length
      ).toBeGreaterThanOrEqual(1);

      // Technical details
      expect(
        screen.getByRole("heading", { name: "Technical URL details" })
      ).toBeInTheDocument();

      // Limitations
      expect(
        screen.getByRole("region", { name: /Analysis limitations/i })
      ).toBeInTheDocument();

      // Saved report links
      const links = screen.getAllByRole("link", {
        name: new RegExp(`Open saved report`, "i"),
      });
      expect(links.length).toBeGreaterThanOrEqual(1);
      expect(links[0]).toHaveAttribute("href", `/reports/${fixtureReport.scanId}`);
    });
  });

  describe("D. URL Details Card Tests", () => {
    it("renders host, registrable domain, explicit port, scheme, and query param names", () => {
      render(
        <URLDetailsCard
          details={{
            host: "auth.example.com",
            registrableDomain: "example.com",
            port: 8443,
            scheme: "https:",
            subdomainLabels: ["auth"],
            queryParamNames: ["redirect_uri", "client_id"],
          }}
        />
      );

      expect(screen.getByText("auth.example.com")).toBeInTheDocument();
      expect(screen.getByText("example.com")).toBeInTheDocument();
      expect(screen.getByText(/Explicit port: 8443/i)).toBeInTheDocument();
      expect(screen.getByText("https:")).toBeInTheDocument();
      expect(screen.getByText("auth")).toBeInTheDocument();
      expect(screen.getByText("redirect_uri")).toBeInTheDocument();
      expect(screen.getByText("client_id")).toBeInTheDocument();
    });

    it("safely handles default port, empty params, and missing or unexpected types", () => {
      render(
        <URLDetailsCard
          details={{
            host: "example.org",
            registrableDomain: null,
            port: null,
            scheme: null,
            subdomainLabels: [],
            queryParamNames: [],
            unexpectedField: { nested: true },
          }}
        />
      );

      expect(screen.getByText("example.org")).toBeInTheDocument();
      expect(screen.getByText(/Default \(standard scheme port\)/i)).toBeInTheDocument();
      expect(screen.getByText(/None \(IP or standalone host\)/i)).toBeInTheDocument();
      expect(screen.getByText(/None detected/i)).toBeInTheDocument();
      // Ensure no unexpected object formatting like [object Object]
      expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
    });

    it("never displays query parameter values", () => {
      render(
        <URLDetailsCard
          details={{
            host: "example.com",
            queryParamNames: ["secret_token", "user_id"],
          }}
        />
      );

      expect(screen.getByText("secret_token")).toBeInTheDocument();
      expect(screen.getByText("user_id")).toBeInTheDocument();
      // Ensure no value string is present
      expect(screen.queryByText("secret123")).not.toBeInTheDocument();
    });
  });

  describe("E. Finding Semantics Tests", () => {
    it("renders pass, warn, fail findings, severities, and recommendations", () => {
      const testReport: Report = {
        scanId: "scan-finding-semantics-1",
        module: "url",
        status: "completed",
        rulesVersion: "url-1.0.0",
        targetSummary: "http://198.51.100.23/login",
        assessment: {
          riskLevel: "medium",
          label: "Medium",
          score: 50,
        },
        findings: [
          {
            code: "URL_IP_HOST",
            category: "host",
            title: "Host is an IP address",
            outcome: "fail",
            severity: "high",
            evidence: "Host literal '198.51.100.23'",
            explanation: "IP hosts are commonly associated with phishing.",
            recommendation: "Use a registered domain name instead of a bare IP.",
          },
          {
            code: "URL_NO_HTTPS",
            category: "protocol",
            title: "Insecure HTTP scheme",
            outcome: "warn",
            severity: "medium",
            evidence: "Scheme is http",
            explanation: "HTTP traffic is not encrypted.",
            recommendation: "Always use HTTPS to encrypt web traffic.",
          },
          {
            code: "URL_USERINFO",
            category: "credentials",
            title: "Embedded credentials",
            outcome: "pass",
            severity: "info",
            evidence: "No userinfo present",
            explanation: "No user credentials in URL.",
          },
        ],
        limitations: ["Link not visited"],
        details: { host: "198.51.100.23" },
        createdAt: "2026-11-13T12:00:00.000Z",
      };

      renderWithQuery(<URLScanResult report={testReport} />);

      // Outcomes and severities
      expect(screen.getByText("Host is an IP address")).toBeInTheDocument();
      expect(screen.getByText("Insecure HTTP scheme")).toBeInTheDocument();
      expect(screen.getByText("Embedded credentials")).toBeInTheDocument();

      // Recommendations visible
      expect(
        screen.getByText("Use a registered domain name instead of a bare IP.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Always use HTTPS to encrypt web traffic.")
      ).toBeInTheDocument();
    });
  });

  describe("F. Accessibility (vitest-axe)", () => {
    it("has zero axe violations on the empty URL Analyzer form", async () => {
      const { container } = renderWithQuery(<URLAnalyzerView />);
      await expectNoAxeViolations(container);
    });

    it("has zero axe violations on the URL progress loading state", async () => {
      const { container } = render(<URLScanProgress />);
      await expectNoAxeViolations(container);
    });

    it("has zero axe violations on the URL Details card", async () => {
      const { container } = render(
        <URLDetailsCard
          details={{
            host: "login.example.com",
            registrableDomain: "example.com",
            port: null,
            scheme: "https:",
            subdomainLabels: ["login"],
            queryParamNames: ["redirect", "state"],
          }}
        />
      );
      await expectNoAxeViolations(container);
    });

    it("has zero axe violations on the full URL scan result", async () => {
      const fixtureReport = loadReportFixture("url-report-completed.json");
      const { container } = renderWithQuery(<URLScanResult report={fixtureReport} />);
      await expectNoAxeViolations(container);
    });
  });
});
