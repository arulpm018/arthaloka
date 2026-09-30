"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { DesktopTopbar, type Crumb } from "./DesktopTopbar";
import { PrometheusMascot } from "@/components/ai/PrometheusMascot";
import { AiAssistantSheet } from "@/components/ai/AiAssistantSheet";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { OfflineBadge } from "@/components/shared/OfflineBadge";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { TransferSheet } from "@/components/transactions/TransferSheet";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = "arthafiloka.sidebarCollapsed.finance";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Beranda",
  "/transactions": "Transaksi",
  "/budget": "Budget",
  "/accounts": "Rekening",
  "/recap": "Rekap Bulanan",
  "/settings": "Pengaturan",
};

const crumbsFor = (pathname: string): Crumb[] => {
  const match = Object.keys(PAGE_TITLES).find((route) => pathname.startsWith(route));
  return match ? [{ label: PAGE_TITLES[match] }] : [];
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarState(SIDEBAR_STORAGE_KEY);
  const openAiAssistant = useAppStore((s) => s.openAiAssistant);
  const openSheet = useAppStore((s) => s.openSheet);

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

      <div className="flex min-w-0 flex-1 flex-col">
        <DesktopTopbar onToggleSidebar={toggle} crumbs={crumbsFor(pathname)}>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={openAiAssistant}>
            <PrometheusMascot className="h-5 w-5 rounded-md" />
            Prometheus
          </Button>
          <Button size="sm" className="gap-1.5 rounded-lg" onClick={() => openSheet("expense")}>
            <Plus className="h-4 w-4" />
            Catat
          </Button>
          <ThemeToggle />
        </DesktopTopbar>

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-nav-height md:pb-0">{children}</div>
        </main>
      </div>

      {/* Bottom nav (mobile) — tombol "+" di tengah membuka form catat */}
      <BottomNav />

      <TransactionSheet />
      <TransferSheet />

      <AiAssistantSheet />
    </div>
  );
}
