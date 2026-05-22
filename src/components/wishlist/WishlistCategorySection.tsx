"use client";

import { useState } from "react";
import { getCategoryIcon } from "@/lib/utils/categoryIcons";
import { formatHarga } from "@/lib/utils/wishlist";
import {
  WishlistCategory,
  WishlistItem,
  CategoryProgress,
} from "@/types/wishlist";
import { WishlistItemCard } from "./WishlistItemCard";
import { ChevronDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Progress } from "@/components/ui/progress";

interface WishlistCategorySectionProps {
  category: WishlistCategory;
  items: WishlistItem[];
  progress: CategoryProgress;
  onTogglePurchased: (item: WishlistItem) => void;
  onEditItem: (item: WishlistItem) => void;
  onEditCategory: (category: WishlistCategory) => void;
}

export const WishlistCategorySection = ({
  category,
  items,
  progress,
  onTogglePurchased,
  onEditItem,
  onEditCategory,
}: WishlistCategorySectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const Icon = getCategoryIcon(category.icon);

  const percentage =
    progress.totalCount > 0
      ? Math.round((progress.purchasedCount / progress.totalCount) * 100)
      : 0;

  // Split items into unpurchased and purchased
  const unpurchasedItems = items.filter((i) => !i.isPurchased);
  const purchasedItems = items.filter((i) => i.isPurchased);

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Category Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Collapse toggle + icon */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{category.name}</p>
              <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
                {progress.purchasedCount}/{progress.totalCount}
              </span>
            </div>
            {/* Mini progress bar */}
            <Progress value={percentage} className="h-1 mt-1.5" />
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
              isCollapsed && "-rotate-90"
            )}
          />
        </button>

        {/* Edit button */}
        <button
          onClick={() => onEditCategory(category)}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Items */}
      {!isCollapsed && (
        <div className="px-2 pb-2">
          {/* Unpurchased items */}
          {unpurchasedItems.length > 0 && (
            <div className="space-y-0.5">
              {unpurchasedItems.map((item) => (
                <WishlistItemCard
                  key={item.itemId}
                  item={item}
                  onTogglePurchased={() => onTogglePurchased(item)}
                  onTap={() => onEditItem(item)}
                />
              ))}
            </div>
          )}

          {/* Purchased items separator */}
          {purchasedItems.length > 0 && unpurchasedItems.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 mt-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Sudah dibeli ({purchasedItems.length})
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Purchased items */}
          {purchasedItems.length > 0 && (
            <div className="space-y-0.5">
              {purchasedItems.map((item) => (
                <WishlistItemCard
                  key={item.itemId}
                  item={item}
                  onTogglePurchased={() => onTogglePurchased(item)}
                  onTap={() => onEditItem(item)}
                />
              ))}
            </div>
          )}

          {/* Category total */}
          <div className="flex items-center justify-between px-3 pt-2 mt-1 border-t border-border/50">
            <span className="text-[11px] text-muted-foreground">Total</span>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {formatHarga(progress.purchasedAmount)} /{" "}
              {formatHarga(progress.totalAmount)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
