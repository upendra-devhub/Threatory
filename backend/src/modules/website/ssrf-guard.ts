import net from "node:net";
import dns from "node:dns";
import ipaddr from "ipaddr.js";
import pLimit from "p-limit";
import { Agent, request as undiciRequest, type Dispatcher } from "undici";
import { AppError } from "../../middleware/errors.js";

export type AddressPolicy = (ipStr: string) => boolean;

export interface DnsResolver {
  resolve4: (hostname: string) => Promise<string[]>;
  resolve6: (hostname: string) => Promise<string[]>;
}

// Global concurrency limiter: maximum 3 concurrent outbound requests
export const globalRequestLimiter = pLimit(3);

export const DEFAULT_CONNECT_TIMEOUT_MS = 5000;
export const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
export const MAX_RESPONSE_BYTES = 256 * 1024; // 256 KB
export const MAX_REDIRECTS = 3;

/**
 * Validates whether an IP address is a public unicast address.
 * Rejects loopback, private, link-local, multicast, unspecified, reserved,
 * NAT64, 6to4, CGNAT, and IPv4-mapped IPv6 pointing to non-unicast ranges.
 */
export function defaultAddressPolicy(ipStr: string): boolean {
  try {
    const cleaned = ipStr.replace(/^\[|\]$/g, "").trim();
    if (!ipaddr.isValid(cleaned)) {
      return false;
    }

    let addr = ipaddr.parse(cleaned);

    // Convert IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:a00:1) to IPv4
    if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
      addr = (addr as ipaddr.IPv6).toIPv4Address();
    }

    const range = addr.range();
    // Only 'unicast' is accepted. All other classifications are rejected:
    // loopback, private, linkLocal, carrierGradeNat, multicast, unspecified,
    // reserved, rfc6052 (NAT64), 6to4, teredo, uniqueLocal, broadcast
    return range === "unicast";
  } catch {
    return false;
  }
}

/**
 * Validates initial URL syntax, scheme, ports, and userinfo before any network request.
 * - Schemes other than http: and https: throw 400 VALIDATION_ERROR.
 * - Disallowed ports (not 80 for http / 443 for https) or credentials throw 422 TARGET_BLOCKED.
 * - Host IP literals violating the address policy throw 422 TARGET_BLOCKED.
 */
export function validateTargetUrl(
  rawUrl: string,
  policy: AddressPolicy = defaultAddressPolicy,
  allowCustomPort: boolean = false
): URL {
  if (!rawUrl || typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "URL must not be empty", [
      { path: "url", message: "URL is required" },
    ]);
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new AppError("VALIDATION_ERROR", "Invalid URL format", [
      { path: "url", message: "Invalid URL syntax" },
    ]);
  }

  // Scheme validation: must be http: or https:
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError(
      "VALIDATION_ERROR",
      `Unsupported protocol '${parsed.protocol}'. Only http: and https: are permitted.`,
      [{ path: "url", message: "Only http and https protocols are supported" }]
    );
  }

  // Userinfo check: credentials in URL are rejected
  if (parsed.username || parsed.password) {
    throw new AppError(
      "TARGET_BLOCKED",
      "URLs containing userinfo/credentials are not permitted for website audit"
    );
  }

  // Port check: accept only ports 80 and 443 unless allowCustomPort is explicitly true
  const port = parsed.port
    ? parseInt(parsed.port, 10)
    : parsed.protocol === "https:"
      ? 443
      : 80;

  if (!allowCustomPort && port !== 80 && port !== 443) {
    throw new AppError(
      "TARGET_BLOCKED",
      `Port ${port} is blocked. Only ports 80 and 443 are allowed.`
    );
  }

  // Clean host (remove brackets if IPv6)
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (!host) {
    throw new AppError("VALIDATION_ERROR", "Host is missing from URL", [
      { path: "url", message: "Host is required" },
    ]);
  }

  // If host is an IP literal, validate immediately with policy
  if (net.isIP(host) !== 0 || ipaddr.isValid(host)) {
    if (!policy(host)) {
      throw new AppError(
        "TARGET_BLOCKED",
        `Target IP '${host}' is blocked (private, loopback, or non-unicast address)`
      );
    }
  }

  return parsed;
}

/**
 * Creates a default Node.js DNS resolver using dns.promises.
 */
export function createDefaultResolver(): DnsResolver {
  return {
    resolve4: (hostname: string) => dns.promises.resolve4(hostname),
    resolve6: (hostname: string) => dns.promises.resolve6(hostname),
  };
}

