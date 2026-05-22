import { describe, it, expect } from "vitest";
import {
  isUrl,
  formatHarga,
  sortWishlistItems,
  calculateProgress,
  filterByOwner,
  groupItemsByCategory,
  isDuplicateCategoryName,
} from "@/lib/utils/wishlist";
import { wishlistItemSchema } from "@/lib/validations/wishlistItem.schema";
import { wishlistCategorySchema } from "@/lib/validations/wishlistCategory.schema";
import type { WishlistItem, WishlistCategory } from "@/types/wishlist";

// Helper to create a mock Timestamp
function mockTimestamp(millis: number) {
  return { toMillis: () => millis } as unknown as import("firebase/firestore").Timestamp;
}

// Helper to create a WishlistItem
function makeItem(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    itemId: "item-1",
    nama: "Test Item",
    harga: 100000,
    lokasi: "",
    categoryId: "cat-1",
    owner: "arul",
    isPurchased: false,
    purchasedAt: null,
    createdBy: "uid-1",
    createdAt: mockTimestamp(1000),
    updatedAt: mockTimestamp(1000),
    ...overrides,
  };
}

// Helper to create a WishlistCategory
function makeCategory(overrides: Partial<WishlistCategory> = {}): WishlistCategory {
  return {
    categoryId: "cat-1",
    name: "Gadget",
    icon: "smartphone",
    owner: "arul",
    isActive: true,
    createdBy: "uid-1",
    createdAt: mockTimestamp(1000),
    ...overrides,
  };
}

// ─── isUrl ───────────────────────────────────────────────────────────────────

