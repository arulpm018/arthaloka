"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Users, Heart, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/arul", label: "Arul", icon: User },
  { href: "/together", label: "Together", icon: Users },
  { href: "/fifi", label: "Fifi", icon: Heart },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

export const BottomNav = () => {
  const pathname = usePathname();

  // "More" should be active when on /more, /transactions, /accounts, /categories, or /settings
  const moreRoutes = ["/more", "/transactions", "/accounts", "/categories", "/settings"];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-safe-bottom md:hidden">
      <div className="flex h-nav-height items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === "/more"
              ? moreRoutes.some((r) => pathname.startsWith(r))
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
