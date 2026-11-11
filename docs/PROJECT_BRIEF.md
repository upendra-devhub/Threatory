# Part A. Project brief: the problem, explained and broken down

This part is written for two readers: the two developers, and any AI assistant helping to build Threatory. It is saved as `docs/PROJECT_BRIEF.md`, and every AI session starts by reading it. It states the problem, the product, the hard limits and every decision that is already made, so an AI never has to guess.

## A1. What we are building

**Threatory** is a web platform that gives non-experts three security checks in one place: (1) a **URL Analyzer** that inspects a link as data and flags phishing-style signals, (2) a **Privacy Exposure Analyzer** that reviews usernames and text the user chooses to submit for personal-information exposure, and (3) a **Website Security Auditor** that inspects the publicly visible security configuration of a site the user is authorised to assess. Every result is a report of evidence-backed findings with explanations and recommendations. Reports are saved so they can be reopened, listed in a history and summarised on a dashboard.

## A2. The problem, in plain words

- Ordinary people meet three kinds of digital risk: links that may be phishing, personal details they may be exposing online, and websites (often their own) that may be configured insecurely.
- The tools that address these are scattered across different sites, mostly written for specialists, and they usually return either a bare verdict ("safe" or "unsafe") or a raw technical dump the user cannot interpret.
- A verdict without evidence cannot be trusted or learned from. A technical dump cannot be acted on.
- People need one simple place that says what was checked, what was found, why it matters and what to do next, and that is honest about what it could not check.

## A3. Who it is for

| User | What they need |
|---|---|
| Everyday users | To know why a link looks suspicious and what to do instead, without jargon. |
| Students and learners | A transparent example of rule-based security analysis they can read, test and extend. |
| Small site owners | A quick, non-intrusive review of HTTPS, headers, cookies and email-related DNS, with specific fixes. |

## A4. Success definition

The product works when a user can submit valid input, receive a meaningful report, understand the evidence behind every flagged item, reopen the saved report later, and see a summary of their activity. For engineering, it works when results are deterministic, tested and explainable: the same input and rules version always give the same findings.

## A5. The problem broken into three sub-problems

| Module | Sub-problem | Input | How it works | Output | Will not do |
|---|---|---|---|---|---|
| URL Analyzer | Is this link structured like a phishing link? | A URL string | Parses the URL as data, runs small rules (scheme, IP host, lookalike and homograph domains, shorteners, redirect parameters, encoding tricks), matches locally stored phishing feeds, sums rule weights. | Report with findings, risk level and a rule-based score. | Visit, fetch or resolve the link; claim it is confirmed malicious. |
| Privacy Exposure Analyzer | What personal information am I revealing? | Usernames, optional profile URLs, optional text, plus consent | Normalises and compares the supplied usernames; detects emails, phone numbers, secret tokens and card numbers in the supplied text; masks every value. | Report with masked findings, risk level, and a list of what was not checked. | Search the internet, fetch profiles, bypass logins, confirm identity. |
| Website Security Auditor | Is this site configured safely? | A public URL plus confirmation of authorisation | Guarded requests inspect DNS, HTTPS and certificate, TLS version, security headers, cookie attributes, HTTP-to-HTTPS redirect, SPF, DMARC and CAA. | Report with per-check pass, warn, fail or not assessed. | Exploit, brute-force, send attack payloads, reach internal addresses. |

## A6. Hard rules (never violate)

1. The URL Analyzer makes **no network request** about the submitted URL: no fetch, no DNS lookup. Feed matching is done against locally stored data.
2. The Privacy Analyzer processes only what the user typed in, with explicit consent. It never searches the internet, fetches profile pages, bypasses logins or claims two accounts belong to the same person.
3. The Website Auditor runs only after the user confirms authorisation, contacts only public IP addresses on ports 80 and 443, and never exploits, brute-forces or sends attack payloads.
4. No LLM, no paid API and no Python or machine-learning service in the core product.
5. Raw privacy input, full contact values, cookie values, response bodies and secrets are **never stored, logged or returned**. Only masked evidence is.
6. A score is a rule-based assessment, never a probability. Never label anything "Safe". Use "No suspicious signals detected".
7. A check that could not run is `not_assessed`. It is never `pass`.
8. Everything must be free to run: open-source libraries and free tiers only.

