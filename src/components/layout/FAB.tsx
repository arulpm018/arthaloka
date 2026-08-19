"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FABProps {
  onClick?: () => void;
  /**
   * Tampilkan juga di desktop (md: ke atas). Default hidden — di modul
   * keuangan FAB digantikan QuickAddDropdown di topbar; modul produktivitas
   * tidak punya quick-add topbar sehingga memakai opsi ini.
   */
  showOnDesktop?: boolean;
  ariaLabel?: string;
}

export const FAB = ({
  onClick,
  showOnDesktop = false,
  ariaLabel = "Tambah",
}: FABProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-fab-bottom right-4 z-50",
        "flex h-14 w-14 items-center justify-center",
        "rounded-fab bg-foreground text-background",
        "shadow-md-custom transition-transform active:scale-95",
        showOnDesktop ? "md:bottom-6 md:right-6" : "md:hidden"
      )}
      aria-label={ariaLabel}
    >
      <Plus className="h-6 w-6" />
    </button>
  );
};
