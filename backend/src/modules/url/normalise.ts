import net from "node:net";
import { parse as parseTld } from "tldts";
import { AppError } from "../../middleware/errors.js";

export interface NormalisedUrl {
  original: string;
  scheme: "http" | "https";
  host: string;
  registrableDomain: string | null;
  subdomainLabels: string[];
  port: number | null;
  path: string;
  query: string;
  isIpHost: boolean;
}

/**
 * Normalises and validates a URL using WHATWG URL parser and tldts.
 * Rejects non-http(s), malformed, empty, and over-2048-character input as VALIDATION_ERROR with field path 'url'.
 */
export function normaliseUrl(input: unknown): NormalisedUrl {
  if (typeof input !== "string") {
    throw new AppError("VALIDATION_ERROR", "URL must be a string", [
      { path: "url", message: "URL must be a string" },
    ]);
  }

  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new AppError("VALIDATION_ERROR", "URL cannot be empty", [
      { path: "url", message: "URL cannot be empty" },
    ]);
  }

  if (trimmed.length > 2048) {
    throw new AppError(
      "VALIDATION_ERROR",
      "URL exceeds maximum length of 2048 characters",
      [{ path: "url", message: "URL exceeds maximum length of 2048 characters" }]
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new AppError("VALIDATION_ERROR", "Malformed URL", [
      { path: "url", message: "Malformed URL" },
    ]);
  }

  const scheme = parsed.protocol.replace(/:$/, "").toLowerCase();
  if (scheme !== "http" && scheme !== "https") {
    throw new AppError(
      "VALIDATION_ERROR",
      `Unsupported URL scheme '${scheme}': only http and https are allowed`,
      [{ path: "url", message: "Only HTTP and HTTPS URLs are supported" }]
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || host.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Malformed URL: missing host", [
      { path: "url", message: "Malformed URL: missing host" },
    ]);
  }

  const cleanHost = host.replace(/^\[|\]$/g, "");
  const tldResult = parseTld(parsed.href, { allowPrivateDomains: true });
  const isIpHost = Boolean(tldResult.isIp) || net.isIP(cleanHost) !== 0;

  const registrableDomain = isIpHost ? null : tldResult.domain ?? null;
  const subdomainLabels =
    isIpHost || !tldResult.subdomain
      ? []
      : tldResult.subdomain.split(".").filter((label) => label.length > 0);

  const port = parsed.port ? parseInt(parsed.port, 10) : null;
  const path = parsed.pathname || "/";
  const query = parsed.search.startsWith("?") ? parsed.search.slice(1) : parsed.search;

  return {
    original: trimmed,
    scheme,
    host,
    registrableDomain,
    subdomainLabels,
    port,
    path,
    query,
    isIpHost,
  };
}
