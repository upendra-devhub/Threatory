# Threatory Demonstration Script (Golden Inputs)

This script provides an exact, step-by-step demonstration walkthrough of Threatory v1.0.0 using the verified Golden Inputs from Appendix C. Use this guide during product demonstrations, user evaluations, or presentation walkthroughs.

---

## Prerequisites
- Application running locally (`http://localhost:3000`) or open on the production deployment URL.
- Fresh browser session (or private/incognito window) to demonstrate anonymous owner initialization.

---

## Demonstration 1 — URL Analyzer: U1 (Suspicious Link)

**Goal:** Demonstrate rule-based phishing detection, IP host flagging, and score assessment without making network requests.

1. Navigate to **URL Analyzer** in the navigation bar (`/url-analyzer`).
2. Enter the Golden Input **U1**:
   ```
   http://198.51.100.23/login
   ```
   *(Alternatively, click the **Example 1 — U1** quick button).*
3. Click **Analyze URL**.
4. **Point out to the audience:**
   - **Progress notice:** Shows clear politeness feedback ("Analyzing URL indicators...").
   - **Assessment:** Score is **50 / 100**, Risk Level is **Medium** (label: "Medium").
   - **Triggered Findings:**
     - `URL_IP_HOST` (Outcome: **fail**, Severity: **high**): Host is an IP literal address.
     - `URL_NO_HTTPS` (Outcome: **warn**, Severity: **medium**): Insecure HTTP scheme.
     - `URL_KEYWORDS` (Outcome: **warn**, Severity: **low**): Suspicious keyword `login` detected in path.
   - **Technical Details Card:** Displays extracted scheme, host, port, path, and ICANN registrable domain information.
   - **Limitations Panel:** Explains that the link was **never visited or fetched**, and the score is rule-based, not a probability.
   - **Safety Invariant:** The submitted URL is rendered strictly as plain text, never as a clickable external hyperlink.

---

## Demonstration 2 — URL Analyzer: U2 (Clean Link)

**Goal:** Demonstrate clean evaluation without false positives and show non-exaggerated risk wording.

1. On the URL Analyzer screen, enter Golden Input **U2**:
   ```
   https://example.com/
   ```
   *(Or click **Example 2 — U2**).*
2. Click **Analyze URL**.
3. **Point out to the audience:**
   - **Assessment:** Score is **0 / 100**, Risk Level is **none_detected** (label: "No suspicious signals detected").
   - **Honest Copy:** Notice that Threatory **never** labels a site "Safe" or "Guaranteed Secure"—it states honestly that no suspicious signals were detected.
   - All applicable rule findings display outcome **pass** with info severity.

---

## Demonstration 3 — Privacy Exposure Analyzer: P1 (Data Exposure)

**Goal:** Demonstrate username correlation, sensitive contact detection, and automated masking with mandatory consent.

1. Navigate to **Privacy Analyzer** (`/privacy-analyzer`).
2. Fill in Golden Input **P1**:
   - **Profile 1:** Platform: `GitHub`, Username: `Jane.Doe`, URL: `https://github.com/jane-doe`
   - Click **Add another profile** (+).
   - **Profile 2:** Platform: `X`, Username: `jane_doe`
   - **Bio / Sample Text:**
     ```
     Reach me at jane.doe@example.com or +1 213 373 4253
     ```
3. Attempt to click **Analyze privacy exposure** without checking the consent box.
   - **Point out:** The submit button is strictly disabled, preventing unconsented processing.
4. Check the consent box: *"I confirm that I have the right to submit this information..."*.
5. Click **Analyze privacy exposure**.
6. **Point out to the audience:**
   - **Triggered Findings:**
     - `PRIV_USERNAME_REUSE` (warn): The same username was supplied across multiple profiles.
     - `PRIV_EMAIL_FOUND` (warn): Email detected.
     - `PRIV_PHONE_FOUND` (warn): Phone number detected via `libphonenumber-js`.
     - `PRIV_USERNAME_MATCHES_EMAIL` (warn): Normalised username matches the email local part.
   - **Masking Guarantees:**
     - Email is masked as `j***@example.com`.
     - Phone is masked as `+1 *** *** **53`.
     - Raw sensitive values are **never stored, logged, or returned**.
   - **Zero Score Fabrications:** Notice that the Privacy Analyzer provides findings and a risk level, but **no numeric score**, matching the contracts.

