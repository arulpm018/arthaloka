"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/shared/Logo";
import { SidebarUserCard } from "./SidebarUserCard";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface SidebarGroup {
  label?: string;
  items: SidebarNavItem[];
}

interface CollapsibleSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Label modul — tampil sebagai sub-judul di bawah brand (expanded saja) */
  moduleLabel: string;
  /** Tint opsional untuk label modul (mis. capybara di modul produktivitas) */
  moduleLabelClassName?: string;
  groups: SidebarGroup[];
  /** Item nav tambahan di atas kartu user (mis. Settings) */
  footerItems?: SidebarNavItem[];
}

/**
 * Kerangka sidebar desktop ala Notion — dipakai modul Keuangan & Produktivitas.
 * Lebar (w-64 ⇄ rail) dikontrol oleh <aside> di shell lewat prop `collapsed`;
 * komponen ini mengurus isi: brand, grup nav, item footer, kartu user.
 * Label item muncul sebagai Tooltip saat collapsed.
 */
export const CollapsibleSidebar = ({
  collapsed,
  onToggle,
  moduleLabel,
  moduleLabelClassName,
  groups,
  footerItems = [],
}: CollapsibleSidebarProps) => {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
        {/* Brand — klik logo kembali ke pemilihan modul */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "px-4"
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/"
                  aria-label="Kembali ke pemilihan modul"
                  className="rounded-md p-1 transition-colors hover:bg-sidebar-accent/60"
                >
                  <Logo size="md" showText={false} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Arthafiloka</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Link
                href="/"
                aria-label="Kembali ke pemilihan modul"
                className="rounded-md transition-colors hover:text-muted-foreground"
              >
                <Logo size="md" />
              </Link>
              <button
                type="button"
                onClick={onToggle}
                aria-label="Sembunyikan sidebar"
                className="ml-auto rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Label modul */}
        {!collapsed && (
          <div className="px-5 pt-4 pb-1">
            <p
              className={cn(
                "text-xs font-medium uppercase tracking-wider",
                moduleLabelClassName ?? "text-sidebar-foreground/50"
              )}
            >
              {moduleLabel}
            </p>
          </div>
        )}

        {/* Navigasi utama */}
        <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 py-2">
          {groups.map((group, gi) => (
            <div key={group.label ?? gi} className="space-y-0.5">
              {group.label && !collapsed && (
                <p className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/45">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <SidebarLink key={item.href} item={item} collapsed={collapsed} />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer — item tambahan + kartu user */}
        <div className="shrink-0 space-y-0.5 border-t border-sidebar-border p-2">
          {footerItems.map((item) => (
            <SidebarLink key={item.href} item={item} collapsed={collapsed} />
          ))}
          <SidebarUserCard collapsed={collapsed} />
        </div>
      </div>
    </TooltipProvider>
  );
};

const SidebarLink = ({
  item,
  collapsed,
}: {
  item: SidebarNavItem;
  collapsed: boolean;
}) => {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  const link = (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center rounded-lg text-sm transition-colors",
        collapsed ? "mx-auto h-9 w-9 justify-center" : "gap-3 px-2.5 py-2",
        isActive
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
};
