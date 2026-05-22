"use client";

import { getCategoryIcon } from "@/lib/utils/categoryIcons";
import { formatHarga } from "@/lib/utils/wishlist";
import { WishlistCategory, WishlistItem, CategoryProgress } from "@/types/wishlist";
import { WishlistItemCard } from "./WishlistItemCard";

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
  const Icon = getCategoryIcon(category.icon);

  return (
    <section className="space-y-1">
      {/* Category Header — tappable to edit */}
      <button
        onClick={() => onEditCategory(category)}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{category.name}</p>
          <p className="text-xs text-muted-foreground">
            {progress.purchasedCount}/{progress.totalCount} items · {formatHarga(progress.purchasedAmount)} / {formatHarga(progress.totalAmount)}
          </p>
        </div>
      </button>

      {/* Item List */}
      <div className="space-y-0.5">
        {items.map((item) => (
          <WishlistItemCard
            key={item.itemId}
            item={item}
            onTogglePurchased={() => onTogglePurchased(item)}
            onTap={() => onEditItem(item)}
          />
        ))}
      </div>
    </section>
  );
};
