"use client";

import { cn } from "@/lib/utils";
import { OwnerFilter } from "@/types/wishlist";

interface WishlistFilterBarProps {
  activeFilter: OwnerFilter;
  onChange: (filter: OwnerFilter) => void;
}

const filters: { value: OwnerFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "arul", label: "Arul" },
  { value: "fifi", label: "Fifi" },
  { value: "shared", label: "Berdua" },
];

export const WishlistFilterBar = ({
  activeFilter,
  onChange,
}: WishlistFilterBarProps) => {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onChange(filter.value)}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
            activeFilter === filter.value
              ? "bg-foreground text-background shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};