## A7. Glossary (use these words exactly)

| Term | Meaning |
|---|---|
| Finding | One rule and its result. Has code, category, title, outcome, severity, evidence, explanation, recommendation. |
| Outcome | `pass` (checked, nothing found), `warn` (found, low or medium severity), `fail` (found, high severity), `not_assessed` (could not be checked). |
| Severity | `info` (only for pass and not_assessed), `low`, `medium`, `high`. |
| riskLevel | Normalised level of a report: the highest severity among warn and fail findings, or `none_detected`. The dashboard groups by it. |
| Score | URL module only. Capped sum of triggered rule weights (0 to 100). A rule-based assessment, not a probability. |
| Limitations | Plain statements of what a scan did not check. Shown on every report. |
| Masked evidence | A sensitive value shortened before it enters a report or log, for example `j***@example.com`. |
| Golden input | A safe sample input with a fixed expected result, used in tests and demos (Appendix C). |
| rulesVersion | Version string of a module's rules, stored with each report, for example `url-1.0.0`. |
| Owner cookie | Signed HttpOnly cookie holding a random owner ID. It scopes history without any login. |
| SSRF | Tricking the server into requesting internal addresses. Blocked in the website auditor. |
| Checkpoint, savepoint | A defined unit of work that ends in a verified git tag (see `docs/RELAY_PROTOCOL.md`). |

## A8. Fixed decisions (do not re-decide)

| Topic | Decision |
|---|---|
| Language, runtime | TypeScript (strict), Node 22 LTS, npm workspaces monorepo. |
| Frontend | Next.js App Router, React, Tailwind CSS, shadcn/ui, lucide-react, React Hook Form + Zod, TanStack Query, Recharts. Dev port 3000. |
| Backend | Express, Zod, Mongoose, helmet, cors, express-rate-limit, cookie-parser, pino and pino-http, tldts, ipaddr.js, undici, validator, libphonenumber-js, fastest-levenshtein, set-cookie-parser, p-limit, node-cron. Dev port 4000. |
| Database | MongoDB. Local via docker-compose, MongoDB Atlas free cluster in production. |
| Tests | Vitest, React Testing Library, vitest-axe, Supertest, mongodb-memory-server, Playwright. |
| Browser to API | The frontend calls relative `/api/...`. Next.js rewrites it to `API_ORIGIN` (default `http://localhost:4000`). Cookies stay first-party; the backend still allows only the exact `FRONTEND_ORIGIN`. |
| Owner and history | Signed HttpOnly cookie `tid` with a random ID (SameSite Lax, Secure in production). Every read, list and delete filters by it; another owner's record is `NOT_FOUND`. `DEV_OWNER_ID` may fix the owner in non-production only; the server refuses to start if it is set in production. |
| Retention | Documents carry `expiresAt` with a TTL index. Privacy reports 7 days, other reports 30 days. Owners can delete earlier. |
| Scan budget | Synchronous scans with a 25-second overall budget. Statuses: `completed`, `partial` (some checks not assessed), `failed`. |
| Finding codes | Stable UPPER_SNAKE with prefix `URL_`, `PRIV_` or `SITE_`. Never rename a code. |
| Outcome mapping | Not triggered: `pass`, severity `info`. Triggered: severity `high` gives `fail`; `low` or `medium` gives `warn`. Could not run: `not_assessed`, severity `info`. Every `warn` or `fail` has a recommendation. |
| Assessment | URL module returns a `score` and label. Privacy and website return no score. `riskLevel` is the highest severity found. |
| Error codes and HTTP | `VALIDATION_ERROR` 400, `NOT_FOUND` 404, `TARGET_BLOCKED` 422, `RATE_LIMITED` 429, `INTERNAL` 500, `UPSTREAM_FAILURE` 502. Shape: `{ success:false, error:{ code, message, fields? } }`. |
| Environment variables | `MONGODB_URI`, `PORT`, `FRONTEND_ORIGIN`, `COOKIE_SECRET`, `NODE_ENV`, `FEEDS_SYNC_ENABLED`, `DEV_OWNER_ID` (dev only), frontend `API_ORIGIN` (server-side). `.env` files are never committed; `.env.example` holds placeholders. |

