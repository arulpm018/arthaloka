"use client";

import { cn } from "@/lib/utils/cn";
import { Category } from "@/types";
import { getCategoryIcon } from "@/lib/utils/categoryIcons";

interface CategoryGridProps {
  categories: Category[];
  selected: string | null;
  onSelect: (categoryId: string) => void;
}

export const CategoryGrid = ({ categories, selected, onSelect }: CategoryGridProps) => {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.icon);
        const isSelected = selected === cat.categoryId;
        return (
          <button
            key={cat.categoryId}
            type="button"
            onClick={() => onSelect(cat.categoryId)}
            aria-pressed={isSelected}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-colors",
              isSelected ? "bg-accent ring-2 ring-ring" : "hover:bg-accent/50"
            )}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${cat.color}15` }}
            >
              <Icon className="h-4 w-4" style={{ color: cat.color }} />
            </div>
            <span className="w-full truncate text-[11px]">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
};
