"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({ email: trimmedEmail, password });
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create account";
      setError(errorMessage);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-[#f4f7fb] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 my-auto">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="flex flex-col items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <ShieldCheck className="h-7 w-7" strokeWidth={2.4} aria-hidden="true" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Threatory
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-10 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Save your reports and come back to them any time.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="h-11 rounded-xl border-slate-200 bg-white px-3.5 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="At least 10 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="h-11 rounded-xl border-slate-200 bg-white px-3.5 pr-16 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 hover:text-blue-700 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 h-11 w-full rounded-xl bg-blue-600 font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>

            <p className="pt-2 text-center text-[11px] leading-relaxed text-slate-400">
              Reports are saved to your account and deleted automatically after 7 or 30 days.
            </p>

            <div className="mt-4 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <Link
          href="/help"
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Help and limits
        </Link>
      </footer>
    </div>
  );
}