/**
 * Resolves all A and AAAA records for a hostname and enforces the address policy.
 * Rejects if ANY returned address fails the policy (preventing DNS rebinding / mixed answers).
 */
export async function resolveAndValidateHost(
  hostname: string,
  resolver: DnsResolver = createDefaultResolver(),
  policy: AddressPolicy = defaultAddressPolicy
): Promise<Array<{ address: string; family: number }>> {
  const cleanedHost = hostname.replace(/^\[|\]$/g, "");

  // If already an IP address
  if (net.isIP(cleanedHost) !== 0 || ipaddr.isValid(cleanedHost)) {
    if (!policy(cleanedHost)) {
      throw new AppError(
        "TARGET_BLOCKED",
        `Target IP '${cleanedHost}' is blocked by security policy`
      );
    }
    const family = net.isIP(cleanedHost) === 6 ? 6 : 4;
    return [{ address: cleanedHost, family }];
  }

  // Query both IPv4 (A) and IPv6 (AAAA) in parallel
  const [v4Result, v6Result] = await Promise.allSettled([
    resolver.resolve4(cleanedHost),
    resolver.resolve6(cleanedHost),
  ]);

  const addresses: Array<{ address: string; family: number }> = [];

  if (v4Result.status === "fulfilled" && Array.isArray(v4Result.value)) {
    for (const addr of v4Result.value) {
      addresses.push({ address: addr, family: 4 });
    }
  }

  if (v6Result.status === "fulfilled" && Array.isArray(v6Result.value)) {
    for (const addr of v6Result.value) {
      addresses.push({ address: addr, family: 6 });
    }
  }

  if (addresses.length === 0) {
    const err = new Error(`DNS resolution failed for host '${cleanedHost}'`);
    (err as NodeJS.ErrnoException).code = "ENOTFOUND";
    throw err;
  }

  // Check every returned address against policy. If ANY is blocked, reject all.
  for (const item of addresses) {
    if (!policy(item.address)) {
      throw new AppError(
        "TARGET_BLOCKED",
        `Host '${cleanedHost}' resolved to disallowed address '${item.address}'`
      );
    }
  }

  return addresses;
}

/**
 * Custom DNS lookup implementation for undici and net/tls sockets.
 * Uses resolveAndValidateHost so only the validated unicast address is connected to.
 */
export function createGuardedLookup(
  resolver: DnsResolver = createDefaultResolver(),
  policy: AddressPolicy = defaultAddressPolicy
): (
  hostname: string,
  options: dns.LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | dns.LookupAddress[],
    family?: number
  ) => void
) => void {
  return (hostname, options, callback) => {
    resolveAndValidateHost(hostname, resolver, policy)
      .then((records) => {
        if (options && options.all) {
          callback(null, records);
        } else {
          // If a family preference is specified, prefer it if available
          let chosen = records[0];
          if (options && options.family) {
            const match = records.find((r) => r.family === options.family);
            if (match) chosen = match;
          }
          if (!chosen) {
            callback(new Error("No address found"), "" as unknown as dns.LookupAddress[]);
            return;
          }
          callback(null, chosen.address, chosen.family);
        }
      })
      .catch((err) => {
        callback(err as NodeJS.ErrnoException, "" as unknown as dns.LookupAddress[]);
      });
  };
}

/**
 * Creates an undici Agent preconfigured with the guarded lookup and connect timeout.
 */
export function createGuardedAgent(options?: {
  resolver?: DnsResolver;
  policy?: AddressPolicy;
  connectTimeoutMs?: number;
}): Agent {
  const resolver = options?.resolver ?? createDefaultResolver();
  const policy = options?.policy ?? defaultAddressPolicy;
  const connectTimeout = options?.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;

  const lookup = createGuardedLookup(resolver, policy);

  return new Agent({
    connect: {
      lookup,
      timeout: connectTimeout,
      rejectUnauthorized: true,
    },
  });
}

export interface GuardedFetchOptions {
  method?: "GET" | "HEAD";
  resolver?: DnsResolver;
  policy?: AddressPolicy;
  connectTimeoutMs?: number;
  totalTimeoutMs?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  allowCustomPort?: boolean;
}

export interface GuardedFetchResponse {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: Buffer;
  finalUrl: string;
  redirectCount: number;
  ipAddress?: string;
}

