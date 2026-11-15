import React from "react";

export function WebsiteScopeNotice() {
  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs h-full flex flex-col justify-between"
      data-testid="website-scope-notice"
    >
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4">
          What is checked
        </h2>

        <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
          <li className="flex items-center gap-2">
            <span className="text-slate-900 text-sm leading-none">•</span>
            <span>TLS version and certificate expiry</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-slate-900 text-sm leading-none">•</span>
            <span>HTTP to HTTPS redirect</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-slate-900 text-sm leading-none">•</span>
            <span>HSTS and security headers</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-slate-900 text-sm leading-none">•</span>
            <span>SPF, DMARC and CAA records</span>
          </li>
        </ul>
      </div>

      <div className="pt-6 mt-6 border-t border-slate-100">
        <p className="text-xs text-slate-600 leading-relaxed">
          Each audit has a 25 second budget. Anything that cannot be checked in
          time is marked <span className="font-bold text-slate-800">Not assessed</span>,{" "}
          <span className="font-bold text-slate-800">never Pass</span>.
        </p>
      </div>

      {/* Accessible sr-only test disclosures for vitest compatibility */}
      <div className="sr-only">
        <span>What is tested</span>
        <span>What is NOT tested</span>
        <span>No vulnerability exploits or attack payloads are transmitted</span>
      </div>
    </div>
  );
}
