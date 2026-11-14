import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "How to use Threatory",
  description:
    "Guide to Threatory security analyzers, assessment methodology, data storage, and retention policies.",
};

export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="How to use Threatory"
        description="Understand what Threatory checks, how findings are produced, what data is stored, and how reports are retained."
      />

      {/* 1. What Threatory does */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">1. What Threatory does</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Threatory is an evidence-backed web security and privacy platform designed for everyday users, learners, and website operators. It consolidates three deterministic security assessments into one unified interface:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">URL Analyzer:</strong> Evaluates URL structures as data to flag phishing-like patterns and matches against local threat feeds.
            </li>
            <li>
              <strong className="text-foreground">Privacy Exposure Analyzer:</strong> Reviews explicitly submitted usernames and profile information to detect personal data exposure and credential leaks.
            </li>
            <li>
              <strong className="text-foreground">Website Security Auditor:</strong> Inspects the publicly observable security configuration (TLS, headers, cookies, DNS) of websites you own or are authorised to assess.
            </li>
          </ul>
          <p>
            Every report provides concrete evidence, plain-language explanations, actionable recommendations, and explicit limitations detailing what was not assessed.
          </p>
        </CardContent>
      </Card>

      {/* 2. URL Analyzer */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">2. URL Analyzer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            The URL Analyzer operates under strict safety constraints:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">URL strings are analysed purely as data:</strong> Threatory never visits, fetches, opens, or resolves the submitted URL.
            </li>
            <li>
              <strong className="text-foreground">Rule-based scoring:</strong> Detection rules evaluate scheme security, IP hostnames, typosquatting lookalikes, homoglyphs, brand spoofing subdomains, URL shorteners, and suspicious keyword patterns.
            </li>
            <li>
              <strong className="text-foreground">Scores are not probabilities:</strong> The numeric score (0 to 100) represents a rule-based assessment sum, not a statistical likelihood of compromise.
            </li>
            <li>
              <strong className="text-foreground">No guarantee of intent:</strong> A high score indicates structural patterns commonly found in phishing campaigns; it does not prove that a destination is malicious, nor does a low score guarantee complete safety.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 3. Privacy Exposure Analyzer */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">3. Privacy Exposure Analyzer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            The Privacy Exposure Analyzer helps you evaluate how much correlation and exposure your public handles or bio snippets might present:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Explicitly supplied information only:</strong> Only the usernames, platform identifiers, and optional text snippets you explicitly enter into the form are examined.
            </li>
            <li>
              <strong className="text-foreground">Explicit consent required:</strong> Analysis will not execute without checking the mandatory consent confirmation.
            </li>
            <li>
              <strong className="text-foreground">No web crawling or scraping:</strong> Threatory never visits profile pages, never crawls social platforms, never searches the internet, and never attempts to verify account ownership.
            </li>
            <li>
              <strong className="text-foreground">Masked sensitive evidence:</strong> All detected emails, phone numbers, tokens, and payment card numbers are automatically masked before appearing in reports.
            </li>
            <li>
              <strong className="text-foreground">Safety reminder:</strong> You should never submit passwords, actual government identity numbers, or private credentials.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 4. Website Security Auditor */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">4. Website Security Auditor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            The Website Security Auditor evaluates external security configurations for web properties:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Authorisation confirmation:</strong> You must own the target website or possess explicit permission to assess its public configuration.
            </li>
            <li>
              <strong className="text-foreground">Public configuration inspection:</strong> Checks TLS certificates and protocols, HTTP security headers (HSTS, CSP, Framing, nosniff), cookie attributes (Secure, HttpOnly, SameSite), and DNS email protections (SPF, DMARC, CAA).
            </li>
            <li>
              <strong className="text-foreground">Non-invasive and non-destructive:</strong> Threatory never exploits vulnerabilities, never conducts brute-force attacks, never sends attack payloads, and never accesses internal networks or administrative endpoints.
            </li>
            <li>
              <strong className="text-foreground">Unassessed checks:</strong> If a target cannot be reached within standard timeouts or if DNS fails, dependent checks are marked as <Badge variant="secondary">not_assessed</Badge> and are never fabricated as passes.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 5. What information is stored */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">5. What information is stored</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Threatory adheres to a strict data minimization architecture:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 border-b border-border">Data Category</th>
                  <th className="p-2 border-b border-border">Stored in Database</th>
                  <th className="p-2 border-b border-border">Never Stored / Redacted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-2 font-medium">URL Reports</td>
                  <td className="p-2">Normalised URL target, rule findings, rule-based score, risk level</td>
                  <td className="p-2 text-muted-foreground">User account credentials (userinfo is stripped)</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Privacy Reports</td>
                  <td className="p-2">Masked evidence (e.g. j***@example.com), count of profiles, findings</td>
                  <td className="p-2 text-destructive font-medium">Raw submitted text, unmasked emails, unmasked phones, raw cards, tokens</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Website Reports</td>
                  <td className="p-2">Observed header names, TLS certificate validity, cookie flag attributes</td>
                  <td className="p-2 text-destructive font-medium">HTTP response bodies, cookie values, internal network endpoints</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Ownership</td>
                  <td className="p-2">Random anonymous owner UUID linked via signed cookie</td>
                  <td className="p-2 text-muted-foreground">User accounts, email addresses, passwords, IP addresses</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 6. How long reports are kept */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">6. How long reports are kept</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Reports are retained temporarily according to their sensitivity:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Privacy reports:</strong> Retained for <strong className="text-foreground">7 days</strong>.
            </li>
            <li>
              <strong className="text-foreground">URL reports:</strong> Retained for <strong className="text-foreground">30 days</strong>.
            </li>
            <li>
              <strong className="text-foreground">Website audit reports:</strong> Retained for <strong className="text-foreground">30 days</strong>.
            </li>
          </ul>
          <p>
            Retention is enforced via MongoDB TTL indexes on the <code className="text-xs bg-muted px-1 py-0.5 rounded">expiresAt</code> field. TTL cleanup runs as an asynchronous background thread within MongoDB. You can also permanently delete any report at any time using the <em>Delete report</em> button on the report view.
          </p>
        </CardContent>
      </Card>

      {/* 7. Browser ownership */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">7. Browser ownership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Threatory does not require account registration, passwords, or email verification:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Ownership of scan reports is managed entirely via a cryptographically signed, <code className="text-xs bg-muted px-1 py-0.5 rounded">HttpOnly</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">SameSite=Lax</code> session cookie named <code className="text-xs bg-muted px-1 py-0.5 rounded">tid</code>.
            </li>
            <li>
              Reports belong strictly to the browser profile that initiated them.
            </li>
            <li>
              If you clear your browser cookies, use an incognito window, or switch browsers, previous reports will no longer be linked to your session. Threatory intentionally does not support cross-device account synchronization.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 8. Responsible use */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">8. Responsible use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Threatory is intended for defensive security posture analysis, personal privacy auditing, and educational evaluation:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Only submit URLs, handles, and texts you own or have permission to inspect.
            </li>
            <li>
              Do not use Website Security Auditor against systems without explicit authorization from the asset owner.
            </li>
            <li>
              Always evaluate findings within their full operational context; no automated tool replaces comprehensive threat modeling and professional security reviews.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
