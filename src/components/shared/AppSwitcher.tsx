"use client";

import { usePathname, useRouter } from "next/navigation";
import { Check, LayoutGrid, ListTodo, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";

const modules = [
  { href: "/dashboard", label: "Keuangan", icon: Wallet },
  { href: "/productivity", label: "Produktivitas", icon: ListTodo },
];

/**
 * Switcher modul global — titik pindah aplikasi yang konsisten di semua
 * halaman: di Header (mobile) dan DesktopTopbar (desktop). Dropdown berisi
 * daftar modul + entry ke launcher superapp.
 */
export const AppSwitcher = ({ className }: { className?: string }) => {
  const pathname = usePathname();
  const router = useRouter();

  const isProductivity = pathname.startsWith("/productivity");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Ganti aplikasi"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            className
          )}
        >
          <LayoutGrid className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-[190px]">
        {modules.map((modul) => {
          const isActive =
            modul.href === "/productivity" ? isProductivity : !isProductivity;
          return (
            <DropdownMenuItem
              key={modul.href}
              onSelect={() => router.push(modul.href)}
              className={cn("gap-3 py-2.5", isActive && "font-medium")}
            >
              <modul.icon className="h-4 w-4" />
              <span className="flex-1">{modul.label}</span>
              {isActive && <Check className="h-4 w-4 opacity-70" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => router.push("/")}
          className="gap-3 py-2.5"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="flex-1">Semua Aplikasi</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
