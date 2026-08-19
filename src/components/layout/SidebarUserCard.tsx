"use client";

import Link from "next/link";
import { ChevronUp, LayoutGrid, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils/cn";

interface SidebarUserCardProps {
  collapsed: boolean;
}

/**
 * Kartu user di footer sidebar desktop — avatar + nama, klik membuka menu
 * (Pengaturan / Ganti Modul / Keluar). Saat sidebar collapsed jadi ikon
 * avatar saja dengan tooltip nama.
 */
export const SidebarUserCard = ({ collapsed }: SidebarUserCardProps) => {
  const currentUser = useAppStore((s) => s.currentUser);
  const { logout } = useAuth();

  const name = currentUser?.displayName ?? "Pengguna";
  const initial = name.slice(0, 1).toUpperCase();
  const avatarUrl =
    currentUser?.preferences?.customAvatarUrl ?? currentUser?.photoURL ?? null;

  const trigger = (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent/60",
        collapsed && "justify-center"
      )}
      aria-label={`Menu akun ${name}`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-7 w-7 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {initial}
        </span>
      )}
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-accent-foreground">
            {name}
          </span>
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
        </>
      )}
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="right">{name}</TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8}>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" />
            Pengaturan
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/">
            <LayoutGrid className="h-4 w-4" />
            Ganti Modul
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void logout()}
          className="text-expense focus:text-expense"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
