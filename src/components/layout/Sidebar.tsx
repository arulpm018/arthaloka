"use client";

import { Home, Receipt, PieChart, Wallet, CalendarRange, Settings } from "lucide-react";
import {
  CollapsibleSidebar,
  type SidebarGroup,
  type SidebarNavItem,
} from "./CollapsibleSidebar";

const groups: SidebarGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Beranda", icon: Home },
      { href: "/transactions", label: "Transaksi", icon: Receipt },
      { href: "/categories", label: "Budget", icon: PieChart },
      { href: "/accounts", label: "Rekening", icon: Wallet },
      { href: "/recap", label: "Rekap Bulanan", icon: CalendarRange },
    ] satisfies SidebarNavItem[],
  },
];

const footerItems: SidebarNavItem[] = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => (
  <CollapsibleSidebar
    collapsed={collapsed}
    onToggle={onToggle}
    moduleLabel="Keuangan"
    moduleLabelClassName="text-primary"
    groups={groups}
    footerItems={footerItems}
  />
);
