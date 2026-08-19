"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { actions, type ActionType } from "./ActionSheet";
import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/useAppStore";

/**
 * Menu "+ Tambah" di topbar desktop — padanan FAB + ActionSheet di mobile.
 * Aksi sama persis: buka TransactionSheet/TransferSheet via store, atau
 * trigger GlobalWishlistAddSheet lewat counter request.
 */
export const QuickAddDropdown = () => {
  const openSheet = useAppStore((s) => s.openSheet);
  const requestWishlistAdd = useAppStore((s) => s.requestWishlistAdd);

  const handleSelect = (type: ActionType) => {
    if (type === "wishlist") {
      requestWishlistAdd();
      return;
    }
    openSheet(type);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5 rounded-lg">
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.type}
            onClick={() => handleSelect(action.type)}
            className="gap-3 py-2.5"
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                action.bg
              )}
            >
              <action.icon className={cn("h-4 w-4", action.color)} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm">{action.label}</span>
              <span className="truncate text-xs text-muted-foreground">
                {action.description}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
