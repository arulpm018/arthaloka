"use client";

import Link from "next/link";
import { Wallet, Tag, Settings, CalendarRange, ChevronRight, LayoutGrid } from "lucide-react";
import { Header } from "@/components/layout/Header";

const moduleItems = [
  {
    href: "/",
    label: "Ganti Modul",
    description: "Pilih Keuangan atau Produktivitas",
    icon: LayoutGrid,
    color: "bg-muted text-muted-foreground",
  },
];

const menuItems = [
  {
    href: "/recap",
    label: "Rekap Bulanan",
    description: "Ringkasan lengkap arus kas bulanan",
    icon: CalendarRange,
    color: "bg-primary/10 text-primary",
  },
  {
    href: "/accounts",
    label: "Akun",
    description: "Kelola rekening & dompet",
    icon: Wallet,
    color: "bg-income/10 text-income",
  },
  {
    href: "/categories",
    label: "Kategori",
    description: "Atur kategori & budget",
    icon: Tag,
    color: "bg-shared/10 text-shared",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Profil, tema & preferensi",
    icon: Settings,
    color: "bg-muted text-muted-foreground",
  },
];

export default function MorePage() {
  return (
    <>
      <Header title="More" />
      <div className="p-4 max-w-4xl mx-auto">
        <div className="space-y-2">
          {[...moduleItems, ...menuItems].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 active:bg-accent transition-colors"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
