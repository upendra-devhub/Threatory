"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldCheck, Link2, User, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";

export function LandingPageView() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-1"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Threatory
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/signin"
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 transition-colors"
          >
            Sign in
          </Link>
          <Button
            asChild
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 text-sm shadow-sm transition-all"
          >
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 md:py-16 space-y-20">
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            See what a link, a profile or a website{" "}
            <span className="text-blue-600 block sm:inline">is really exposing.</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Threatory runs real security checks and explains every result in plain language, with the evidence behind it and what to do next.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              asChild
              className="h-12 w-full sm:w-auto px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
            >
              <Link href="/signup">Create free account</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 w-full sm:w-auto px-8 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-semibold text-sm shadow-2xs transition-all"
            >
              <Link href="/signin">Sign in</Link>
            </Button>
          </div>

          <p className="text-xs text-slate-400 font-normal">
            No ads. Rule-based and explainable. Privacy reports keep masked results only.
          </p>
        </section>

        {/* Three Capabilities Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: URL Analyzer */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 space-y-4 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Link2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Check a link
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              See why a URL looks like phishing, without ever opening it.
            </p>
          </div>

          {/* Card 2: Privacy Analyzer */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 space-y-4 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <User className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Review your privacy
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Find emails, phone numbers and secrets in text you choose to share. Everything is masked.
            </p>
          </div>

          {/* Card 3: Website Auditor */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 space-y-4 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Globe className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Audit your website
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Check HTTPS, security headers, cookies and DNS for a site you are allowed to test.
            </p>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="space-y-10">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              How it works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shadow-xs">
                1
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Submit</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Paste a link, enter profile details, or give a website you own.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shadow-xs">
                2
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Review the evidence</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Every finding shows what was checked, what was found and why it matters.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shadow-xs">
                3
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Act on it</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Follow clear recommendations and reopen your reports any time.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-900 font-bold text-sm">
            <ShieldCheck className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <span>Threatory</span>
          </div>
          <p>Results are rule-based assessments, not guarantees of safety.</p>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/help" className="hover:text-slate-600 transition-colors">
            Help and limits
          </Link>
          <Link href="/signin" className="hover:text-slate-600 transition-colors">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
