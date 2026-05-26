"use client";

import { WishlistCategory } from "@/types/wishlist";
import { getCategoryIcon } from "@/lib/utils/categoryIcons";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { cn } from "@/lib/utils/cn";

const ownerLabels: Record<string, string> = {
  arul: OWNER_LABELS["arul"],
  fifi: OWNER_LABELS["fifi"],
  shared: OWNER_LABELS["shared"],
};

const ownerColors: Record<string, string> = {
  arul: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  fifi: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  shared: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

interface WishlistCategoryListProps {
  categories: WishlistCategory[];
  onCategoryTap?: (category: WishlistCategory) => void;
  showOwner?: boolean;
}

export const WishlistCategoryList = ({
  categories,
  onCategoryTap,
  showOwner = false,
}: WishlistCategoryListProps) => {
  return (
    <div className="space-y-1">
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.icon);
        return (
          <button
            key={cat.categoryId}
            onClick={() => onCategoryTap?.(cat)}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-accent active:bg-accent"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent">
              <Icon className="h-4 w-4 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{cat.name}</p>
                {showOwner && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      ownerColors[cat.owner] || ownerColors.shared
                    )}
                  >
                    {ownerLabels[cat.owner] || cat.owner}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
