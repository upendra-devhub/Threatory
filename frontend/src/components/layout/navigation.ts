import type { LucideIcon } from "lucide-react";
import {
  CircleHelp,
  Clock,
  Globe,
  LayoutGrid,
  Link2,
  User,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  ariaLabel?: string;
}

export interface NavGroup {
  category: string;
  items: NavItem[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    category: "OVERVIEW",
    items: [
      {
        label: "Dashboard",
        ariaLabel: "Overview",
        href: "/dashboard",
        icon: LayoutGrid,
      },
    ],
  },
  {
    category: "ANALYZERS",
    items: [
      {
        label: "URL Analyzer",
        ariaLabel: "URL Analyzer",
        href: "/url-analyzer",
        icon: Link2,
      },
      {
        label: "Privacy Analyzer",
        ariaLabel: "Privacy Analyzer",
        href: "/privacy-analyzer",
        icon: User,
      },
      {
        label: "Website Auditor",
        ariaLabel: "Website Auditor",
        href: "/website-auditor",
        icon: Globe,
      },
    ],
  },
  {
    category: "REPORTS",
    items: [
      {
        label: "Scan History",
        ariaLabel: "History",
        href: "/history",
        icon: Clock,
      },
      {
        label: "Help and limits",
        ariaLabel: "Help",
        href: "/help",
        icon: CircleHelp,
      },
    ],
  },
] as const;

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap(
  (group) => group.items
);

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (href === "/history" && pathname.startsWith("/reports")) {
    return true;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
