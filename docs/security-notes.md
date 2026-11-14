# Threatory Security Architecture & Operational Notes

This document provides a comprehensive security review of Threatory v1.0.0, detailing defensive principles, threat models, abuse protections, dependency evaluations, and secret rotation procedures.

---

## 1. Core Security Principles

1. **Least Privilege & Data Minimization:** Only data strictly necessary for security assessment is collected. Raw sensitive inputs (`submittedText`), unmasked contact information, and HTTP response bodies/cookie values are never stored, logged, or returned.
2. **Deterministic & Explainable Analysis:** All risk assessments are produced by rule-based engines with explicit evidence, explanations, and remediation steps. Scores represent rule weight sums, never opaque probabilistic guesses.
3. **Defense in Depth:** Multiple layers of protection guard against abuse: body size caps (20 KB), rate limiting, Helmet headers, CORS restrictions, signed cookies, and non-root container runtimes.
4. **Non-Invasive Website Auditing:** The Website Security Auditor operates strictly with user confirmation, performing non-destructive inspection of public headers, certificates, cookies, and DNS records. It never attempts exploitation or brute-force requests.
5. **URL-as-Data Isolation:** The URL Analyzer processes links purely as text strings without making any outbound network connections to the target link.

---

## 2. Threat Model & Mitigations

| Threat Vector | Potential Impact | Threatory Mitigation |
|---|---|---|
| **Cross-Owner Report Access** | Attacker accesses another user's scan reports | Reports are indexed by `ownerId` derived from a cryptographically signed HttpOnly `tid` cookie. Reads and deletes strictly enforce `{ scanId, ownerId }`. |
| **Server-Side Request Forgery (SSRF)** | Attacker tricks server into scanning internal services or cloud metadata | RFC-compliant IP classifier blocks private ranges (10/8, 172.16/12, 192.168/16), loopbacks (127/8, ::1), cloud metadata (169.254.169.254), CGNAT, and nonstandard ports with HTTP 422 `TARGET_BLOCKED`. |
| **DNS Rebinding (TOCTOU)** | Attacker resolves domain to public IP, then switches to internal IP during fetch | The SSRF guard resolves DNS once, validates the IP, and pins the connection using Undici's custom connector (`net.connect({ host: resolvedIp, port })`). |
| **Denial of Service (Oversized Payloads)** | Memory exhaustion from massive JSON bodies | Hard 20 KB body-parser limit (`express.json({ limit: "20kb" })`). Rejections return HTTP 400 `VALIDATION_ERROR` with no stack traces. |
| **API Abuse & Brute-Force** | Rapid repeated scan submissions | Two-tier rate limiting via `express-rate-limit`: general API limit (100 req / 15 min) and stricter scan endpoint limit (20 req / 15 min). Returns HTTP 429 `RATE_LIMITED`. |
| **Cross-Origin Resource Sharing (CORS) Bypass** | Malicious sites reading report data via browser fetch | Strict origin check against `FRONTEND_ORIGIN`. Disallowed origins are denied CORS access. Credentials are never combined with wildcard `*`. |
| **Cross-Site Scripting (XSS) via Reports** | Malicious URLs containing JavaScript payloads injected into the DOM | User-supplied URLs and handles are rendered strictly as text strings in non-interactive code elements. `dangerouslySetInnerHTML` is prohibited across the codebase. |
| **Privacy Data Leakage in Logs** | Sensitive bio texts, cards, or tokens logged to disk | Pino logger configured with automated redaction for `req.headers.cookie`, `authorization`, `set-cookie`, `req.body`, `res.body`, and wildcards for `password`, `token`, `secret`, `submittedText`, `email`, `phone`, `cardNumber`. |
| **Container Privilege Escalation** | Compromise of container process leading to host takeover | Multi-stage Dockerfile switches to unprivileged `USER node` before running `dist/server.js`. |

---

## 3. Anonymous Owner Cookie (`tid`)

- **Format:** Version 4 UUID (`crypto.randomUUID()`).
- **Flags:**
  - `HttpOnly: true`: Prevents client-side JavaScript access, protecting against XSS-based session hijacking.
  - `Secure: true`: Enforced when `NODE_ENV === "production"`, ensuring cookies are only transmitted over HTTPS.
  - `SameSite: "lax"`: Protects against cross-site request forgery (CSRF) on mutating requests.
  - `Signed`: Signed with `COOKIE_SECRET` using HMAC-SHA256 via `cookie-parser`. Unsigned or tampered cookies are discarded and regenerated.
  - `Max-Age`: 365 days.
- **Production Guard:** `DEV_OWNER_ID` is strictly prohibited in production; backend environment validation terminates process startup if `DEV_OWNER_ID` is present with `NODE_ENV === "production"`.

---

## 4. Privacy Handling & Masking Rules

