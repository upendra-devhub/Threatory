import { describe, it, expect } from "vitest";
import { Finding } from "@threatory/contracts";
import { normaliseUrl } from "../src/modules/url/normalise.js";
import {
  runCoreRules,
  runAllRules,
  shannonEntropy,
  checkLookalike,
  checkHomograph,
  checkBrandSubdomain,
  checkShortener,
} from "../src/modules/url/rules.js";

describe("URL Core Rules Engine", () => {
  function getFinding(findings: ReturnType<typeof runCoreRules>, code: string) {
    const finding = findings.find((f) => f.code === code);
    if (!finding) {
      throw new Error(`Rule ${code} not found in findings`);
    }
    return finding;
  }

  it("calculates Shannon entropy correctly", () => {
    expect(shannonEntropy("")).toBe(0);
    expect(shannonEntropy("aaaaaa")).toBe(0);
    // 2 distinct characters equally distributed
    expect(shannonEntropy("ababab")).toBeCloseTo(1.0, 2);
    // Highly random string
    expect(shannonEntropy("a8b7c6d5e4f3g2h1")).toBeGreaterThan(3.5);
  });

  describe("Rule 1: URL_NO_HTTPS", () => {
    it("triggers warn (severity medium, weight 15) when scheme is http", () => {
      const norm = normaliseUrl("http://example.com/test");
      const findings = runCoreRules(norm);
      const f = getFinding(findings, "URL_NO_HTTPS");

      expect(f.outcome).toBe("warn");
      expect(f.severity).toBe("medium");
      expect(f.weight).toBe(15);
      expect(f.recommendation).toBeDefined();
      expect(f.recommendation?.length).toBeGreaterThan(0);
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("passes (severity info, weight 0) when scheme is https", () => {
      const norm = normaliseUrl("https://example.com/test");
      const findings = runCoreRules(norm);
      const f = getFinding(findings, "URL_NO_HTTPS");

      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
      expect(f.weight).toBe(0);
      expect(() => Finding.parse(f)).not.toThrow();
    });
  });

  describe("Rule 2: URL_IP_HOST", () => {
    it("triggers fail (severity high, weight 30) for IPv4 dotted decimal literal", () => {
      const norm = normaliseUrl("http://198.51.100.23/login");
      const findings = runCoreRules(norm);
      const f = getFinding(findings, "URL_IP_HOST");

      expect(f.outcome).toBe("fail");
      expect(f.severity).toBe("high");
      expect(f.weight).toBe(30);
      expect(f.recommendation).toBeDefined();
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("triggers fail for hex and octal IP literals", () => {
      const hexNorm = normaliseUrl("http://0x7f000001/test");
      expect(getFinding(runCoreRules(hexNorm), "URL_IP_HOST").outcome).toBe("fail");

      const octNorm = normaliseUrl("http://0177.0.0.1/test");
      expect(getFinding(runCoreRules(octNorm), "URL_IP_HOST").outcome).toBe("fail");
    });

    it("passes for standard domain names", () => {
      const norm = normaliseUrl("https://example.com/");
      const f = getFinding(runCoreRules(norm), "URL_IP_HOST");
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
      expect(() => Finding.parse(f)).not.toThrow();
    });
  });

  describe("Rule 3: URL_USERINFO", () => {
    it("triggers fail (severity high, weight 25) when credentials precede host", () => {
      const norm = normaliseUrl("https://paypal.com@example.net/login");
      const findings = runCoreRules(norm);
      const f = getFinding(findings, "URL_USERINFO");

      expect(f.outcome).toBe("fail");
      expect(f.severity).toBe("high");
      expect(f.weight).toBe(25);
      expect(f.recommendation).toBeDefined();
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("triggers fail when username:password is supplied", () => {
      const norm = normaliseUrl("https://admin:secret@example.com/");
      const f = getFinding(runCoreRules(norm), "URL_USERINFO");
      expect(f.outcome).toBe("fail");
    });

    it("passes when no credentials are embedded", () => {
      const norm = normaliseUrl("https://example.com/login");
      const f = getFinding(runCoreRules(norm), "URL_USERINFO");
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
      expect(() => Finding.parse(f)).not.toThrow();
    });
  });

  describe("Rule 4: URL_ENCODED", () => {
    it("triggers warn (severity low, weight 10) on double percent-encoding (%25)", () => {
      const norm = normaliseUrl("https://example.com/%252e%252e/admin");
      const findings = runCoreRules(norm);
      const f = getFinding(findings, "URL_ENCODED");

      expect(f.outcome).toBe("warn");
      expect(f.severity).toBe("low");
      expect(f.weight).toBe(10);
      expect(f.recommendation).toBeDefined();
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("triggers warn on encoded path slashes and dots (%2e, %2f, %5c)", () => {
      const norm = normaliseUrl("https://example.com/path%2fadmin");
      const f = getFinding(runCoreRules(norm), "URL_ENCODED");
      expect(f.outcome).toBe("warn");
    });

    it("passes on normal URLs without obfuscated encoding", () => {
      const norm = normaliseUrl("https://example.com/hello-world");
      const f = getFinding(runCoreRules(norm), "URL_ENCODED");
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
      expect(() => Finding.parse(f)).not.toThrow();
    });
  });

  describe("Rule 5: URL_REDIRECT_PARAM", () => {
    it("triggers warn (severity low, weight 10) when redirect parameter contains a target URL", () => {
      const norm = normaliseUrl("https://example.com/login?redirect=https://phish.com/target");
      const findings = runCoreRules(norm);
      const f = getFinding(findings, "URL_REDIRECT_PARAM");

      expect(f.outcome).toBe("warn");
      expect(f.severity).toBe("low");
      expect(f.weight).toBe(10);
      expect(f.recommendation).toBeDefined();
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("triggers warn on encoded URL redirect target", () => {
      const norm = normaliseUrl("https://example.com/auth?next=http%3A%2F%2Fexternal.net%2Fdest");
      const f = getFinding(runCoreRules(norm), "URL_REDIRECT_PARAM");
      expect(f.outcome).toBe("warn");
    });

    it("passes when redirect parameter holds a harmless non-URL value", () => {
      const norm = normaliseUrl("https://example.com/login?redirect=profile");
      const f = getFinding(runCoreRules(norm), "URL_REDIRECT_PARAM");
      expect(f.outcome).toBe("pass");
    });

    it("passes when no redirect parameters are present", () => {
      const norm = normaliseUrl("https://example.com/view?id=123&sort=asc");
      const f = getFinding(runCoreRules(norm), "URL_REDIRECT_PARAM");
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
    });
  });

  describe("Rule 6: URL_HIGH_ENTROPY", () => {
    it("triggers warn (severity low, weight 10) when longest host label >= 12 chars and entropy >= 3.5", () => {
      // 16 distinct chars -> high entropy
      const norm = normaliseUrl("https://qx7z9k2m4b8v1p0w.example.com/");
      const findings = runCoreRules(norm);
      const f = getFinding(findings, "URL_HIGH_ENTROPY");

      expect(f.outcome).toBe("warn");
      expect(f.severity).toBe("low");
      expect(f.weight).toBe(10);
      expect(f.recommendation).toBeDefined();
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("passes when longest host label is under 12 characters", () => {
      const norm = normaliseUrl("https://abc123xyz.example.com/");
      const f = getFinding(runCoreRules(norm), "URL_HIGH_ENTROPY");
      expect(f.outcome).toBe("pass");
    });

    it("passes when host label is long but low entropy", () => {
      const norm = normaliseUrl("https://aaaaaaaaaaaaaaaaaaaa.example.com/");
      const f = getFinding(runCoreRules(norm), "URL_HIGH_ENTROPY");
      expect(f.outcome).toBe("pass");
    });

    it("never applies to IP hosts even if length or numbers seem high", () => {
      const norm = normaliseUrl("http://198.51.100.23/login");
      const f = getFinding(runCoreRules(norm), "URL_HIGH_ENTROPY");
      expect(f.outcome).toBe("pass");
    });
  });

  describe("Rule 7: URL_ABUSED_TLD", () => {
    it("triggers warn (severity low, weight 8) on watch-listed TLDs (e.g. .xyz, .top, .click)", () => {
      const tlds = ["xyz", "top", "click", "zip", "mov"];
      for (const tld of tlds) {
        const norm = normaliseUrl(`https://phishing-campaign.${tld}/account`);
        const f = getFinding(runCoreRules(norm), "URL_ABUSED_TLD");
        expect(f.outcome).toBe("warn");
        expect(f.severity).toBe("low");
        expect(f.weight).toBe(8);
        expect(f.recommendation).toBeDefined();
        expect(() => Finding.parse(f)).not.toThrow();
      }
    });

    it("passes on common legitimate TLDs (.com, .org, .edu)", () => {
      const norm = normaliseUrl("https://trusted-site.com/");
      const f = getFinding(runCoreRules(norm), "URL_ABUSED_TLD");
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
    });

    it("does not trigger on IP hosts", () => {
      const norm = normaliseUrl("http://198.51.100.23/login");
      const f = getFinding(runCoreRules(norm), "URL_ABUSED_TLD");
      expect(f.outcome).toBe("pass");
    });
  });

  describe("Rule 8: URL_EXCESS_SUBDOMAINS", () => {
    it("triggers warn (severity low, weight 8) when subdomain labels exceed 3", () => {
      const norm = normaliseUrl("https://a.b.c.d.example.com/");
      const findings = runCoreRules(norm);
      const f = getFinding(findings, "URL_EXCESS_SUBDOMAINS");

      expect(f.outcome).toBe("warn");
      expect(f.severity).toBe("low");
      expect(f.weight).toBe(8);
      expect(f.recommendation).toBeDefined();
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("passes when subdomain labels count is 3 or fewer", () => {
      const norm = normaliseUrl("https://sub1.sub2.sub3.example.com/");
      const f = getFinding(runCoreRules(norm), "URL_EXCESS_SUBDOMAINS");
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
    });
  });

  describe("Rule 9: URL_NONSTANDARD_PORT", () => {
    it("triggers warn (severity low, weight 8) on non-standard ports", () => {
      const normHttp = normaliseUrl("http://example.com:8080/");
      expect(getFinding(runCoreRules(normHttp), "URL_NONSTANDARD_PORT").outcome).toBe("warn");

      const normHttps = normaliseUrl("https://example.com:8443/");
      expect(getFinding(runCoreRules(normHttps), "URL_NONSTANDARD_PORT").outcome).toBe("warn");
    });

    it("passes on standard ports or default ports", () => {
      const norm1 = normaliseUrl("https://example.com/");
      expect(getFinding(runCoreRules(norm1), "URL_NONSTANDARD_PORT").outcome).toBe("pass");

      const norm2 = normaliseUrl("http://example.com:80/");
      expect(getFinding(runCoreRules(norm2), "URL_NONSTANDARD_PORT").outcome).toBe("pass");
    });
  });

  describe("Rule 10: URL_KEYWORDS", () => {
    it("triggers warn (severity low, weight 5) on host or path keywords", () => {
      const keywords = ["login", "signin", "verify", "account", "secure", "banking", "wallet"];
      for (const kw of keywords) {
        const norm = normaliseUrl(`https://example.com/${kw}`);
        const f = getFinding(runCoreRules(norm), "URL_KEYWORDS");
        expect(f.outcome).toBe("warn");
        expect(f.severity).toBe("low");
        expect(f.weight).toBe(5);
        expect(f.recommendation).toBeDefined();
        expect(() => Finding.parse(f)).not.toThrow();
      }
    });

    it("passes when no sensitive keywords appear", () => {
      const norm = normaliseUrl("https://example.com/about/team");
      const f = getFinding(runCoreRules(norm), "URL_KEYWORDS");
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
    });
  });

  describe("Rule 11: URL_LONG", () => {
    it("triggers warn (severity low, weight 5) when URL exceeds 100 characters", () => {
      const longUrl = "https://example.com/" + "a".repeat(110);
      const norm = normaliseUrl(longUrl);
      const findings = runCoreRules(norm);
      const f = getFinding(findings, "URL_LONG");

      expect(f.outcome).toBe("warn");
      expect(f.severity).toBe("low");
      expect(f.weight).toBe(5);
      expect(f.recommendation).toBeDefined();
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("passes when URL is 100 characters or fewer", () => {
      const norm = normaliseUrl("https://example.com/short-path");
      const f = getFinding(runCoreRules(norm), "URL_LONG");
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
    });
  });

  it("always emits exactly all 11 core rules in deterministic order", () => {
    const norm = normaliseUrl("https://example.com/");
    const findings = runCoreRules(norm);
    expect(findings).toHaveLength(11);

    const codes = findings.map((f) => f.code);
    expect(codes).toEqual([
      "URL_NO_HTTPS",
      "URL_IP_HOST",
      "URL_USERINFO",
      "URL_ENCODED",
      "URL_REDIRECT_PARAM",
      "URL_HIGH_ENTROPY",
      "URL_ABUSED_TLD",
      "URL_EXCESS_SUBDOMAINS",
      "URL_NONSTANDARD_PORT",
      "URL_KEYWORDS",
      "URL_LONG",
    ]);
  });

  describe("Rule: URL_LOOKALIKE (CP-06)", () => {
    it("triggers fail (severity high, weight 30) for typosquatting lookalike (U5: paypa1.com)", () => {
      const norm = normaliseUrl("https://paypa1.com/login");
      const f = checkLookalike(norm);
      expect(f.outcome).toBe("fail");
      expect(f.severity).toBe("high");
      expect(f.weight).toBe(30);
      expect(f.evidence).toContain("paypal.com");
      expect(f.recommendation).toBeDefined();
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("passes for exact authoritative top domain (paypal.com)", () => {
      const norm = normaliseUrl("https://paypal.com/login");
      const f = checkLookalike(norm);
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
      expect(f.weight).toBe(0);
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("passes for standard benign domain not resembling top domains", () => {
      const norm = normaliseUrl("https://example.com/");
      const f = checkLookalike(norm);
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
      expect(f.weight).toBe(0);
    });

    it("passes for IP addresses", () => {
      const norm = normaliseUrl("http://198.51.100.23/login");
      const f = checkLookalike(norm);
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
    });
  });

  describe("Rule: URL_HOMOGRAPH (CP-06)", () => {
    it("triggers fail (severity high, weight 30) for punycode label (U6: xn--pple-43d.com)", () => {
      const norm = normaliseUrl("https://xn--pple-43d.com/");
      const f = checkHomograph(norm);
      expect(f.outcome).toBe("fail");
      expect(f.severity).toBe("high");
      expect(f.weight).toBe(30);
      expect(f.evidence).toContain("xn--pple-43d");
      expect(f.recommendation).toBeDefined();
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("passes for standard ASCII labels without punycode or mixed scripts", () => {
      const norm = normaliseUrl("https://apple.com/");
      const f = checkHomograph(norm);
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
      expect(f.weight).toBe(0);
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("passes for IP address literal", () => {
      const norm = normaliseUrl("http://198.51.100.23/");
      const f = checkHomograph(norm);
      expect(f.outcome).toBe("pass");
    });
  });

  describe("Rule: URL_BRAND_SUBDOMAIN (CP-06)", () => {
    it("triggers warn (severity medium, weight 25) when brand appears in subdomain of unrelated domain (U8)", () => {
      const norm = normaliseUrl("https://paypal.com.account-verify.xyz/login");
      const f = checkBrandSubdomain(norm);
      expect(f.outcome).toBe("warn");
      expect(f.severity).toBe("medium");
      expect(f.weight).toBe(25);
      expect(f.evidence).toContain("paypal");
      expect(f.evidence).toContain("account-verify.xyz");
      expect(f.recommendation).toBeDefined();
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("passes when the domain itself is the brand", () => {
      const norm = normaliseUrl("https://login.paypal.com/signin");
      const f = checkBrandSubdomain(norm);
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
      expect(f.weight).toBe(0);
    });

    it("passes when no brand appears in subdomain or path", () => {
      const norm = normaliseUrl("https://example.com/");
      const f = checkBrandSubdomain(norm);
      expect(f.outcome).toBe("pass");
    });
  });

  describe("Rule: URL_SHORTENER (CP-06)", () => {
    it("triggers warn (severity medium, weight 15) for known shortener host (U7: bit.ly)", () => {
      const norm = normaliseUrl("https://bit.ly/abc123");
      const f = checkShortener(norm);
      expect(f.outcome).toBe("warn");
      expect(f.severity).toBe("medium");
      expect(f.weight).toBe(15);
      expect(f.evidence).toContain("bit.ly");
      expect(f.recommendation).toBeDefined();
      expect(() => Finding.parse(f)).not.toThrow();
    });

    it("passes for standard non-shortener hosts", () => {
      const norm = normaliseUrl("https://example.com/some/long/path");
      const f = checkShortener(norm);
      expect(f.outcome).toBe("pass");
      expect(f.severity).toBe("info");
      expect(f.weight).toBe(0);
    });
  });

  it("always emits exactly all 16 rules in runAllRules", () => {
    const norm = normaliseUrl("https://example.com/");
    const findings = runAllRules(norm);
    expect(findings).toHaveLength(16);
    expect(findings.every((f) => f.outcome === "pass")).toBe(true);
  });
});
