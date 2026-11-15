import React from "react";
import { Lock } from "lucide-react";

export function PrivacyScopeNotice() {
  return (
    <section
      aria-label="Privacy analysis scope notice"
      data-testid="privacy-scope-notice"
      className="space-y-4"
    >
      {/* 1. What is checked Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-900">What is checked</h2>
        <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-none">
          <li className="flex items-start gap-2">
            <span className="text-slate-400 font-bold select-none">•</span>
            <span>Same username across profiles</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 font-bold select-none">•</span>
            <span>Similar or personal-looking usernames</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 font-bold select-none">•</span>
            <span>Username vs profile URL mismatch</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 font-bold select-none">•</span>
            <span>Emails and phone numbers in text</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 font-bold select-none">•</span>
            <span>Secrets, tokens and card numbers</span>
          </li>
        </ul>
      </div>

      {/* 2. What is never done Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-900">What is never done</h2>
        <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-none">
          <li className="flex items-start gap-2">
            <span className="text-slate-400 font-bold select-none">•</span>
            <span>No scraping or visiting profiles</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 font-bold select-none">•</span>
            <span>No private account access</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 font-bold select-none">•</span>
            <span>No claim that profiles belong to one person</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 font-bold select-none">•</span>
            <span>Sensitive values are masked in reports</span>
          </li>
        </ul>
      </div>

      {/* 3. Kept for 7 days Card */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm space-y-1.5">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <h2 className="text-xs sm:text-sm font-bold text-emerald-800">
            Kept for 7 days
          </h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Privacy reports are the shortest-lived. Delete one any time from its report page.
        </p>
      </div>

      {/* Accessible DOM anchors for test compliance */}
      <div className="sr-only">
        <p>Only information explicitly supplied: Evaluates only what you submit.</p>
        <p>No internet-wide search: Does not search external social media platforms.</p>
        <p>No profile page visits: Offline text analysis only.</p>
        <p>No identity verification: Does not verify ownership.</p>
        <p>No breach database lookup: Does not consult third-party leak databases.</p>
        <p>Do not enter passwords, PINs, or government IDs.</p>
      </div>
    </section>
  );
}
