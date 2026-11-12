import { describe, it, expect } from "vitest";
import { normaliseUrl } from "../src/modules/url/normalise.js";
import { AppError } from "../src/middleware/errors.js";

describe("URL Normaliser (normaliseUrl)", () => {
  it("normalises a standard HTTPS URL", () => {
    const result = normaliseUrl("https://example.com/path?foo=bar");
    expect(result.original).toBe("https://example.com/path?foo=bar");
    expect(result.scheme).toBe("https");
    expect(result.host).toBe("example.com");
    expect(result.registrableDomain).toBe("example.com");
    expect(result.subdomainLabels).toEqual([]);
    expect(result.port).toBeNull();
    expect(result.path).toBe("/path");
    expect(result.query).toBe("foo=bar");
    expect(result.isIpHost).toBe(false);
  });

  it("handles explicit non-standard ports", () => {
    const result = normaliseUrl("http://example.com:8080/api/v1");
    expect(result.scheme).toBe("http");
    expect(result.host).toBe("example.com");
    expect(result.port).toBe(8080);
    expect(result.path).toBe("/api/v1");
  });

  it("handles standard scheme ports as null in normalisation", () => {
    const httpDefault = normaliseUrl("http://example.com:80/");
    expect(httpDefault.port).toBeNull();

    const httpsDefault = normaliseUrl("https://example.com:443/");
    expect(httpsDefault.port).toBeNull();
  });

  it("identifies standard IPv4 dotted decimal host", () => {
    const result = normaliseUrl("http://198.51.100.23/login");
    expect(result.scheme).toBe("http");
    expect(result.host).toBe("198.51.100.23");
    expect(result.registrableDomain).toBeNull();
    expect(result.subdomainLabels).toEqual([]);
    expect(result.isIpHost).toBe(true);
  });

  it("identifies hex IPv4 host literal", () => {
    const result = normaliseUrl("http://0x7f000001/dashboard");
    expect(result.host).toBe("127.0.0.1");
    expect(result.isIpHost).toBe(true);
    expect(result.registrableDomain).toBeNull();
  });

  it("identifies octal IPv4 host literal", () => {
    const result = normaliseUrl("http://0177.0.0.1/admin");
    expect(result.host).toBe("127.0.0.1");
    expect(result.isIpHost).toBe(true);
    expect(result.registrableDomain).toBeNull();
  });

  it("identifies dword integer IPv4 host literal", () => {
    const result = normaliseUrl("http://2130706433/status");
    expect(result.host).toBe("127.0.0.1");
    expect(result.isIpHost).toBe(true);
    expect(result.registrableDomain).toBeNull();
  });

  it("identifies IPv6 host literal", () => {
    const result = normaliseUrl("http://[2001:db8::1]:8080/test");
    expect(result.host).toBe("[2001:db8::1]");
    expect(result.port).toBe(8080);
    expect(result.isIpHost).toBe(true);
    expect(result.registrableDomain).toBeNull();
  });

  it("converts internationalised domain names (IDN) to punycode", () => {
    const result = normaliseUrl("https://bücher.example/search");
    expect(result.host).toBe("xn--bcher-kva.example");
    expect(result.registrableDomain).toBe("xn--bcher-kva.example");
    expect(result.isIpHost).toBe(false);
  });

  it("extracts subdomain labels accurately", () => {
    const result = normaliseUrl("https://deep.sub.api.example.com/");
    expect(result.registrableDomain).toBe("example.com");
    expect(result.subdomainLabels).toEqual(["deep", "sub", "api"]);
  });

  it("handles URLs with embedded userinfo", () => {
    const result = normaliseUrl("https://paypal.com@example.net/login");
    expect(result.host).toBe("example.net");
    expect(result.registrableDomain).toBe("example.net");
    expect(result.original).toBe("https://paypal.com@example.net/login");
  });

  describe("Validation and Error Rejection", () => {
    it("rejects non-string input as VALIDATION_ERROR with field path 'url'", () => {
      expect.assertions(3);
      try {
        normaliseUrl(null);
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.code).toBe("VALIDATION_ERROR");
        expect(appErr.fields).toEqual([
          { path: "url", message: "URL must be a string" },
        ]);
      }
    });

    it("rejects empty URL as VALIDATION_ERROR with field path 'url'", () => {
      expect.assertions(3);
      try {
        normaliseUrl("   ");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.code).toBe("VALIDATION_ERROR");
        expect(appErr.fields).toEqual([
          { path: "url", message: "URL cannot be empty" },
        ]);
      }
    });

    it("rejects URLs exceeding 2048 characters as VALIDATION_ERROR with field path 'url'", () => {
      expect.assertions(3);
      const longUrl = "https://example.com/" + "a".repeat(2050);
      try {
        normaliseUrl(longUrl);
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.code).toBe("VALIDATION_ERROR");
        expect(appErr.fields).toEqual([
          {
            path: "url",
            message: "URL exceeds maximum length of 2048 characters",
          },
        ]);
      }
    });

    it("rejects unsupported URL schemes (ftp, file, javascript)", () => {
      const schemes = ["ftp://example.com", "file:///etc/passwd", "javascript:void(0)"];
      for (const url of schemes) {
        try {
          normaliseUrl(url);
          expect.unreachable();
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as AppError;
          expect(appErr.code).toBe("VALIDATION_ERROR");
          expect(appErr.fields?.[0]?.path).toBe("url");
        }
      }
    });

    it("rejects malformed URLs without valid hostname", () => {
      const malformed = ["http://", "not-a-valid-url", "https:///"];
      for (const url of malformed) {
        try {
          normaliseUrl(url);
          expect.unreachable();
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as AppError;
          expect(appErr.code).toBe("VALIDATION_ERROR");
          expect(appErr.fields?.[0]?.path).toBe("url");
        }
      }
    });
  });
});
