import type { LucideIcon } from "lucide-react";
import {
  GlobeLock,
  HelpCircle,
  History,
  LayoutDashboard,
  Link2,
  UserCheck,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "URL Analyzer",
    href: "/url-analyzer",
    icon: Link2,
  },
  {
    label: "Privacy Analyzer",
    href: "/privacy-analyzer",
    icon: UserCheck,
  },
  {
    label: "Website Auditor",
    href: "/website-auditor",
    icon: GlobeLock,
  },
  {
    label: "History",
    href: "/history",
    icon: History,
  },
  {
    label: "Help",
    href: "/help",
    icon: HelpCircle,
  },
] as const;

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

