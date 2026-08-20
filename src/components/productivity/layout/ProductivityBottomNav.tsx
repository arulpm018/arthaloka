"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, ListTodo, CalendarDays, Flame, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/productivity", label: "Hari Ini", icon: Sun, exact: true },
  { href: "/productivity/tasks", label: "Tugas", icon: ListTodo },
  { href: "/productivity/schedule", label: "Jadwal", icon: CalendarDays },
  { href: "/productivity/habits", label: "Habit", icon: Flame },
  { href: "/productivity/settings", label: "Settings", icon: Settings },
];

export const ProductivityBottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-safe-bottom md:hidden">
      <div className="flex h-nav-height items-center justify-around">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[44px] flex-col items-center justify-center gap-0.5 px-3 py-2",
                isActive
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
