import { formatCurrency } from "./formatCurrency";
import type {
  WishlistItem,
  WishlistCategory,
  WishlistCategoryGroup,
  ProgressSummary,
  CategoryProgress,
  OwnerFilter,
} from "@/types/wishlist";

/**
 * Check if a lokasi string is a URL (starts with http:// or https://)
 */
export function isUrl(lokasi: string): boolean {
  return lokasi.startsWith("http://") || lokasi.startsWith("https://");
}

/**
 * Format harga as IDR currency: "Rp 1.500.000"
 */
export function formatHarga(harga: number): string {
  return formatCurrency(harga);
}

/**
 * Sort items: unpurchased first (createdAt desc), then purchased (createdAt desc)
 */
export function sortWishlistItems(items: WishlistItem[]): WishlistItem[] {
  return [...items].sort((a, b) => {
    // Unpurchased first
    if (a.isPurchased !== b.isPurchased) {
      return a.isPurchased ? 1 : -1;
    }
    // Within same group, sort by createdAt descending (newest first)
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

/**
 * Calculate progress summary from a list of items
 */
export function calculateProgress(items: WishlistItem[]): ProgressSummary {
  const purchasedItems = items.filter((item) => item.isPurchased);
  return {
    purchasedCount: purchasedItems.length,
    totalCount: items.length,
    purchasedAmount: purchasedItems.reduce((sum, item) => sum + item.harga, 0),
    totalAmount: items.reduce((sum, item) => sum + item.harga, 0),
  };
}

/**
 * Filter items by owner. Returns all items if filter is "all".
 */
export function filterByOwner(
  items: WishlistItem[],
  owner: OwnerFilter
): WishlistItem[] {
  if (owner === "all") return items;
  return items.filter((item) => item.owner === owner);
}

/**
 * Group items by category, sort within groups, exclude empty groups.
 */
export function groupItemsByCategory(
  items: WishlistItem[],
  categories: WishlistCategory[]
): WishlistCategoryGroup[] {
  const activeCategories = categories.filter((cat) => cat.isActive);

  const groups: WishlistCategoryGroup[] = [];

  for (const category of activeCategories) {
    const categoryItems = items.filter(
      (item) => item.categoryId === category.categoryId
    );

    // Exclude empty groups
    if (categoryItems.length === 0) continue;

    const sortedItems = sortWishlistItems(categoryItems);
    const progress = calculateProgress(categoryItems);

    groups.push({
      category,
      items: sortedItems,
      progress: {
        ...progress,
        categoryId: category.categoryId,
        categoryName: category.name,
        categoryIcon: category.icon,
      },
    });
  }

  return groups;
}

/**
 * Check duplicate category name (case-insensitive).
 * Optionally exclude a category by ID (useful when editing).
 */
export function isDuplicateCategoryName(
  name: string,
  existingCategories: WishlistCategory[],
  excludeId?: string
): boolean {
  const normalizedName = name.trim().toLowerCase();
  return existingCategories.some(
    (cat) =>
      cat.categoryId !== excludeId &&
      cat.name.trim().toLowerCase() === normalizedName
  );
}
