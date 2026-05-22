"use client";

import { Button } from "@/components/ui/button";
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

export const WishlistFilterBar = ({ activeFilter, onChange }: WishlistFilterBarProps) => {
  return (
    <div className="flex gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? "default" : "outline"}
          size="sm"
          className={cn(
            "rounded-full",
            activeFilter !== filter.value && "text-muted-foreground"
          )}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
};
