import { describe, it, expect, vi } from "vitest";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import { Report } from "@threatory/contracts";
import { analyseUrl } from "../src/modules/url/service.js";
import { AppError } from "../src/middleware/errors.js";

describe("URL Analysis Service (analyseUrl)", () => {
  describe("Determinism", () => {
    it("produces identical findings, score, and assessment for the same URL twice", () => {
      const url = "http://198.51.100.23/login?redirect=https://phish.xyz";
      const res1 = analyseUrl(url, { scanId: "scan-det-1", createdAt: "2026-11-12T12:00:00.000Z" });
      const res2 = analyseUrl(url, { scanId: "scan-det-2", createdAt: "2026-11-12T12:00:00.000Z" });

      expect(res1.report.assessment).toEqual(res2.report.assessment);
      expect(res1.report.findings).toEqual(res2.report.findings);
      expect(res1.report.limitations).toEqual(res2.report.limitations);
      expect(res1.report.details).toEqual(res2.report.details);
      expect(res1.report.targetSummary).toBe(res2.report.targetSummary);
    });
  });

  describe("Golden Inputs (U1 to U4)", () => {
    it("U1: http://198.51.100.23/login produces URL_IP_HOST fail, URL_NO_HTTPS warn, URL_KEYWORDS warn, score 50, medium", () => {
      const { report } = analyseUrl("http://198.51.100.23/login");

      expect(() => Report.parse(report)).not.toThrow();
      expect(report.assessment.score).toBe(50);
      expect(report.assessment.riskLevel).toBe("medium");
      expect(report.assessment.label).toBe("Medium");

      const ipHost = report.findings.find((f) => f.code === "URL_IP_HOST");
      expect(ipHost?.outcome).toBe("fail");

      const noHttps = report.findings.find((f) => f.code === "URL_NO_HTTPS");
      expect(noHttps?.outcome).toBe("warn");

      const keywords = report.findings.find((f) => f.code === "URL_KEYWORDS");
      expect(keywords?.outcome).toBe("warn");
    });

    it("U2: https://example.com/ produces all pass, score 0, none_detected", () => {
      const { report } = analyseUrl("https://example.com/");

      expect(() => Report.parse(report)).not.toThrow();
      expect(report.assessment.score).toBe(0);
      expect(report.assessment.riskLevel).toBe("none_detected");
      expect(report.assessment.label).toBe("No suspicious signals detected");

      for (const finding of report.findings) {
        expect(finding.outcome).toBe("pass");
        expect(finding.severity).toBe("info");
      }
    });

    it("U3: https://paypal.com@example.net/login produces URL_USERINFO fail", () => {
      const { report } = analyseUrl("https://paypal.com@example.net/login");

      expect(() => Report.parse(report)).not.toThrow();
      const userinfo = report.findings.find((f) => f.code === "URL_USERINFO");
      expect(userinfo?.outcome).toBe("fail");
      expect(userinfo?.severity).toBe("high");
    });

    it("U4: ftp://example.com is rejected as 400 VALIDATION_ERROR with field path 'url'", () => {
      expect.assertions(3);
      try {
        analyseUrl("ftp://example.com");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.code).toBe("VALIDATION_ERROR");
        expect(appErr.fields?.[0]?.path).toBe("url");
      }
    });

    it("U5: https://paypa1.com/login produces URL_LOOKALIKE fail", () => {
      const { report } = analyseUrl("https://paypa1.com/login");

      expect(() => Report.parse(report)).not.toThrow();
      const lookalike = report.findings.find((f) => f.code === "URL_LOOKALIKE");
      expect(lookalike?.outcome).toBe("fail");
      expect(lookalike?.severity).toBe("high");
    });

    it("U6: https://xn--pple-43d.com/ produces URL_HOMOGRAPH fail", () => {
      const { report } = analyseUrl("https://xn--pple-43d.com/");

      expect(() => Report.parse(report)).not.toThrow();
      const homograph = report.findings.find((f) => f.code === "URL_HOMOGRAPH");
      expect(homograph?.outcome).toBe("fail");
      expect(homograph?.severity).toBe("high");
    });

    it("U7: https://bit.ly/abc123 produces URL_SHORTENER warn", () => {
      const { report } = analyseUrl("https://bit.ly/abc123");

      expect(() => Report.parse(report)).not.toThrow();
      const shortener = report.findings.find((f) => f.code === "URL_SHORTENER");
      expect(shortener?.outcome).toBe("warn");
      expect(shortener?.severity).toBe("medium");
    });

    it("U8: https://paypal.com.account-verify.xyz/login produces URL_BRAND_SUBDOMAIN warn, URL_ABUSED_TLD warn, URL_KEYWORDS warn", () => {
      const { report } = analyseUrl("https://paypal.com.account-verify.xyz/login");

      expect(() => Report.parse(report)).not.toThrow();
      const brandSub = report.findings.find((f) => f.code === "URL_BRAND_SUBDOMAIN");
      expect(brandSub?.outcome).toBe("warn");
      expect(brandSub?.severity).toBe("medium");

      const abusedTld = report.findings.find((f) => f.code === "URL_ABUSED_TLD");
      expect(abusedTld?.outcome).toBe("warn");

      const keywords = report.findings.find((f) => f.code === "URL_KEYWORDS");
      expect(keywords?.outcome).toBe("warn");
    });
  });

  describe("Limitations and Details", () => {
    it("always includes the three mandated limitations", () => {
      const { report } = analyseUrl("https://example.com/test");
      expect(report.limitations).toEqual([
        "Link not visited",
        "Page content not analysed",
        "Reputation feeds not consulted",
      ]);
    });

    it("populates details with scheme, host, registrableDomain, subdomainLabels, port, and queryParamNames", () => {
      const { report } = analyseUrl("https://sub.domain.example.com:8443/search?q=threat&lang=en");
      expect(report.details).toBeDefined();
      expect(report.details).toEqual({
        scheme: "https",
        host: "sub.domain.example.com",
        registrableDomain: "example.com",
        subdomainLabels: ["sub", "domain"],
        port: 8443,
        queryParamNames: ["q", "lang"],
      });
    });
  });

  describe("Zero Network I/O Guarantee", () => {
    it("stubs http, https, dns, and global fetch to throw and verifies service performs no network I/O", () => {
      const networkErrorMessage = "FATAL: Network call attempted in URL analyzer!";

      const spyHttpRequest = vi.spyOn(http, "request").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyHttpGet = vi.spyOn(http, "get").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyHttpsRequest = vi.spyOn(https, "request").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyHttpsGet = vi.spyOn(https, "get").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyDnsLookup = vi.spyOn(dns, "lookup").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyDnsResolve = vi.spyOn(dns, "resolve").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });
      const spyFetch = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
        throw new Error(networkErrorMessage);
      });

      const testUrls = [
        "http://198.51.100.23/login",
        "https://example.com/",
        "https://paypal.com@example.net/login",
        "https://deep.sub.domain.xyz:8080/path?redirect=https://external.org",
        "http://0x7f000001/admin",
        "https://bücher.example/search",
      ];

      for (const url of testUrls) {
        expect(() => analyseUrl(url)).not.toThrow();
      }

      expect(spyHttpRequest).not.toHaveBeenCalled();
      expect(spyHttpGet).not.toHaveBeenCalled();
      expect(spyHttpsRequest).not.toHaveBeenCalled();
      expect(spyHttpsGet).not.toHaveBeenCalled();
      expect(spyDnsLookup).not.toHaveBeenCalled();
      expect(spyDnsResolve).not.toHaveBeenCalled();
      expect(spyFetch).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });
});