describe("isUrl", () => {
  it("returns true for http:// URLs", () => {
    expect(isUrl("http://example.com")).toBe(true);
  });

  it("returns true for https:// URLs", () => {
    expect(isUrl("https://tokopedia.com/product/123")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(isUrl("Toko ABC")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isUrl("")).toBe(false);
  });

  it("returns false for ftp:// URLs", () => {
    expect(isUrl("ftp://files.example.com")).toBe(false);
  });

  it("returns false for strings containing http:// but not at start", () => {
    expect(isUrl("go to http://example.com")).toBe(false);
  });

  it("returns true for http:// with no path", () => {
    expect(isUrl("http://localhost")).toBe(true);
  });
});

// ─── formatHarga ─────────────────────────────────────────────────────────────

describe("formatHarga", () => {
  it("formats zero", () => {
    const result = formatHarga(0);
    // Should contain "0" and "Rp"
    expect(result).toContain("Rp");
    expect(result).toContain("0");
  });

  it("formats small numbers", () => {
    const result = formatHarga(1000);
    expect(result).toContain("Rp");
    expect(result).toContain("1.000");
  });

  it("formats large numbers with dot separators", () => {
    const result = formatHarga(1500000);
    expect(result).toContain("Rp");
    expect(result).toContain("1.500.000");
  });

  it("formats very large numbers", () => {
    const result = formatHarga(999999999999);
    expect(result).toContain("Rp");
    expect(result).toContain("999.999.999.999");
  });
});

// ─── sortWishlistItems ───────────────────────────────────────────────────────

describe("sortWishlistItems", () => {
  it("returns empty array for empty input", () => {
    expect(sortWishlistItems([])).toEqual([]);
  });

  it("places unpurchased items before purchased items", () => {
    const items = [
      makeItem({ itemId: "a", isPurchased: true, createdAt: mockTimestamp(3000) }),
      makeItem({ itemId: "b", isPurchased: false, createdAt: mockTimestamp(1000) }),
    ];
    const sorted = sortWishlistItems(items);
    expect(sorted[0].itemId).toBe("b");
    expect(sorted[1].itemId).toBe("a");
  });

  it("sorts unpurchased items by createdAt descending (newest first)", () => {
    const items = [
      makeItem({ itemId: "old", isPurchased: false, createdAt: mockTimestamp(1000) }),
      makeItem({ itemId: "new", isPurchased: false, createdAt: mockTimestamp(3000) }),
    ];
    const sorted = sortWishlistItems(items);
    expect(sorted[0].itemId).toBe("new");
    expect(sorted[1].itemId).toBe("old");
  });

  it("sorts purchased items by createdAt descending (newest first)", () => {
    const items = [
      makeItem({ itemId: "old", isPurchased: true, createdAt: mockTimestamp(1000) }),
      makeItem({ itemId: "new", isPurchased: true, createdAt: mockTimestamp(3000) }),
    ];
    const sorted = sortWishlistItems(items);
    expect(sorted[0].itemId).toBe("new");
    expect(sorted[1].itemId).toBe("old");
  });

  it("does not mutate the original array", () => {
    const items = [
      makeItem({ itemId: "a", isPurchased: true }),
      makeItem({ itemId: "b", isPurchased: false }),
    ];
    const original = [...items];
    sortWishlistItems(items);
    expect(items).toEqual(original);
  });
});

// ─── calculateProgress ───────────────────────────────────────────────────────

describe("calculateProgress", () => {
  it("returns zeros for empty array", () => {
    const result = calculateProgress([]);
    expect(result).toEqual({
      purchasedCount: 0,
      totalCount: 0,
      purchasedAmount: 0,
      totalAmount: 0,
    });
  });

  it("calculates correctly when all items are purchased", () => {
    const items = [
      makeItem({ harga: 100000, isPurchased: true }),
      makeItem({ harga: 200000, isPurchased: true }),
    ];
    const result = calculateProgress(items);
    expect(result.purchasedCount).toBe(2);
    expect(result.totalCount).toBe(2);
    expect(result.purchasedAmount).toBe(300000);
    expect(result.totalAmount).toBe(300000);
  });

  it("calculates correctly when no items are purchased", () => {
    const items = [
      makeItem({ harga: 100000, isPurchased: false }),
      makeItem({ harga: 200000, isPurchased: false }),
    ];
    const result = calculateProgress(items);
    expect(result.purchasedCount).toBe(0);
    expect(result.totalCount).toBe(2);
    expect(result.purchasedAmount).toBe(0);
    expect(result.totalAmount).toBe(300000);
  });

  it("calculates correctly with mixed purchased/unpurchased", () => {
    const items = [
      makeItem({ harga: 500000, isPurchased: true }),
      makeItem({ harga: 300000, isPurchased: false }),
      makeItem({ harga: 200000, isPurchased: true }),
    ];
    const result = calculateProgress(items);
    expect(result.purchasedCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.purchasedAmount).toBe(700000);
    expect(result.totalAmount).toBe(1000000);
  });
});

// ─── filterByOwner ───────────────────────────────────────────────────────────

describe("filterByOwner", () => {
  const items = [
    makeItem({ itemId: "1", owner: "arul" }),
    makeItem({ itemId: "2", owner: "fifi" }),
    makeItem({ itemId: "3", owner: "shared" }),
    makeItem({ itemId: "4", owner: "arul" }),
  ];

  it('returns all items when filter is "all"', () => {
    const result = filterByOwner(items, "all");
    expect(result).toHaveLength(4);
  });

  it('returns only arul items when filter is "arul"', () => {
    const result = filterByOwner(items, "arul");
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.owner === "arul")).toBe(true);
  });

  it('returns only fifi items when filter is "fifi"', () => {
    const result = filterByOwner(items, "fifi");
    expect(result).toHaveLength(1);
    expect(result[0].owner).toBe("fifi");
  });

  it('returns only shared items when filter is "shared"', () => {
    const result = filterByOwner(items, "shared");
    expect(result).toHaveLength(1);
    expect(result[0].owner).toBe("shared");
  });

  it("returns empty array when no items match filter", () => {
    const arulItems = [makeItem({ owner: "arul" })];
    const result = filterByOwner(arulItems, "fifi");
    expect(result).toHaveLength(0);
  });
});

