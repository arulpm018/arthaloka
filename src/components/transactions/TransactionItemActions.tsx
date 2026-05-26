"use client";

import { Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TransactionItemActionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  trigger: React.ReactNode;
}

/**
 * Wraps a list-item button with a long-press menu (Edit / Hapus).
 *
 * Catatan: dropdown trigger sengaja dipisah dari `trigger` (button asli) dan
 * di-anchor ke span tak terlihat. Kalau pakai `DropdownMenuTrigger asChild`
 * pada button, satu tap akan men-trigger dua aksi sekaligus (open sheet via
 * `useLongPress.onTap` DAN open dropdown via Radix click handler).
 */
export const TransactionItemActions = ({
  open,
  onOpenChange,
  onEdit,
  onDelete,
  trigger,
}: TransactionItemActionsProps) => {
  return (
    <div className="relative">
      {trigger}
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <span
            aria-hidden
            className="pointer-events-none absolute right-4 bottom-2 h-0 w-0"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onOpenChange(false);
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onOpenChange(false);
              onDelete();
            }}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
