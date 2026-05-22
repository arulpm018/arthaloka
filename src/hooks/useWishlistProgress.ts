"use client";

import { useMemo } from "react";
import { calculateProgress } from "@/lib/utils/wishlist";
import type {
  WishlistItem,
  ProgressSummary,
  CategoryProgress,
} from "@/types/wishlist";

export function useWishlistProgress(items: WishlistItem[]): {
  overall: ProgressSummary;
  byCategory: Map<string, CategoryProgress>;
} {
  const overall = useMemo(() => calculateProgress(items), [items]);

  const byCategory = useMemo(() => {
    const map = new Map<string, CategoryProgress>();

    // Group items by categoryId
    const grouped: Record<string, WishlistItem[]> = {};
    for (const item of items) {
      if (!grouped[item.categoryId]) {
        grouped[item.categoryId] = [];
      }
      grouped[item.categoryId].push(item);
    }

    // Calculate progress for each category
    const categoryIds = Object.keys(grouped);
    for (const categoryId of categoryIds) {
      const categoryItems = grouped[categoryId];
      const progress = calculateProgress(categoryItems);
      map.set(categoryId, {
        ...progress,
        categoryId,
        categoryName: "",
        categoryIcon: "",
      });
    }

    return map;
  }, [items]);

  return { overall, byCategory };
}
