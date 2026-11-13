import { Severity } from "@threatory/contracts";

export interface WebsiteRuleConfig {
  code: string;
  category: "tls" | "headers" | "cookies" | "dns";
  title: string;
  defaultSeverity: Severity;
  explanation: string;
  defaultRecommendation: string;
}

export const WEBSITE_RULES: Record<string, WebsiteRuleConfig> = {
  // Connection and TLS (7 rules)
  SITE_DNS_RESOLVES: {
    code: "SITE_DNS_RESOLVES",
    category: "dns",
    title: "DNS hostname resolution",
    defaultSeverity: "high",
    explanation: "Public DNS records (A/AAAA) must be published for users to resolve the site.",
    defaultRecommendation: "Configure authoritative A or AAAA DNS records pointing to your public web server.",
  },
  SITE_HTTPS_AVAILABLE: {
    code: "SITE_HTTPS_AVAILABLE",
    category: "tls",
    title: "HTTPS availability on port 443",
    defaultSeverity: "high",
    explanation: "Transport Layer Security (TLS) on port 443 is necessary to encrypt web traffic.",
    defaultRecommendation: "Enable TLS on port 443 on your web server and open firewall rules for HTTPS.",
  },
  SITE_TLS_CERT_VALID: {
    code: "SITE_TLS_CERT_VALID",
    category: "tls",
    title: "TLS certificate validity",
    defaultSeverity: "high",
    explanation: "The TLS certificate must be valid, chained to a trusted root, and match the domain name.",
    defaultRecommendation: "Obtain and install a valid certificate issued by a recognized Certificate Authority matching the hostname.",
  },
  SITE_TLS_EXPIRY: {
    code: "SITE_TLS_EXPIRY",
    category: "tls",
    title: "TLS certificate expiration",
    defaultSeverity: "medium",
    explanation: "Certificates approaching expiration must be renewed before they expire to avoid outages.",
    defaultRecommendation: "Renew your TLS certificate and ensure automated renewal (such as ACME / Certbot) is functioning.",
  },
  SITE_TLS_PROTOCOL: {
    code: "SITE_TLS_PROTOCOL",
    category: "tls",
    title: "Negotiated TLS protocol version",
    defaultSeverity: "medium",
    explanation: "Modern web standards require TLS 1.2 or TLS 1.3. Deprecated protocols like TLS 1.0 or 1.1 have known cryptographic vulnerabilities.",
    defaultRecommendation: "Disable deprecated TLS 1.0 and 1.1 protocols and configure server to support TLS 1.2 and TLS 1.3.",
  },
  SITE_HTTP_TO_HTTPS: {
    code: "SITE_HTTP_TO_HTTPS",
    category: "tls",
    title: "HTTP to HTTPS redirection",
    defaultSeverity: "medium",
    explanation: "Unencrypted HTTP connections on port 80 should redirect automatically to secure HTTPS.",
    defaultRecommendation: "Configure an automatic 301 redirect from HTTP (port 80) to HTTPS (port 443).",
  },
  SITE_REDIRECTS: {
    code: "SITE_REDIRECTS",
    category: "tls",
    title: "Redirect hop count and domain preservation",
    defaultSeverity: "low",
    explanation: "Excessive redirect chains delay page load and cross-domain redirects can expose visitors to redirection attacks.",
    defaultRecommendation: "Minimize redirect hops to fewer than 3 and keep redirects within the same registrable domain.",
  },

  // HTTP Headers (7 rules)
  SITE_HSTS: {
    code: "SITE_HSTS",
    category: "headers",
    title: "HTTP Strict Transport Security (HSTS)",
    defaultSeverity: "medium",
    explanation: "HSTS instructs browsers to communicate only over secure HTTPS, preventing SSL-stripping attacks.",
    defaultRecommendation: "Add the Strict-Transport-Security header with a max-age of at least 15552000 seconds (180 days) and includeSubDomains.",
  },
  SITE_CSP: {
    code: "SITE_CSP",
    category: "headers",
    title: "Content Security Policy (CSP)",
    defaultSeverity: "medium",
    explanation: "Content Security Policy helps prevent Cross-Site Scripting (XSS) and code injection by declaring approved content sources.",
    defaultRecommendation: "Deploy a Content-Security-Policy header restricting script-src and default-src, avoiding 'unsafe-inline' and 'unsafe-eval'.",
  },
  SITE_XCTO: {
    code: "SITE_XCTO",
    category: "headers",
    title: "X-Content-Type-Options header",
    defaultSeverity: "low",
    explanation: "X-Content-Type-Options: nosniff prevents browsers from MIME-sniffing responses away from the declared content-type.",
    defaultRecommendation: "Set 'X-Content-Type-Options: nosniff' on all web responses.",
  },
  SITE_FRAMING: {
    code: "SITE_FRAMING",
    category: "headers",
    title: "Clickjacking framing protection",
    defaultSeverity: "low",
    explanation: "Controlling framing via frame-ancestors or X-Frame-Options protects users against clickjacking attacks.",
    defaultRecommendation: "Configure CSP 'frame-ancestors' directive or set 'X-Frame-Options: DENY' or 'SAMEORIGIN'.",
  },
  SITE_REFERRER_POLICY: {
    code: "SITE_REFERRER_POLICY",
    category: "headers",
    title: "Referrer-Policy header",
    defaultSeverity: "low",
    explanation: "Referrer-Policy protects sensitive path or query information from leaking to third-party referrers.",
    defaultRecommendation: "Set 'Referrer-Policy: strict-origin-when-cross-origin' or 'no-referrer'.",
  },
  SITE_PERMISSIONS_POLICY: {
    code: "SITE_PERMISSIONS_POLICY",
    category: "headers",
    title: "Permissions-Policy header",
    defaultSeverity: "low",
    explanation: "Permissions-Policy controls browser access to camera, microphone, geolocation, and payment APIs.",
    defaultRecommendation: "Add a Permissions-Policy header explicitly disabling unused browser features.",
  },
  SITE_VERSION_DISCLOSURE: {
    code: "SITE_VERSION_DISCLOSURE",
    category: "headers",
    title: "Server version disclosure",
    defaultSeverity: "low",
    explanation: "Disclosing precise server or runtime version numbers aids adversaries in identifying targeted software vulnerabilities.",
    defaultRecommendation: "Suppress or sanitize Server and X-Powered-By response headers so version numbers are not exposed.",
  },

  // Cookies (3 rules)
  SITE_COOKIE_SECURE: {
    code: "SITE_COOKIE_SECURE",
    category: "cookies",
    title: "Cookie Secure attribute enforcement",
    defaultSeverity: "medium",
    explanation: "The Secure flag ensures cookies are only transmitted over encrypted TLS connections.",
    defaultRecommendation: "Set the 'Secure' flag on all cookies issued over HTTPS.",
  },
  SITE_COOKIE_HTTPONLY: {
    code: "SITE_COOKIE_HTTPONLY",
    category: "cookies",
    title: "Cookie HttpOnly attribute enforcement",
    defaultSeverity: "medium",
    explanation: "HttpOnly prevents client-side scripts from reading session cookies, mitigating token theft via XSS.",
    defaultRecommendation: "Ensure all sensitive session, authentication, and state cookies include the 'HttpOnly' attribute.",
  },
  SITE_COOKIE_SAMESITE: {
    code: "SITE_COOKIE_SAMESITE",
    category: "cookies",
    title: "Cookie SameSite attribute enforcement",
    defaultSeverity: "low",
    explanation: "SameSite attribute helps protect against Cross-Site Request Forgery (CSRF) and cross-site data leakage.",
    defaultRecommendation: "Set 'SameSite=Lax' or 'SameSite=Strict' on all cookies.",
  },

  // DNS and Email (3 rules)
  SITE_SPF: {
    code: "SITE_SPF",
    category: "dns",
    title: "Sender Policy Framework (SPF) record",
    defaultSeverity: "medium",
    explanation: "SPF DNS records specify which mail servers are authorized to send email on behalf of your domain.",
    defaultRecommendation: "Publish an SPF TXT record on your apex domain ending with '-all' or '~all', avoiding '+all' or '?all'.",
  },
  SITE_DMARC: {
    code: "SITE_DMARC",
    category: "dns",
    title: "DMARC email authentication policy",
    defaultSeverity: "medium",
    explanation: "DMARC prevents email spoofing and phishing by specifying how receivers should handle messages failing SPF or DKIM.",
    defaultRecommendation: "Publish a '_dmarc' TXT record with a policy of 'p=quarantine' or 'p=reject'.",
  },
  SITE_CAA: {
    code: "SITE_CAA",
    category: "dns",
    title: "Certification Authority Authorization (CAA) record",
    defaultSeverity: "low",
    explanation: "CAA records specify which Certificate Authorities are permitted to issue certificates for your domain.",
    defaultRecommendation: "Publish CAA DNS records specifying your authorized Certificate Authorities (e.g. letsencrypt.org).",
  },
};
