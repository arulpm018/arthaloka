"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, ListTodo, CalendarDays, Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/shared/Logo";

const navItems = [
  { href: "/productivity", label: "Hari Ini", icon: Sun, exact: true },
  { href: "/productivity/tasks", label: "Tugas", icon: ListTodo },
  { href: "/productivity/schedule", label: "Jadwal", icon: CalendarDays },
  { href: "/productivity/habits", label: "Habit", icon: Flame },
];

export const ProductivitySidebar = () => {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Klik logo untuk kembali ke pemilihan modul */}
      <div className="flex h-14 items-center px-6">
        <Link
          href="/"
          aria-label="Kembali ke pemilihan modul"
          className="rounded-md transition-colors hover:text-muted-foreground"
        >
          <Logo size="md" />
        </Link>
      </div>

      <div className="px-6 pb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-capybara">
          Produktivitas
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
