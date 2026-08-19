"use client";

import {
  Home,
  User,
  Users,
  Heart,
  Sparkles,
  Settings,
  Receipt,
  CalendarRange,
  Wallet,
  Tag,
} from "lucide-react";
import { OWNER_LABELS } from "@/lib/constants/labels";
import {
  CollapsibleSidebar,
  type SidebarGroup,
  type SidebarNavItem,
} from "./CollapsibleSidebar";

const groups: SidebarGroup[] = [
  {
    label: "Ikhtisar",
    items: [
      { href: "/dashboard", label: "Home", icon: Home },
      { href: "/arul", label: OWNER_LABELS["arul"], icon: User },
      { href: "/together", label: OWNER_LABELS["shared"], icon: Users },
      { href: "/fifi", label: OWNER_LABELS["fifi"], icon: Heart },
    ] satisfies SidebarNavItem[],
  },
  {
    label: "Catatan",
    items: [
      { href: "/wishlist", label: "Wishlist", icon: Sparkles },
      { href: "/transactions", label: "Transaksi", icon: Receipt },
      { href: "/recap", label: "Rekap Bulanan", icon: CalendarRange },
    ] satisfies SidebarNavItem[],
  },
  {
    label: "Kelola",
    items: [
      { href: "/accounts", label: "Akun", icon: Wallet },
      { href: "/categories", label: "Kategori", icon: Tag },
    ] satisfies SidebarNavItem[],
  },
];

const footerItems: SidebarNavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
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
