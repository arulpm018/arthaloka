"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, PieChart, Wallet, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/useAppStore";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const LEFT_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: Home },
  { href: "/transactions", label: "Transaksi", icon: Receipt },
];

const RIGHT_ITEMS: NavItem[] = [
  { href: "/categories", label: "Budget", icon: PieChart },
  { href: "/accounts", label: "Rekening", icon: Wallet },
];

/**
 * Navigasi bawah (mobile): 4 tujuan + tombol "+" di tengah yang langsung
 * membuka form catat pengeluaran — supaya mencatat cukup 3 tap.
 */
export const BottomNav = () => {
  const pathname = usePathname();
  const openSheet = useAppStore((s) => s.openSheet);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-safe-bottom md:hidden">
      <div className="grid h-nav-height grid-cols-5 items-center">
        {LEFT_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname.startsWith(item.href)} />
        ))}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => openSheet("expense")}
            aria-label="Catat transaksi"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
        {RIGHT_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname.startsWith(item.href)} />
        ))}
      </div>
    </nav>
  );
};

const NavLink = ({ item, isActive }: { item: NavItem; isActive: boolean }) => (
  <Link
    href={item.href}
    aria-current={isActive ? "page" : undefined}
    className={cn(
      "flex flex-col items-center justify-center gap-0.5 py-2",
      isActive ? "font-semibold text-foreground" : "text-muted-foreground"
    )}
  >
    <item.icon className="h-5 w-5" />
    <span className="text-[10px]">{item.label}</span>
  </Link>
);