// ─── groupItemsByCategory ────────────────────────────────────────────────────

describe("groupItemsByCategory", () => {
  it("returns empty array when no items", () => {
    const categories = [makeCategory()];
    const result = groupItemsByCategory([], categories);
    expect(result).toEqual([]);
  });

  it("excludes inactive categories", () => {
    const categories = [
      makeCategory({ categoryId: "cat-1", isActive: false }),
    ];
    const items = [makeItem({ categoryId: "cat-1" })];
    const result = groupItemsByCategory(items, categories);
    expect(result).toHaveLength(0);
  });

  it("excludes categories with no matching items", () => {
    const categories = [
      makeCategory({ categoryId: "cat-1" }),
      makeCategory({ categoryId: "cat-2", name: "Kendaraan" }),
    ];
    const items = [makeItem({ categoryId: "cat-1" })];
    const result = groupItemsByCategory(items, categories);
    expect(result).toHaveLength(1);
    expect(result[0].category.categoryId).toBe("cat-1");
  });

  it("groups items by category correctly", () => {
    const categories = [
      makeCategory({ categoryId: "cat-1", name: "Gadget" }),
      makeCategory({ categoryId: "cat-2", name: "Kendaraan" }),
    ];
    const items = [
      makeItem({ itemId: "1", categoryId: "cat-1" }),
      makeItem({ itemId: "2", categoryId: "cat-2" }),
      makeItem({ itemId: "3", categoryId: "cat-1" }),
    ];
    const result = groupItemsByCategory(items, categories);
    expect(result).toHaveLength(2);
    expect(result[0].items).toHaveLength(2);
    expect(result[1].items).toHaveLength(1);
  });

  it("includes progress data in each group", () => {
    const categories = [makeCategory({ categoryId: "cat-1" })];
    const items = [
      makeItem({ categoryId: "cat-1", harga: 100000, isPurchased: true }),
      makeItem({ categoryId: "cat-1", harga: 200000, isPurchased: false }),
    ];
    const result = groupItemsByCategory(items, categories);
    expect(result[0].progress.purchasedCount).toBe(1);
    expect(result[0].progress.totalCount).toBe(2);
    expect(result[0].progress.purchasedAmount).toBe(100000);
    expect(result[0].progress.totalAmount).toBe(300000);
    expect(result[0].progress.categoryId).toBe("cat-1");
    expect(result[0].progress.categoryName).toBe("Gadget");
  });
});

// ─── isDuplicateCategoryName ─────────────────────────────────────────────────

describe("isDuplicateCategoryName", () => {
  const categories = [
    makeCategory({ categoryId: "cat-1", name: "Gadget" }),
    makeCategory({ categoryId: "cat-2", name: "Kendaraan" }),
  ];

  it("detects exact duplicate", () => {
    expect(isDuplicateCategoryName("Gadget", categories)).toBe(true);
  });

  it("detects case-insensitive duplicate", () => {
    expect(isDuplicateCategoryName("gadget", categories)).toBe(true);
    expect(isDuplicateCategoryName("GADGET", categories)).toBe(true);
    expect(isDuplicateCategoryName("GaDgEt", categories)).toBe(true);
  });

  it("detects duplicate with leading/trailing whitespace", () => {
    expect(isDuplicateCategoryName("  Gadget  ", categories)).toBe(true);
  });

  it("returns false for non-duplicate name", () => {
    expect(isDuplicateCategoryName("Rumah Tangga", categories)).toBe(false);
  });

  it("excludes category by ID when checking", () => {
    // "Gadget" exists as cat-1, but we exclude cat-1 → not a duplicate
    expect(isDuplicateCategoryName("Gadget", categories, "cat-1")).toBe(false);
  });

  it("still detects duplicate when excludeId does not match", () => {
    // "Gadget" exists as cat-1, we exclude cat-2 → still a duplicate
    expect(isDuplicateCategoryName("Gadget", categories, "cat-2")).toBe(true);
  });

  it("returns false for empty categories list", () => {
    expect(isDuplicateCategoryName("Anything", [])).toBe(false);
  });
});

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