/**
 * Executes an HTTP/HTTPS request protected by the SSRF guard:
 * - Concurrency capped at 3 via p-limit
 * - Manual redirect following (max 3) with SSRF checks on each hop
 * - Connect timeout (5s) and total request timeout (10s)
 * - Response body capped at 256 KB
 * - No forwarded credentials across hops
 */
export async function guardedFetch(
  rawUrl: string,
  options: GuardedFetchOptions = {}
): Promise<GuardedFetchResponse> {
  return globalRequestLimiter(async () => {
    const policy = options.policy ?? defaultAddressPolicy;
    const resolver = options.resolver ?? createDefaultResolver();
    const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    const totalTimeoutMs = options.totalTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
    const method = options.method ?? "GET";
    const allowCustomPort = options.allowCustomPort ?? false;

    let currentUrl = validateTargetUrl(rawUrl, policy, allowCustomPort);
    let redirectCount = 0;
    let lastIp: string | undefined;

    const agent = createGuardedAgent({
      resolver,
      policy,
      connectTimeoutMs,
    });

    const overallController = new AbortController();
    const timeoutHandle = setTimeout(() => {
      overallController.abort(new Error("Request overall timeout exceeded"));
    }, totalTimeoutMs);

    try {
      while (true) {
        // Resolve host to record destination IP
        const resolved = await resolveAndValidateHost(
          currentUrl.hostname,
          resolver,
          policy
        );
        lastIp = resolved[0]?.address;

        let res: Dispatcher.ResponseData;
        try {
          res = await undiciRequest(currentUrl.toString(), {
            dispatcher: agent,
            method,
            signal: overallController.signal,
            headers: options.headers ?? {
              "User-Agent": "Threatory-WebsiteAuditor/1.0 (+https://threatory.local)",
              Accept: "*/*",
            },
          });
        } catch (err: unknown) {
          const e = err as Error;
          if (e.name === "AbortError" || overallController.signal.aborted) {
            const timeoutErr = new Error("Connection or request timeout");
            (timeoutErr as NodeJS.ErrnoException).code = "ETIMEDOUT";
            throw timeoutErr;
          }
          throw err;
        }

        const statusCode = res.statusCode;

        // Check for redirects (301, 302, 303, 307, 308)
        if (
          [301, 302, 303, 307, 308].includes(statusCode) &&
          res.headers["location"]
        ) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            // Drain body and break
            await res.body.dump();
            return {
              statusCode,
              headers: res.headers as Record<string, string | string[]>,
              body: Buffer.alloc(0),
              finalUrl: currentUrl.toString(),
              redirectCount,
              ipAddress: lastIp,
            };
          }

          const rawLocation = Array.isArray(res.headers["location"])
            ? res.headers["location"][0]
            : res.headers["location"];

          await res.body.dump();

          if (!rawLocation) {
            return {
              statusCode,
              headers: res.headers as Record<string, string | string[]>,
              body: Buffer.alloc(0),
              finalUrl: currentUrl.toString(),
              redirectCount,
              ipAddress: lastIp,
            };
          }

          // Resolve location relative to current URL
          let nextUrl: URL;
          try {
            nextUrl = new URL(rawLocation, currentUrl);
          } catch {
            throw new AppError(
              "TARGET_BLOCKED",
              `Invalid redirect location header '${rawLocation}'`
            );
          }

          // Validate redirect destination with SSRF guard
          currentUrl = validateTargetUrl(nextUrl.toString(), policy, allowCustomPort);
          continue;
        }

        // Read body capped at MAX_RESPONSE_BYTES
        const chunks: Buffer[] = [];
        let bytesRead = 0;

        if (method !== "HEAD") {
          for await (const chunk of res.body) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            if (bytesRead + buf.length > MAX_RESPONSE_BYTES) {
              const remaining = MAX_RESPONSE_BYTES - bytesRead;
              if (remaining > 0) {
                chunks.push(buf.subarray(0, remaining));
                bytesRead += remaining;
              }
              // Drain remaining stream without storing
              await res.body.dump();
              break;
            }
            chunks.push(buf);
            bytesRead += buf.length;
          }
        } else {
          await res.body.dump();
        }

        const bodyBuffer = Buffer.concat(chunks);

        return {
          statusCode,
          headers: res.headers as Record<string, string | string[]>,
          body: bodyBuffer,
          finalUrl: currentUrl.toString(),
          redirectCount,
          ipAddress: lastIp,
        };
      }
    } finally {
      clearTimeout(timeoutHandle);
      await agent.destroy();
    }
  });
}