### Endpoints

| Endpoint | Purpose | Request |
|---|---|---|
| `POST /api/scans/url` | Analyse a URL string, save the report. | `{ url }` (1 to 2048 chars) |
| `POST /api/scans/privacy` | Analyse supplied profiles and text. | `{ profiles[1..10]{platform, username, url?}, displayName?, submittedText? (max 10000), consent:true }` |
| `POST /api/scans/website` | Audit an authorised public website. | `{ url, authorised:true }` |
| `GET /api/scans` | History for the current owner. | Query: module, status, from, to, page, limit (max 50) |
| `GET /api/scans/:scanId` | One saved report. | Path parameter |
| `DELETE /api/scans/:scanId` | Delete a saved report. | Path parameter |
| `GET /api/dashboard/summary` | Totals, per-module counts, risk distribution, recent scans. | None |
| `GET /api/health` | Health check. | None |

### Repository structure

```
threatory/
  frontend/              Next.js app (src/app, src/components, src/features, src/lib)
  backend/
    src/config  middleware  models  routes  services
    src/modules/url/        normalise, rules, rules.config, service
    src/modules/privacy/    normalise, masking, rules, service
    src/modules/website/    ssrf-guard, checks (tls, headers, cookies, dns), service
    data/                   top-domains.txt, shorteners.txt, eval samples
    tests/
  packages/contracts/    Zod schemas, fixtures, golden-inputs.json  (shared by both sides)
  e2e/                   Playwright specs
  docs/                  PROJECT_BRIEF.md, HANDOFF.md, CHECKPOINTS.md, PROMPT_TEMPLATE.md, prompts/
  package.json (workspaces)   README.md   .gitignore   .nvmrc
```

## A9. Quality bar

- Every finding has a stable code, an outcome, a severity, evidence, an explanation and (for warn or fail) a recommendation.
- Reports are deterministic for a given input and `rulesVersion`. No hardcoded results or mock data in production code paths; fixtures live in tests and the contract package only.
- New logic has tests for the positive case, the negative case, invalid input and a failure path. Nothing is "done" until the commands in the exit gate have been run and pass.
- User-supplied strings are rendered as text only: no raw HTML, and a submitted URL is never a clickable link.
- Interfaces are keyboard accessible, with status shown by text and icon, not by colour alone.

## A10. How an AI assistant must behave in this project

- Read this brief, `docs/HANDOFF.md` and the checkpoint section before writing code. Do exactly one checkpoint.
- Prefer the simplest solution that meets the brief. Do not add features, refactor unrelated code or upgrade dependencies without need.
- When the brief is silent, choose the simplest consistent option, record it under Decisions in `HANDOFF.md` and continue. When something is out of scope, record it under Parking lot and do not build it.
- Never claim a command passed unless it was run. Report results honestly, including failures.

# Appendix A. Contract (packages/contracts)

These schemas are the shared vocabulary. Write them in CP-01; afterwards they change only to fix a bug, and every change is logged in `HANDOFF.md` under Contract changes.

```
export const Outcome   = z.enum(["pass", "warn", "fail", "not_assessed"]);
export const Severity  = z.enum(["info", "low", "medium", "high"]);
export const RiskLevel = z.enum(["none_detected", "low", "medium", "high"]);   // never "safe"
export const Module    = z.enum(["url", "privacy", "website"]);
// pass / not_assessed -> severity "info".  Triggered: high -> fail, low or medium -> warn.

export const Finding = z.object({
  code: z.string(),                      // stable UPPER_SNAKE: URL_*, PRIV_*, SITE_*
  category: z.string(),                  // host | tls | headers | cookies | dns | contact | username
  title: z.string(),
  outcome: Outcome,
  severity: Severity,
  evidence: z.string(),                  // human-readable; masked for privacy data
  explanation: z.string(),
  recommendation: z.string().optional(), // required when outcome is warn or fail
});

export const Report = z.object({
  scanId: z.string(),
  module: Module,
  status: z.enum(["completed", "partial", "failed"]),
  rulesVersion: z.string(),              // e.g. "url-1.0.0"
  targetSummary: z.string(),             // never contains raw privacy input
  assessment: z.object({
    label: z.string(),
    riskLevel: RiskLevel,                // highest severity found
    score: z.number().min(0).max(100).optional(),     // URL module only
    scoreMeaning: z.string().optional(),
  }),
  findings: z.array(Finding),            // includes pass and not_assessed entries
  limitations: z.array(z.string()),      // what was NOT checked
  details: z.record(z.string(), z.unknown()).optional(),   // module extras; nothing sensitive
  createdAt: z.string().datetime(),
});
```

