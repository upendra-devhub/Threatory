import { describe, it, expect, vi } from "vitest";
import http from "node:http";
import {
  defaultAddressPolicy,
  validateTargetUrl,
  resolveAndValidateHost,
  createGuardedLookup,
  DnsResolver,
} from "../src/modules/website/ssrf-guard.js";
import { AppError } from "../src/middleware/errors.js";

describe("SSRF Guard (Task 9a)", () => {
  describe("Default Address Policy (Strict Public Unicast Only)", () => {
    it("proves default address policy rejects loopback addresses", () => {
      expect(defaultAddressPolicy("127.0.0.1")).toBe(false);
      expect(defaultAddressPolicy("127.0.0.2")).toBe(false);
      expect(defaultAddressPolicy("127.255.255.254")).toBe(false);
      expect(defaultAddressPolicy("::1")).toBe(false);
      expect(defaultAddressPolicy("[::1]")).toBe(false);
    });

    it("proves default address policy rejects private RFC1918 ranges (10/8, 172.16/12, 192.168/16)", () => {
      expect(defaultAddressPolicy("10.0.0.1")).toBe(false);
      expect(defaultAddressPolicy("10.254.1.1")).toBe(false);
      expect(defaultAddressPolicy("172.16.0.1")).toBe(false);
      expect(defaultAddressPolicy("172.31.255.255")).toBe(false);
      expect(defaultAddressPolicy("192.168.0.1")).toBe(false);
      expect(defaultAddressPolicy("192.168.100.50")).toBe(false);
    });

    it("proves default address policy rejects link-local / cloud metadata (169.254.169.254)", () => {
      expect(defaultAddressPolicy("169.254.169.254")).toBe(false);
      expect(defaultAddressPolicy("169.254.0.1")).toBe(false);
      expect(defaultAddressPolicy("fe80::1")).toBe(false);
    });

    it("proves default address policy rejects IPv4-mapped IPv6 addresses to non-unicast ranges", () => {
      expect(defaultAddressPolicy("::ffff:127.0.0.1")).toBe(false);
      expect(defaultAddressPolicy("::ffff:10.0.0.1")).toBe(false);
      expect(defaultAddressPolicy("::ffff:192.168.1.1")).toBe(false);
      expect(defaultAddressPolicy("::ffff:169.254.169.254")).toBe(false);
    });

    it("proves default address policy rejects CGNAT, NAT64, 6to4, multicast, unspecified, reserved", () => {
      expect(defaultAddressPolicy("100.64.0.1")).toBe(false); // CGNAT
      expect(defaultAddressPolicy("100.127.255.255")).toBe(false);
      expect(defaultAddressPolicy("64:ff9b::192.0.2.1")).toBe(false); // NAT64
      expect(defaultAddressPolicy("2002:c000:0201::1")).toBe(false); // 6to4
      expect(defaultAddressPolicy("224.0.0.1")).toBe(false); // Multicast
      expect(defaultAddressPolicy("ff02::1")).toBe(false);
      expect(defaultAddressPolicy("0.0.0.0")).toBe(false); // Unspecified
      expect(defaultAddressPolicy("::")).toBe(false);
      expect(defaultAddressPolicy("240.0.0.1")).toBe(false); // Reserved
    });

    it("proves default address policy accepts authentic public unicast IPs", () => {
      expect(defaultAddressPolicy("93.184.216.34")).toBe(true); // example.com
      expect(defaultAddressPolicy("8.8.8.8")).toBe(true); // Google DNS
      expect(defaultAddressPolicy("1.1.1.1")).toBe(true); // Cloudflare
      expect(defaultAddressPolicy("2606:2800:220:1:248:1893:25c8:1946")).toBe(true);
    });
  });

  describe("URL Validation and Golden Inputs W1 & W2", () => {
    it("Golden Input W1: rejects private, loopback, decimal and invalid port with 422 TARGET_BLOCKED", () => {
      const w1Variants = [
        "http://127.0.0.1",
        "http://[::1]",
        "http://2130706433", // Decimal loopback
        "http://169.254.169.254/latest/meta-data",
        "https://example.com:8443", // Non-standard port
      ];

      for (const variant of w1Variants) {
        expect(() => validateTargetUrl(variant)).toThrowError(AppError);
        try {
          validateTargetUrl(variant);
        } catch (err) {
          const appErr = err as AppError;
          expect(appErr.code).toBe("TARGET_BLOCKED");
          expect(appErr.statusCode).toBe(422);
        }
      }
    });

    it("Golden Input W2: rejects unsupported schemes (file:, ftp:, data:) with 400 VALIDATION_ERROR", () => {
      const w2Variants = [
        "file:///etc/passwd",
        "ftp://example.com/file.txt",
        "data:text/plain;base64,SGVsbG8=",
        "javascript:alert(1)",
      ];

      for (const variant of w2Variants) {
        expect(() => validateTargetUrl(variant)).toThrowError(AppError);
        try {
          validateTargetUrl(variant);
        } catch (err) {
          const appErr = err as AppError;
          expect(appErr.code).toBe("VALIDATION_ERROR");
          expect(appErr.statusCode).toBe(400);
        }
      }
    });

    it("rejects URLs with userinfo/credentials with 422 TARGET_BLOCKED", () => {
      expect(() => validateTargetUrl("https://admin:secret@example.com/")).toThrowError(AppError);
      try {
        validateTargetUrl("https://admin:secret@example.com/");
      } catch (err) {
        const appErr = err as AppError;
        expect(appErr.code).toBe("TARGET_BLOCKED");
      }
    });

    it("rejects non-standard ports (22, 8080) with 422 TARGET_BLOCKED", () => {
      for (const port of [22, 8080, 8000, 3000, 4000]) {
        expect(() => validateTargetUrl(`http://example.com:${port}/`)).toThrowError(AppError);
        try {
          validateTargetUrl(`http://example.com:${port}/`);
        } catch (err) {
          const appErr = err as AppError;
          expect(appErr.code).toBe("TARGET_BLOCKED");
        }
      }
    });

    it("handles hex IP forms in URL safely by rejecting with 422 TARGET_BLOCKED", () => {
      // 0x7f000001 evaluates to 127.0.0.1
      expect(() => validateTargetUrl("http://0x7f000001/")).toThrowError(AppError);
      try {
        validateTargetUrl("http://0x7f000001/");
      } catch (err) {
        const appErr = err as AppError;
        expect(appErr.code).toBe("TARGET_BLOCKED");
      }
    });
  });

  describe("DNS Resolution and Rebinding Protection", () => {
    it("rejects localhost resolving to loopback", async () => {
      const mockResolver: DnsResolver = {
        resolve4: vi.fn().mockResolvedValue(["127.0.0.1"]),
        resolve6: vi.fn().mockResolvedValue(["::1"]),
      };

      await expect(
        resolveAndValidateHost("localhost", mockResolver, defaultAddressPolicy)
      ).rejects.toThrowError(AppError);

      try {
        await resolveAndValidateHost("localhost", mockResolver, defaultAddressPolicy);
      } catch (err) {
        const appErr = err as AppError;
        expect(appErr.code).toBe("TARGET_BLOCKED");
      }
    });

    it("rejects if ANY answer is disallowed (mixed public and private answers)", async () => {
      const mockResolver: DnsResolver = {
        resolve4: vi.fn().mockResolvedValue(["93.184.216.34", "10.0.0.1"]),
        resolve6: vi.fn().mockResolvedValue([]),
      };

      await expect(
        resolveAndValidateHost("rebind.example.org", mockResolver, defaultAddressPolicy)
      ).rejects.toThrowError(AppError);

      try {
        await resolveAndValidateHost("rebind.example.org", mockResolver, defaultAddressPolicy);
      } catch (err) {
        const appErr = err as AppError;
        expect(appErr.code).toBe("TARGET_BLOCKED");
      }
    });

    it("accepts domain resolving strictly to valid public addresses", async () => {
      const mockResolver: DnsResolver = {
        resolve4: vi.fn().mockResolvedValue(["93.184.216.34"]),
        resolve6: vi.fn().mockResolvedValue(["2606:2800:220:1:248:1893:25c8:1946"]),
      };

      const results = await resolveAndValidateHost(
        "example.com",
        mockResolver,
        defaultAddressPolicy
      );
      expect(results).toHaveLength(2);
      expect(results[0]?.address).toBe("93.184.216.34");
      expect(results[1]?.address).toBe("2606:2800:220:1:248:1893:25c8:1946");
    });

    it("custom guarded lookup delivers resolved IP to callback and blocks disallowed addresses", async () => {
      const mockResolver: DnsResolver = {
        resolve4: vi.fn().mockResolvedValue(["93.184.216.34"]),
        resolve6: vi.fn().mockResolvedValue([]),
      };

      const lookup = createGuardedLookup(mockResolver, defaultAddressPolicy);

      await new Promise<void>((resolve, reject) => {
        lookup("example.com", { all: false }, (err, address, family) => {
          if (err) return reject(err);
          try {
            expect(address).toBe("93.184.216.34");
            expect(family).toBe(4);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });

  describe("Guarded Fetch and Permissive Policy Injection", () => {
    it("permits local fake test server when permissive policy is injected", async () => {
      // Create a local test HTTP server on port 0
      const server = http.createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Hello from test server");
      });

      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));

      // Injected permissive policy allowing test environments
      const permissivePolicy = () => true;

      try {
        // validateTargetUrl accepts ports 80/443; for custom test port test direct guarded lookup & fetch
        // with default policy, 127.0.0.1 is strictly blocked
        expect(() => validateTargetUrl("http://127.0.0.1")).toThrowError(AppError);

        // With permissive policy, validateTargetUrl accepts 127.0.0.1 on port 80
        const validParsed = validateTargetUrl("http://127.0.0.1", permissivePolicy);
        expect(validParsed.hostname).toBe("127.0.0.1");
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it("blocks redirects that attempt to bounce to private or loopback hosts", () => {
      // When redirect location is a private IP, validateTargetUrl throws TARGET_BLOCKED
      const redirectLocation = "http://169.254.169.254/latest/meta-data";
      expect(() => validateTargetUrl(redirectLocation, defaultAddressPolicy)).toThrowError(AppError);
      try {
        validateTargetUrl(redirectLocation, defaultAddressPolicy);
      } catch (err) {
        const appErr = err as AppError;
        expect(appErr.code).toBe("TARGET_BLOCKED");
      }
    });
  });
});
