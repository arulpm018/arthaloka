"use client";

import Link from "next/link";
import { Wallet, ListTodo, ChevronRight } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Logo } from "@/components/shared/Logo";
import { useAppStore } from "@/store/useAppStore";

const modules = [
  {
    href: "/dashboard",
    label: "Keuangan",
    description: "Transaksi, wishlist & rekap keuangan",
    icon: Wallet,
    chipClass: "bg-primary/10 text-primary",
  },
  {
    href: "/productivity",
    label: "Produktivitas",
    description: "Tugas, jadwal & habit tracker",
    icon: ListTodo,
    chipClass: "bg-capybara/10 text-capybara",
  },
];

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
};

const ModuleChooser = () => {
  const displayName = useAppStore((s) => s.currentUser?.displayName);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="mb-10 flex flex-col items-center gap-2 text-center">
        <Logo size="lg" />
        <p className="text-sm text-muted-foreground">
          {getGreeting()}
          {displayName ? `, ${displayName}` : ""} 👋
        </p>
      </div>

      <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent/50 active:bg-accent"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${module.chipClass}`}>
              <module.icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium">{module.label}</p>
              <p className="text-xs text-muted-foreground">
                {module.description}
              </p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default function HomePage() {
  return (
    <AuthGuard>
      <ModuleChooser />
    </AuthGuard>
  );
}