```
export const ApiSuccess = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ success: z.literal(true), data });

export const ApiError = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(["VALIDATION_ERROR", "NOT_FOUND", "TARGET_BLOCKED", "RATE_LIMITED",
                  "INTERNAL", "UPSTREAM_FAILURE"]),
    message: z.string(),
    fields: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

export const UrlScanRequest = z.object({ url: z.string().trim().min(1).max(2048) });
export const PrivacyScanRequest = z.object({
  profiles: z.array(z.object({
    platform: z.string().trim().min(1).max(30),
    username: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/),
    url: z.string().trim().max(2048).optional(),
  })).min(1).max(10),
  displayName: z.string().trim().max(80).optional(),
  submittedText: z.string().max(10000).optional(),
  consent: z.literal(true),
});
export const WebsiteScanRequest = z.object({
  url: z.string().trim().min(1).max(2048), authorised: z.literal(true) });

export const HistoryItem = z.object({
  scanId: z.string(), module: Module, status: z.enum(["completed", "partial", "failed"]),
  targetSummary: z.string(),
  assessment: z.object({ label: z.string(), riskLevel: RiskLevel }),
  createdAt: z.string().datetime(),
});
export const HistoryPage = z.object({ items: z.array(HistoryItem),
  page: z.number(), limit: z.number(), total: z.number() });
export const DashboardSummary = z.object({
  totalScans: z.number(),
  byModule: z.object({ url: z.number(), privacy: z.number(), website: z.number() }),
  byRiskLevel: z.object({ none_detected: z.number(), low: z.number(),
                          medium: z.number(), high: z.number() }),
  recent: z.array(HistoryItem),
});
```

# Appendix B. Rule catalogue

Codes are final. Weights, thresholds and lists are starting values kept in one config file per module and tuned only through the evaluation steps in the checkpoints.

## B1. URL rules (url-1.0.0 uses the core set; url-1.1.0 adds the advanced set)

Every rule always emits exactly one finding (`pass` when not triggered). Score = sum of triggered weights, capped at 100. Level: 0 to 14 `none_detected` ("No suspicious signals detected"), 15 to 39 `low`, 40 to 69 `medium`, 70 and above `high`. A feed match forces `high`. Labels are "Low", "Medium", "High".

| Code | Triggers when | Severity | Weight | Set |
|---|---|---|---|---|
| `URL_NO_HTTPS` | Scheme is http. | medium | 15 | core |
| `URL_IP_HOST` | Host is an IP literal, including decimal, hex or octal forms in the original string. | high | 30 | core |
| `URL_USERINFO` | Credentials (`user@` or `user:pass@`) appear before the host. | high | 25 | core |
| `URL_ENCODED` | Double encoding (`%25`), or encoded dots or slashes in host or path. | low | 10 | core |
| `URL_REDIRECT_PARAM` | Query parameter named url, redirect, redirect_uri, next, return, returnurl, goto, dest, continue or target whose value looks like a URL. | low | 10 | core |
| `URL_HIGH_ENTROPY` | Longest host label is at least 12 characters with Shannon entropy at least 3.5 bits per character (never applied to IP hosts). | low | 10 | core |
| `URL_ABUSED_TLD` | TLD is on the configured list (start: zip, mov, top, xyz, click, gq, tk, ml, cf, ga). | low | 8 | core |
| `URL_EXCESS_SUBDOMAINS` | More than 3 subdomain labels. | low | 8 | core |
| `URL_NONSTANDARD_PORT` | Port differs from the scheme default. | low | 8 | core |
| `URL_KEYWORDS` | Host or path contains login, signin, verify, account, update, secure, banking, password, wallet or confirm. | low | 5 | core |
| `URL_LONG` | URL longer than 100 characters. | low | 5 | core |
| `URL_FEED_MATCH` | Exact URL or host is in the local phishing or malware feed collection. | high | 100 | advanced |
| `URL_HOMOGRAPH` | A label is punycode (`xn--`) or mixes scripts, for example Latin with Cyrillic. | high | 30 | advanced |
| `URL_LOOKALIKE` | Registrable domain is within edit distance 1 or 2 of a top-10,000 domain but not equal (names under 5 characters use distance 1). | high | 30 | advanced |
| `URL_BRAND_SUBDOMAIN` | A top-domain name appears as a subdomain label or path word of an unrelated registrable domain. | medium | 25 | advanced |
| `URL_SHORTENER` | Host is on the shortener list (bit.ly, t.co, tinyurl.com, goo.gl, ow.ly, is.gd and similar). | medium | 15 | advanced |