The Privacy Exposure Analyzer adheres to these non-negotiable data handling invariants:
1. **Consent Required:** `consent: true` is mandatory. Form submission is blocked if consent is unchecked.
2. **Zero Raw Storage:**
   - The Mongoose `Scan` schema does not contain a `submittedText` field.
   - Raw emails, phone numbers, tokens, and credit card numbers are never stored in the database or written to server logs.
3. **Masking Formats:**
   - **Email:** `j***@example.com` (reveals only the first character of the local part).
   - **Phone:** `+1 *** *** **53` (reveals only the last two digits).
   - **Payment Cards:** `**** **** **** 1111` (reveals only the last four digits).
   - **Tokens:** `AWS key: AKIA********`, `GitHub token: ghp_********`, `Slack token: xoxb********`, `Google API key: AIza********`, `Private key: [REDACTED PRIVATE KEY BLOCK]`, `JWT: eyJh********`.
   - **Usernames:** `J***e` (boundary characters only).
4. **Browser Invariant:** Sensitive form inputs are never persisted to `localStorage`, `sessionStorage`, `IndexedDB`, or URL query parameters.

---

## 5. Website Auditor SSRF Protection

The SSRF guard (`backend/src/modules/website/ssrf-guard.ts`) guarantees that outbound network connections only reach authorized public endpoints:
- **Protocol & Port Enforcement:** Only `http:` (port 80) and `https:` (port 443) are permitted. Non-standard ports (e.g. `8080`, `8443`) are rejected with HTTP 422 `TARGET_BLOCKED`.
- **IP Address Validation:** Uses `ipaddr.js` to parse IPv4 and IPv6 addresses. Rejects:
  - Loopback (`127.0.0.0/8`, `::1`)
  - Private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`)
  - Link-local and cloud metadata (`169.254.0.0/16`, `fe80::/10`)
  - Carrier-grade NAT (`100.64.0.0/10`)
  - 6to4 (`2002::/16`), NAT64 (`64:ff9b::/96`)
  - Multicast (`224.0.0.0/4`, `ff00::/8`)
  - IPv4-mapped IPv6 pointing to private addresses
  - Unusual encodings (e.g. decimal loopback `http://2130706433`)
- **Redirect Following:** Manual hop follower strictly capped at 3 redirects. Each hop undergoes full SSRF validation before establishing a socket.
- **Resource Constraints:** HTTP body reads capped at 256 KB. Checks are throttled to a maximum concurrency of 3 with an 8-second timeout per check and a 25-second overall budget.

---

## 6. Dependency Vulnerability Analysis & Gitleaks

### Dependency Audit (`npm audit --omit=dev`)
- **PostCSS (formerly high severity):** Overridden to `^8.5.33` across all workspaces using npm `overrides`, successfully patching GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, and GHSA-r28c-9q8g-f849.
- **Zod `<4.6.6` (GHSA-mrhx-c7xc-m3w5):**
  - **Advisory:** Memory exhaustion when validating oversized, unbounded collections with no length limits.
  - **Non-Exploitability Proof:** Threatory enforces a hard 20 KB body-parser limit, and all array schemas on public endpoints have explicit length caps (e.g. `profiles.max(10)`). Large payloads are rejected before Zod is invoked.
  - **Compatibility:** Upgrading to Zod 4.6.7 is a major breaking change that breaks `ZodError.errors` mapping and `@hookform/resolvers`. Zod 3.25.76 is retained with documented safety guarantees.

### Secret Scanning (Gitleaks 8.30.1)
- Full Git history scan across all 95+ commits executed with Gitleaks 8.30.1.
- Zero actual credentials, API keys, MongoDB connection strings, cookie secrets, or production `.env` files exist in Git history.
- Unit test synthetic tokens (RFC 7519 JWT example, mock Slack token) are cataloged and ignored in `.gitleaksignore`.

---

## 7. Incident Response & Secret Rotation

If a production credential or key is compromised, follow these exact procedures:

### A. Rotating `COOKIE_SECRET`
1. Generate a new cryptographically random secret (at least 32 characters):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `COOKIE_SECRET` in the backend hosting dashboard (e.g. Render Environment settings).
3. Trigger a redeploy of the backend service.
4. Existing anonymous owner cookies will fail HMAC verification and be transparently regenerated. Users will start fresh anonymous sessions.

### B. Rotating `MONGODB_URI` Credentials
1. In the MongoDB Atlas Console:
   - Navigate to **Database Access**.
   - Select the dedicated application user and choose **Edit**.
   - Generate or set a new secure password.
2. Update the `MONGODB_URI` connection string in the backend hosting dashboard with the new password.
3. Trigger a redeploy of the backend service.
4. Verify backend health endpoint (`/api/health`) returns HTTP 200.
5. In Atlas, verify existing connections are closed and only the new credentials authenticate.

### C. Rotating Cloud Provider Deployment Keys
1. In Render / Vercel account settings, revoke compromised deploy tokens.
2. Generate a replacement deployment token with minimum necessary permissions.
3. Update any automated CI/CD environment secrets.
