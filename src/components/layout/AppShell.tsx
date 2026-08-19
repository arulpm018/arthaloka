"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { GlobalFAB } from "./GlobalFAB";
import { DesktopTopbar, type Crumb } from "./DesktopTopbar";
import { QuickAddDropdown } from "./QuickAddDropdown";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { OfflineBadge } from "@/components/shared/OfflineBadge";
import { useSidebarState } from "@/hooks/useSidebarState";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { TransferSheet } from "@/components/transactions/TransferSheet";
import { GlobalWishlistAddSheet } from "@/components/wishlist/GlobalWishlistAddSheet";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { cn } from "@/lib/utils/cn";

interface AppShellProps {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = "arthafiloka.sidebarCollapsed.finance";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/arul": OWNER_LABELS.arul,
  "/together": OWNER_LABELS.shared,
  "/fifi": OWNER_LABELS.fifi,
  "/wishlist": "Wishlist",
  "/transactions": "Transaksi",
  "/recap": "Rekap Bulanan",
  "/accounts": "Akun",
  "/categories": "Kategori",
  "/settings": "Settings",
  "/more": "More",
};

/** Longest-prefix match supaya /dashboard tidak menang atas route lain. */
const crumbsFor = (pathname: string): Crumb[] => {
  const match = Object.keys(PAGE_TITLES)
    .filter((route) => pathname.startsWith(route))
    .sort((a, b) => b.length - a.length)[0];
  return [{ label: "Keuangan" }, { label: match ? PAGE_TITLES[match] : "" }].filter((c) => c.label);
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarState(SIDEBAR_STORAGE_KEY);

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <OfflineBadge />

      {/* Sidebar — desktop only, collapsible w-64 ⇄ rail */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 ease-in-out md:block",
          collapsed ? "md:w-[60px]" : "md:w-64"
        )}
      >
        <Sidebar collapsed={collapsed} onToggle={toggle} />
      </aside>

      {/* Kolom konten: topbar desktop + area scroll utama */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DesktopTopbar onToggleSidebar={toggle} crumbs={crumbsFor(pathname)}>
          <QuickAddDropdown />
          <ThemeToggle />
        </DesktopTopbar>

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-nav-height md:pb-0">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav - mobile only */}
      <BottomNav />

      {/* Global FAB — mobile only; di desktop digantikan QuickAddDropdown di topbar */}
      <GlobalFAB />

      {/* Global transaction sheets — accessible from BottomNav, FAB, etc. */}
      <TransactionSheet mode="expense" />
      <TransactionSheet mode="income" />
      <TransferSheet />

      {/* Global wishlist add sheet — di-trigger oleh FAB dari halaman manapun */}
      <GlobalWishlistAddSheet />
    </div>
  );
}