## B2. Privacy rules (privacy-1.0.0)

Findings include a `pass` entry per category checked. No score. `riskLevel` is the highest severity found; the label is "No exposure patterns detected" or "N exposure signals found". Normalised comparison form = lowercase with `.`, `_` and `-` removed.

| Code | Triggers when | Severity |
|---|---|---|
| `PRIV_USERNAME_REUSE` | Two or more supplied entries share the same normalised username. Worded "the same username was supplied", never as identity. | low (medium for 3 or more entries) |
| `PRIV_USERNAME_SIMILAR` | Different normalised usernames at edit distance 1, both length 5 or more. | low |
| `PRIV_URL_USERNAME_MISMATCH` | Username extracted from a profile URL (small per-platform pattern table: GitHub, X or Twitter, Instagram, LinkedIn `/in/`, Reddit `/user/`) differs from the typed username. | low |
| `PRIV_USERNAME_PERSONAL_HINT` | Username contains a part (4 or more characters) of the display name, or ends in a plausible birth year (1940 to current year). | low |
| `PRIV_EMAIL_FOUND` | Email in the text, matched by pattern and confirmed by validator. Evidence masked, for example `j***@example.com`. | medium |
| `PRIV_USERNAME_MATCHES_EMAIL` | A normalised username equals the normalised local part of an email found in the text. | medium |
| `PRIV_PHONE_FOUND` | Valid phone number found with libphonenumber-js. Masked to the last 2 digits. | medium |
| `PRIV_SECRET_FOUND` | AWS access key ID, GitHub token (`gh[pousr]_`), Slack token (`xox[baprs]-`), Google API key (`AIza`), private-key block or JWT pattern. Masked to type and first 4 characters. Recommend revoke and rotate. | high |
| `PRIV_CARD_FOUND` | 13 to 19 digits (spaces or dashes allowed) that pass the Luhn check. Masked to last 4 digits. | high |

## B3. Website rules (website-1.0.0)

Each check returns `pass`, `warn`, `fail` or `not_assessed` with the observed value. A failed or skipped network step is `not_assessed`, never `pass`. If DNS fails, dependent checks are `not_assessed`. `riskLevel` is the highest severity found; labels: "No configuration issues observed", "Low", "Medium", "High". A missing header is a configuration observation, not proof of compromise.

