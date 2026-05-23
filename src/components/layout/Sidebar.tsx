"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  Users,
  Heart,
  Sparkles,
  Settings,
  Receipt,
  Wallet,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/shared/Logo";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/arul", label: "Arul", icon: User },
  { href: "/together", label: "Together", icon: Users },
  { href: "/fifi", label: "Fifi", icon: Heart },
  { href: "/wishlist", label: "Wishlist", icon: Sparkles },
  { href: "/transactions", label: "Transaksi", icon: Receipt },
  { href: "/accounts", label: "Akun", icon: Wallet },
  { href: "/categories", label: "Kategori", icon: Tag },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* App name */}
      <div className="flex h-14 items-center px-6">
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
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
