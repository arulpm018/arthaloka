"use client";

import { cn } from "@/lib/utils/cn";
import { Category } from "@/types";
import { getCategoryIcon } from "@/lib/utils/categoryIcons";

interface CategoryGridProps {
  categories: Category[];
  selected: string | null;
  onSelect: (categoryId: string) => void;
}

export const CategoryGrid = ({
  categories,
  selected,
  onSelect,
}: CategoryGridProps) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.icon);
        return (
          <button
            key={cat.categoryId}
            type="button"
            onClick={() => onSelect(cat.categoryId)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg p-3 text-center transition-colors",
              selected === cat.categoryId
                ? "bg-accent ring-2 ring-ring"
                : "hover:bg-accent/50"
            )}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${cat.color}15` }}
            >
              <Icon className="h-4 w-4" style={{ color: cat.color }} />
            </div>
            <span className="text-xs truncate w-full">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
};