---

## Demonstration 4 — Privacy Exposure Analyzer: P2 (Clean Privacy Input)

**Goal:** Prove that the Privacy Analyzer does not invent exposure findings on normal inputs.

1. On the Privacy Analyzer screen:
   - Profile 1: Platform: `GitHub`, Username: `alpha_dev`
   - Profile 2: Platform: `Reddit`, Username: `zeta42`
   - Bio Text: `Just a normal sentence.`
   - Check consent.
2. Click **Analyze privacy exposure**.
3. **Point out to the audience:**
   - Assessment shows label: **"No exposure patterns detected"**.
   - All categories pass cleanly.

---

## Demonstration 5 — Website Security Auditor: W1 (SSRF-Blocked Target)

**Goal:** Demonstrate the RFC-compliant SSRF guard rejecting internal or metadata network targets with friendly, non-leaking copy.

1. Navigate to **Website Auditor** (`/website-auditor`).
2. Enter a loopback address:
   ```
   http://127.0.0.1
   ```
3. Check the mandatory authorization box: *"I own this site or have permission to assess it"*.
4. Click **Audit website**.
5. **Point out to the audience:**
   - Request is immediately blocked by the SSRF guard before any socket connection is attempted.
   - Returns HTTP 422 `TARGET_BLOCKED`.
   - Exact friendly error copy: **"This address cannot be audited because it is not a public website"**.
   - **Information Leakage Prevention:** Internal IP addresses, interface names, or subnet ranges are strictly suppressed from the user interface.

---

## Demonstration 6 — Website Security Auditor: W3 (Live Public Website Audit)

**Goal:** Demonstrate multi-category security configuration inspection on an authorized public site.

1. On the Website Auditor screen, enter:
   ```
   https://example.com
   ```
2. Check authorization: *"I own this site or have permission to assess it"*.
3. Click **Audit website**.
4. **Point out to the audience:**
   - Results are organized into 4 distinct inspection categories:
     1. **Connection and TLS:** Certificate chain validity, modern TLS 1.3/1.2 negotiation, expiration timeline, and HTTP-to-HTTPS redirect.
     2. **HTTP headers:** HSTS, Content-Security-Policy (CSP), nosniff, framing protection, Referrer-Policy, and Permissions-Policy.
     3. **Cookies:** Analysis of Set-Cookie attributes (Secure, HttpOnly, SameSite) with cookie values strictly omitted.
     4. **DNS and email:** SPF records, DMARC policy, and CAA authorization.
   - If an individual check times out, it is labelled `not_assessed`, producing a partial report without failing the entire audit.

---

## Demonstration 7 — Platform Features: History, Dashboard & Report Actions

**Goal:** Demonstrate the integrated end-to-end platform capabilities.

1. **Dashboard (`/`):**
   - Navigate to the home dashboard.
   - View real-time counters: Total Scans, URL Scans, Privacy Scans, Website Scans, and High Risk Scans.
   - Inspect the Recharts donut chart (Risk level distribution) and bar chart (Scans per module). Note that accessible HTML tables accompany both visualizations for screen readers.
   - Inspect the Recent Scans table showing our newly executed scans.
2. **Scan History (`/history`):**
   - Click **History** in the sidebar.
   - Note the **Session storage & retention notice banner** detailing 7-day and 30-day automated TTL expiration.
   - Use the **Module** dropdown filter to select `URL Analyzer`. Note how the URL parameter updates dynamically (`/history?module=url`) and survives page refreshes.
   - Select the first scan to open its saved report view (`/reports/[scanId]`).
3. **Report Actions Toolbar:**
   - Click **Copy as Markdown**: Copies a sanitized, privacy-safe Markdown summary to clipboard.
   - Click **Copy as JSON**: Copies the contract-compliant report object.
   - Click **Print report**: Emulates the clean print stylesheet, stripping navigation bars and buttons while displaying full findings and limitations.
   - Click **Delete report**: An accessible confirmation dialog opens. Click *Delete report* to permanently delete the document from MongoDB, redirecting back to `/history` with dashboard counters updated immediately.
4. **Help Page (`/help`):**
   - Open `/help` ("How to use Threatory") to show the comprehensive, accessible methodology guide.
