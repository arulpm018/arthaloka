"use client";

import { OfflineBadge } from "@/components/shared/OfflineBadge";
import { ProductivitySidebar } from "./ProductivitySidebar";
import { ProductivityBottomNav } from "./ProductivityBottomNav";

interface ProductivityShellProps {
  children: React.ReactNode;
}

/**
 * Shell modul Produktivitas — sengaja terpisah dari AppShell finance:
 * nav sendiri, tanpa FAB/sheet transaksi, tanpa provider couple.
 */
export function ProductivityShell({ children }: ProductivityShellProps) {
  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <OfflineBadge />

      {/* Sidebar - desktop only */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border">
        <ProductivitySidebar />
      </aside>

      {/* Main content area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-nav-height md:pb-0">
          {children}
        </div>
      </main>

      {/* Bottom nav - mobile only */}
      <ProductivityBottomNav />
    </div>
  );
}
