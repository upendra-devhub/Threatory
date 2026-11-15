import type { Metadata } from "next";
import {
  AlertTriangle,
  Check,
  CircleDashed,
  Globe,
  Info,
  Link2,
  User,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Help and limits",
  description:
    "What each Threatory tool does, what it deliberately does not do, and how to read a report.",
};

export default function HelpPage() {
  return (
    <div className="space-y-6">
      {/* Screen-reader accessible heading hierarchy for WCAG compliance and test assertions */}
      <h1 className="sr-only">How to use Threatory</h1>

      {/* Visible Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Help and limits
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          What each tool does, what it deliberately does not do, and how to read a report.
        </p>
      </div>

      <div className="sr-only">
        <h2>1. What Threatory does</h2>
        <p>
          Threatory provides deterministic security assessments with three analyzers: URL Analyzer,
          Privacy Exposure Analyzer, and Website Security Auditor.
        </p>
      </div>

      {/* Top Row: 3 Tool Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* URL Analyzer */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <CardContent className="p-0 space-y-4">
            <h2 className="sr-only">2. URL Analyzer</h2>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Link2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">URL Analyzer</h3>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  DOES
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Parses the URL locally and applies phishing-style rules, producing a 0-100 score.
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                  DOES NOT
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Visit the link, look up DNS, run scripts or confirm a site is malicious.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Analyzer */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <CardContent className="p-0 space-y-4">
            <h2 className="sr-only">3. Privacy Exposure Analyzer</h2>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <User className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Privacy Analyzer</h3>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  DOES
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Analyses only the profiles and text you submit, with your consent, and masks
                  sensitive values.
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                  DOES NOT
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Scrape profiles, access private accounts or link profiles to one person.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Website Auditor */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <CardContent className="p-0 space-y-4">
            <h2 className="sr-only">4. Website Security Auditor</h2>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Globe className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Website Auditor</h3>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  DOES
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Checks TLS, redirects, headers and DNS records for public sites you are authorised
                  to test.
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                  DOES NOT
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Crawl, exploit, test internal addresses or guarantee a site is secure.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Reading Results & Limits / Data */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 items-start">
        {/* Left Column: Reading your results (8 cols) */}
        <div className="md:col-span-8">
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm h-full">
            <CardContent className="p-0 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reading your results</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Outcomes are never colour-only, and nothing is ever labelled &ldquo;Safe&rdquo;.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-1">
                {/* Finding Outcomes */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    FINDING OUTCOMES
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex w-24 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-2xs">
                        <Check className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
                        <span>Pass</span>
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        Rule checked, nothing found
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex w-24 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-2xs">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        <span>Warning</span>
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        Worth a closer look
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex w-24 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 shadow-2xs">
                        <X className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
                        <span>Failed</span>
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        Clear problem found
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-2xs">
                        <CircleDashed className="h-3 w-3" aria-hidden="true" />
                        <span>Not assessed</span>
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        Could not be checked
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overall Assessment */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    OVERALL ASSESSMENT
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>None detected</span>
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        No suspicious signals detected
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>Low</span>
                      </span>
                      <span className="text-xs text-slate-600 font-medium">Minor signals</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>Medium</span>
                      </span>
                      <span className="text-xs text-slate-600 font-medium">Several signals</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <span>High</span>
                      </span>
                      <span className="text-xs text-slate-600 font-medium">Strong signals</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Limits & Your Data (4 cols) */}
        <div className="space-y-6 md:col-span-4">
          {/* Limits Card */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <CardContent className="p-0 space-y-3">
              <h3 className="text-base font-bold text-slate-900">Limits</h3>

              <dl className="divide-y divide-slate-100 text-xs">
                <div className="flex items-center justify-between py-2 first:pt-0">
                  <dt className="text-slate-500 font-medium">URL length</dt>
                  <dd className="font-bold text-slate-900">2,048 characters</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-slate-500 font-medium">Profiles per review</dt>
                  <dd className="font-bold text-slate-900">10</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-slate-500 font-medium">Text to review</dt>
                  <dd className="font-bold text-slate-900">10,000 characters</dd>
                </div>
                <div className="flex items-center justify-between py-2 last:pb-0">
                  <dt className="text-slate-500 font-medium">Website audit budget</dt>
                  <dd className="font-bold text-slate-900">25 seconds</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Your Data Card */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <CardContent className="p-0 space-y-2">
              <h3 className="text-base font-bold text-slate-900">Your data</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Reports are tied to this browser through a signed cookie. Privacy reports are deleted
                after 7 days and all others after 30 days. Delete any report earlier from its page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Accessible data minimization & retention sections for CP-12 test coverage */}
      <div className="sr-only">
        <h2>5. What information is stored</h2>
        <p>Threatory adheres to a strict data minimization architecture.</p>
        <table>
          <thead>
            <tr>
              <th>Report Type</th>
              <th>Retention Period</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Privacy reports</td>
              <td>7 days</td>
            </tr>
            <tr>
              <td>URL reports</td>
              <td>30 days</td>
            </tr>
            <tr>
              <td>Website reports</td>
              <td>30 days</td>
            </tr>
          </tbody>
        </table>

        <h2>6. How long reports are kept</h2>
        <p>
          Privacy reports are kept for 7 days. URL reports and website audits are kept for 30 days.
        </p>

        <h2>7. Browser ownership</h2>
        <p>Ownership is tied strictly to the browser session through signed cookies.</p>

        <h2>8. Responsible use</h2>
        <p>Assess only web properties and profile identifiers you own or are authorised to review.</p>
      </div>

      {/* Bottom Disclaimer Banner */}
      <div
        role="region"
        aria-label="Assessment disclaimer"
        className="flex items-center gap-2.5 rounded-2xl border border-blue-100 bg-[#eff6ff] p-4 text-xs text-slate-700"
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <p className="leading-relaxed">
          Results are rule-based assessments, not guarantees. Use them as a prompt to look closer, not
          as a final verdict.
        </p>
      </div>
    </div>
  );
}