| Group | Code and condition | Severity when triggered |
|---|---|---|
| Connection and TLS | `SITE_DNS_RESOLVES` no A or AAAA record. `SITE_HTTPS_AVAILABLE` no TLS connection on port 443. `SITE_TLS_CERT_VALID` certificate fails verification (record the exact error: expired, self-signed, hostname mismatch, untrusted chain). | high (fail) |
| Connection and TLS | `SITE_TLS_EXPIRY` certificate expires within 14 days (medium) or 30 days (low). `SITE_HTTP_TO_HTTPS` plain HTTP does not redirect to HTTPS. `SITE_TLS_PROTOCOL` reports the negotiated version (TLS 1.2 or 1.3 expected). `SITE_REDIRECTS` more than 3 hops, or the chain leaves the registrable domain. | medium or low (warn) |
| HTTP headers | `SITE_HSTS` missing (medium) or max-age under 15552000 (low). `SITE_CSP` missing (medium) or script-src or default-src allows unsafe-inline or unsafe-eval (low). | medium or low (warn) |
| HTTP headers | `SITE_XCTO` not `nosniff`. `SITE_FRAMING` neither frame-ancestors nor X-Frame-Options. `SITE_REFERRER_POLICY` missing. `SITE_PERMISSIONS_POLICY` missing. `SITE_VERSION_DISCLOSURE` Server or X-Powered-By reveals a version number. | low (warn) |
| Cookies | Per cookie name from the checked response only, values never read: `SITE_COOKIE_SECURE` missing on an HTTPS response (medium). `SITE_COOKIE_HTTPONLY` missing (medium if the name looks like session, auth, token, sid or jwt, otherwise low). `SITE_COOKIE_SAMESITE` missing (low). No Set-Cookie header: single `pass`. | medium or low (warn) |
| DNS and email | Checked on the registrable domain: `SITE_SPF` missing, or ends in `+all` or `?all` (medium). `SITE_DMARC` missing (medium) or policy `none` (low). `SITE_CAA` missing (low). | medium or low (warn) |

# Appendix C. Golden inputs

Safe sample inputs with fixed expected results. Stored in `packages/contracts/golden-inputs.json`, used by backend tests, end-to-end tests and demos. "Online" inputs need internet access and are run manually.

| ID | Input | Expected | From |
|---|---|---|---|
| U1 | `http://198.51.100.23/login` | `URL_IP_HOST` fail, `URL_NO_HTTPS` warn, `URL_KEYWORDS` warn. Score 50, `medium`. | CP-04 |
| U2 | `https://example.com/` | All findings pass. Score 0, `none_detected`. | CP-04 |
| U3 | `https://paypal.com@example.net/login` | `URL_USERINFO` fail. | CP-04 |
| U4 | `ftp://example.com` | 400 `VALIDATION_ERROR` (unsupported scheme). | CP-04 |
| U5 | `https://paypa1.com/login` | `URL_LOOKALIKE` fail (paypal.com must be in the top list). | CP-06 |
| U6 | `https://xn--pple-43d.com/` | `URL_HOMOGRAPH` fail. | CP-06 |
| U7 | `https://bit.ly/abc123` | `URL_SHORTENER` warn. | CP-06 |
| U8 | `https://paypal.com.account-verify.xyz/login` | `URL_BRAND_SUBDOMAIN`, `URL_ABUSED_TLD`, `URL_KEYWORDS` warn. | CP-06 |
| P1 | Profiles GitHub `Jane.Doe` (url `https://github.com/jane-doe`) and X `jane_doe`; text "Reach me at jane.doe@example.com or +1 213 373 4253" | `PRIV_USERNAME_REUSE`, `PRIV_EMAIL_FOUND` (masked), `PRIV_PHONE_FOUND` (masked), `PRIV_USERNAME_MATCHES_EMAIL` all warn. Raw email and phone absent from response, logs and database. | CP-07 |
| P2 | Profiles GitHub `alpha_dev`, Reddit `zeta42`; text "Just a normal sentence." | All pass. `none_detected`. | CP-07 |
| P3 | Text containing `AKIAIOSFODNN7EXAMPLE` and `4111 1111 1111 1111` | `PRIV_SECRET_FOUND` fail, `PRIV_CARD_FOUND` fail. Raw values absent everywhere. | CP-07 |
| P4 | P1 with `consent:false` | 400 `VALIDATION_ERROR`. | CP-07 |
| W1 | `http://127.0.0.1`, `http://[::1]`, `http://2130706433`, `http://169.254.169.254/latest/meta-data`, `https://example.com:8443` (each authorised) | 422 `TARGET_BLOCKED`. No outbound request made. | CP-09 |
| W2 | `file:///etc/passwd`; or any URL with `authorised:false` | 400 `VALIDATION_ERROR`. | CP-09 |
| W3 | `https://example.com` (authorised, online) | Status `completed` or `partial`. `SITE_TLS_CERT_VALID` pass. All four groups present. | CP-09 |
