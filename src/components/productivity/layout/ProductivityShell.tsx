"use client";

import { usePathname } from "next/navigation";
import { PrometheusMascot } from "@/components/ai/PrometheusMascot";
import { OfflineBadge } from "@/components/shared/OfflineBadge";
import { AiAssistantSheet } from "@/components/ai/AiAssistantSheet";
import { ProductivitySidebar } from "./ProductivitySidebar";
import { ProductivityBottomNav } from "./ProductivityBottomNav";
import { DesktopTopbar, type Crumb } from "@/components/layout/DesktopTopbar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils/cn";

const SIDEBAR_STORAGE_KEY = "arthafiloka.sidebarCollapsed.productivity";

const crumbsFor = (pathname: string): Crumb[] => {
  const page = pathname.startsWith("/productivity/tasks")
    ? "Tugas"
    : pathname.startsWith("/productivity/schedule")
      ? "Jadwal"
      : pathname.startsWith("/productivity/habits")
        ? "Habit"
        : "Hari Ini";
  return [{ label: "Produktivitas" }, { label: page }];
};

interface ProductivityShellProps {
  children: React.ReactNode;
}

/**
 * Shell modul Produktivitas — sengaja terpisah dari AppShell finance:
 * nav sendiri, tanpa FAB/sheet transaksi, tanpa provider couple.
 * Desktop: sidebar collapsible + topbar (tanpa quick-add keuangan).
 */
export function ProductivityShell({ children }: ProductivityShellProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarState(SIDEBAR_STORAGE_KEY);
  const openAiAssistant = useAppStore((s) => s.openAiAssistant);

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
        <ProductivitySidebar collapsed={collapsed} onToggle={toggle} />
      </aside>

      {/* Kolom konten: topbar desktop + area scroll utama */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DesktopTopbar onToggleSidebar={toggle} crumbs={crumbsFor(pathname)}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={openAiAssistant}
          >
            <PrometheusMascot className="h-5 w-5 rounded-md" />
            Prometheus
          </Button>
          <ThemeToggle />
        </DesktopTopbar>

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-nav-height md:pb-0">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav - mobile only */}
      <ProductivityBottomNav />

      {/* Asisten AI — input teks/suara untuk tugas, jadwal, habit */}
      <AiAssistantSheet />
    </div>
  );
}
