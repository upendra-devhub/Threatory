"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiStatusIndicator } from "./ApiStatusIndicator";
import { isNavItemActive, PRIMARY_NAV_ITEMS } from "./navigation";

export interface AppShellProps {
  children: ReactNode;
  statusIndicator?: ReactNode;
}

function BrandMark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 rounded-md px-1 py-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight">Threatory</span>
        <span className="text-[11px] font-medium text-muted-foreground">Security Analysis</span>
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
    <ul className="space-y-1">
      {PRIMARY_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isNavItemActive(pathname, item.href);

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "border-primary/25 bg-primary/10 font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
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
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-card">
        <div className="flex h-16 items-center border-b border-border px-4">
          <BrandMark />
        </div>
        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4">
          <NavList pathname={pathname} />
        </nav>
      </aside>

      {/* Shared top header (mobile brand + menu toggle; single API status indicator across viewports) */}
      <header className="sticky top-0 z-30 border-b border-border bg-card lg:pl-64">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <p className="hidden text-xs font-medium text-muted-foreground lg:block">
            Deterministic security &amp; privacy analysis
          </p>
          <div className="flex items-center gap-2">
            {resolvedStatusIndicator}
            <Button
              ref={toggleButtonRef}
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
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
        </div>

        {mobileMenuOpen ? (
          <div id="mobile-navigation" className="border-t border-border bg-card px-4 py-3 lg:hidden">
            <nav aria-label="Mobile navigation">
              <NavList pathname={pathname} onNavigate={closeMobileMenu} />
            </nav>
          </div>
        ) : null}
      </header>

      {/* Main content area */}
      <div className="lg:pl-64">
        <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
