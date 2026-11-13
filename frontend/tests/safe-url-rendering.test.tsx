import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { URLScanResult } from "@/features/url/components/URLScanResult";
import { URLExamples } from "@/features/url/components/URLExamples";
import type { Report } from "@threatory/contracts";

const mockReportWithXssPayload: Report = {
  scanId: "scan-test-xss-001",
  module: "url",
  status: "completed",
  rulesVersion: "url-1.0.0",
  targetSummary: "<img src=x onerror=alert(1)><script>alert('pwned')</script>",
  assessment: {
    riskLevel: "medium",
    label: "Medium",
    score: 50,
    scoreMeaning: "Medium risk indicators detected",
  },
  findings: [
    {
      code: "URL_IP_HOST",
      category: "host",
      title: "Host is an IP address",
      outcome: "fail",
      severity: "high",
      evidence: "IP host detected in <script>alert(2)</script>",
      explanation: "Direct IP addresses are frequently abused.",
      recommendation: "Use a registered domain name with HTTPS.",
    },
  ],
  limitations: ["Link not visited", "Page content not analysed"],
  details: {
    host: "198.51.100.23",
    scheme: "http:",
    port: null,
    registrableDomain: null,
    subdomainLabels: [],
    queryParamNames: ["<b onmouseover=alert(3)>test</b>"],
  },
  createdAt: "2026-11-13T12:00:00.000Z",
};

describe("Strict plain-text URL rendering (Task 4)", () => {
  it("renders HTML-like strings as literal plain text without creating DOM elements", () => {
    const { container } = render(<URLScanResult report={mockReportWithXssPayload} />);

    // Verify literal string is in the document text
    expect(
      screen.getByText("<img src=x onerror=alert(1)><script>alert('pwned')</script>")
    ).toBeInTheDocument();

    // Verify no <img> elements were injected into the DOM
    const images = container.querySelectorAll("img");
    expect(images.length).toBe(0);

    // Verify no <script> elements were created
    const scripts = container.querySelectorAll("script");
    expect(scripts.length).toBe(0);

    // Verify query param names with HTML tags are rendered as text, not HTML
    expect(screen.getByText("<b onmouseover=alert(3)>test</b>")).toBeInTheDocument();
    const boldElements = container.querySelectorAll("b");
    expect(boldElements.length).toBe(0);
  });

  it("never creates external anchor links from submitted URL strings", () => {
    const { container } = render(<URLScanResult report={mockReportWithXssPayload} />);

    // Collect all anchor tags rendered in the component
    const anchors = container.querySelectorAll("a");

    // All anchors MUST be internal links to /reports/[scanId]
    for (const anchor of Array.from(anchors)) {
      const href = anchor.getAttribute("href");
      expect(href).not.toBeNull();
      expect(href).toMatch(/^\/reports\//);
      expect(href).not.toContain("alert");
      expect(href).not.toContain("http://");
      expect(href).not.toContain("https://");
    }
  });

  it("renders sample URL examples as buttons, not external navigation links", () => {
    const onSelect = () => {};
    const { container } = render(<URLExamples onSelect={onSelect} />);

    // No anchor elements should exist in the examples panel
    const anchors = container.querySelectorAll("a");
    expect(anchors.length).toBe(0);

    // Should have 3 interactive buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(3);

    // The URLs must appear as text
    expect(screen.getByText("http://198.51.100.23/login")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/")).toBeInTheDocument();
    expect(screen.getByText("https://paypal.com@example.net/login")).toBeInTheDocument();
  });
});
