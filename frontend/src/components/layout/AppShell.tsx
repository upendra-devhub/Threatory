"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiStatusIndicator } from "./ApiStatusIndicator";
import { isNavItemActive, NAV_GROUPS } from "./navigation";

export interface AppShellProps {
  children: ReactNode;
  statusIndicator?: ReactNode;
}

function BrandMark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-3 rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
        <ShieldCheck className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight text-slate-900">Threatory</span>
        <span className="text-[11px] font-normal text-slate-400 mt-1">Digital threat analysis</span>
      </span>
    </Link>
  );
}

interface NavListProps {
  pathname: string;
  onNavigate?: () => void;
}

function NavList({ pathname, onNavigate }: NavListProps) {
  return (
    <div className="space-y-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.category} className="space-y-1">
          <div className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            {group.category}
          </div>
          <ul className="space-y-1 mt-1.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-label={item.ariaLabel || item.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      active
                        ? "bg-[#edf3ff] font-semibold text-blue-700"
                        : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                    )}
                  >
                    {active ? (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-600"
                        aria-hidden="true"
                      />
                    ) : null}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-blue-700" : "text-slate-500"
                      )}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AppShell({ children, statusIndicator }: AppShellProps) {
  const resolvedStatusIndicator =
    statusIndicator === undefined ? <ApiStatusIndicator /> : statusIndicator;
  const pathname = usePathname() ?? "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        toggleButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200/80 lg:bg-white">
        <div className="flex h-20 items-center px-6">
          <BrandMark />
        </div>
        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-4 py-2">
          <NavList pathname={pathname} />
        </nav>
        <div className="p-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
            <div>{resolvedStatusIndicator}</div>
            <div className="space-y-1.5 text-[11px] leading-relaxed text-slate-400">
              <p>Reports are tied to this browser and expire automatically.</p>
              <p>Results are rule-based assessments, not guarantees.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <BrandMark />
          <Button
            ref={toggleButtonRef}
            type="button"
            variant="outline"
            size="icon"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>

        {mobileMenuOpen ? (
          <div id="mobile-navigation" className="border-t border-slate-200/80 bg-white px-2 py-4">
            <nav aria-label="Mobile navigation">
              <NavList pathname={pathname} onNavigate={closeMobileMenu} />
            </nav>
          </div>
        ) : null}
      </header>

      {/* Main content area */}
      <div className="lg:pl-64">
        <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