describe("wishlistItemSchema", () => {
  const validInput = {
    nama: "iPhone 16",
    harga: 15000000,
    lokasi: "https://tokopedia.com",
    categoryId: "cat-1",
    owner: "arul" as const,
    createdBy: "uid-1",
  };

  it("accepts valid input", () => {
    const result = wishlistItemSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty nama", () => {
    const result = wishlistItemSchema.safeParse({ ...validInput, nama: "" });
    expect(result.success).toBe(false);
  });

  it("rejects nama exceeding 100 characters", () => {
    const result = wishlistItemSchema.safeParse({
      ...validInput,
      nama: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects harga of 0", () => {
    const result = wishlistItemSchema.safeParse({ ...validInput, harga: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative harga", () => {
    const result = wishlistItemSchema.safeParse({ ...validInput, harga: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer harga", () => {
    const result = wishlistItemSchema.safeParse({ ...validInput, harga: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects harga exceeding max", () => {
    const result = wishlistItemSchema.safeParse({
      ...validInput,
      harga: 1000000000000,
    });
    expect(result.success).toBe(false);
  });

  it("accepts harga at max boundary", () => {
    const result = wishlistItemSchema.safeParse({
      ...validInput,
      harga: 999999999999,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty lokasi", () => {
    const result = wishlistItemSchema.safeParse({ ...validInput, lokasi: "" });
    expect(result.success).toBe(true);
  });

  it("accepts lokasi omitted (defaults to empty string)", () => {
    const { lokasi: _lokasi, ...withoutLokasi } = validInput;
    const result = wishlistItemSchema.safeParse(withoutLokasi);
    expect(result.success).toBe(true);
  });

  it("rejects lokasi exceeding 500 characters", () => {
    const result = wishlistItemSchema.safeParse({
      ...validInput,
      lokasi: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid owner value", () => {
    const result = wishlistItemSchema.safeParse({
      ...validInput,
      owner: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty categoryId", () => {
    const result = wishlistItemSchema.safeParse({
      ...validInput,
      categoryId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("wishlistCategorySchema", () => {
  const validInput = {
    name: "Gadget",
    icon: "smartphone",
    owner: "arul" as const,
    isActive: true,
    createdBy: "uid-1",
  };

  it("accepts valid input", () => {
    const result = wishlistCategorySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("trims whitespace from name", () => {
    const result = wishlistCategorySchema.safeParse({
      ...validInput,
      name: "  Gadget  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Gadget");
    }
  });

  it("rejects empty name", () => {
    const result = wishlistCategorySchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("trims whitespace-only name (schema trims before output)", () => {
    // The schema trims the name via .transform(), but min(1) checks pre-trim length.
    // A whitespace-only string like "   " has length 3, passes min(1), then gets trimmed to "".
    // This is the current schema behavior — the trimmed result is empty string.
    const result = wishlistCategorySchema.safeParse({
      ...validInput,
      name: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("");
    }
  });

  it("rejects name exceeding 50 characters", () => {
    const result = wishlistCategorySchema.safeParse({
      ...validInput,
      name: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("accepts name at max boundary (50 chars)", () => {
    const result = wishlistCategorySchema.safeParse({
      ...validInput,
      name: "a".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty icon", () => {
    const result = wishlistCategorySchema.safeParse({ ...validInput, icon: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid owner value", () => {
    const result = wishlistCategorySchema.safeParse({
      ...validInput,
      owner: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("defaults isActive to true when omitted", () => {
    const { isActive: _isActive, ...withoutIsActive } = validInput;
    const result = wishlistCategorySchema.safeParse(withoutIsActive);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });
});
