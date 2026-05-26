"use client";

import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { GlobalFAB } from "./GlobalFAB";
import { OfflineBadge } from "@/components/shared/OfflineBadge";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { TransferSheet } from "@/components/transactions/TransferSheet";
import { GlobalWishlistAddSheet } from "@/components/wishlist/GlobalWishlistAddSheet";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <OfflineBadge />
      {/* Sidebar - desktop only */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border">
        <Sidebar />
      </aside>

      {/* Main content area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header slot will be added in Task 3.4 */}
        <div className="flex-1 overflow-y-auto pb-nav-height md:pb-0">
          {children}
        </div>
      </main>

      {/* Bottom nav - mobile only */}
      <BottomNav />

      {/* Global FAB — auto-render di route yang relevan, single instance */}
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
