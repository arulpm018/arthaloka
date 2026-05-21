"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FABProps {
  onClick?: () => void;
}

export const FAB = ({ onClick }: FABProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-fab-bottom right-4 z-50",
        "flex h-14 w-14 items-center justify-center",
        "rounded-fab bg-foreground text-background",
        "shadow-md-custom transition-transform active:scale-95",
        "md:bottom-6 md:right-6"
      )}
      aria-label="Tambah transaksi"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
};
