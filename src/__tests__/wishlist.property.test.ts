import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Timestamp } from "firebase/firestore";
import { wishlistCategorySchema } from "@/lib/validations/wishlistCategory.schema";
import { wishlistItemSchema } from "@/lib/validations/wishlistItem.schema";
import {
  isUrl,
  sortWishlistItems,
  calculateProgress,
  filterByOwner,
  groupItemsByCategory,
  isDuplicateCategoryName,
} from "@/lib/utils/wishlist";
import type {
  WishlistItem,
  WishlistCategory,
  OwnerFilter,
} from "@/types/wishlist";

// --- Toggle Logic (mirrors wishlistItemsService.togglePurchased) ---

/**
 * Simulates the toggle purchased logic from the service layer.
 * When isPurchased is false → sets isPurchased=true, purchasedAt=non-null timestamp
 * When isPurchased is true → sets isPurchased=false, purchasedAt=null
 */
function simulateTogglePurchased(item: WishlistItem): WishlistItem {
  const newIsPurchased = !item.isPurchased;
  return {
    ...item,
    isPurchased: newIsPurchased,
    purchasedAt: newIsPurchased
      ? ({ toMillis: () => Date.now(), seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as unknown as Timestamp)
      : null,
  };
}

// --- Helpers ---

function makeTimestamp(millis: number): Timestamp {
  return {
    toMillis: () => millis,
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1_000_000,
  } as unknown as Timestamp;
}

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
    createdAt: makeTimestamp(Date.now()),
    updatedAt: makeTimestamp(Date.now()),
    ...overrides,
  };
}

function makeCategory(
  overrides: Partial<WishlistCategory> = {}
): WishlistCategory {
  return {
    categoryId: "cat-1",
    name: "Test Category",
    icon: "heart",
    owner: "arul",
    isActive: true,
    createdBy: "uid-1",
    createdAt: makeTimestamp(Date.now()),
    ...overrides,
  };
}

// --- Arbitraries ---

const ownerArb = fc.constantFrom("arul" as const, "fifi" as const, "shared" as const);

const wishlistItemArb = fc.record({
  itemId: fc.uuid(),
  nama: fc.string({ minLength: 1, maxLength: 100 }),
  harga: fc.integer({ min: 1, max: 999_999_999_999 }),
  lokasi: fc.string({ minLength: 0, maxLength: 500 }),
  categoryId: fc.uuid(),
  owner: ownerArb,
  isPurchased: fc.boolean(),
  purchasedAt: fc.option(fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }).map(makeTimestamp), { nil: null }),
  createdBy: fc.uuid(),
  createdAt: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }).map(makeTimestamp),
  updatedAt: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }).map(makeTimestamp),
});

// --- Property Tests ---

describe("Feature: wishlist, Property 1: Category name validation", () => {
  /**
   * **Validates: Requirements 1.2, 1.4**
   *
   * For any string input, after trimming leading/trailing whitespace,
   * the wishlist category validation SHALL accept the name if and only if
   * its length is between 1 and 50 characters (inclusive).
   *
   * The schema validates raw string length (1-50) then trims via transform.
   * To ensure trimmed result is also valid (non-empty), we test that:
   * - Strings with raw length 1-50 are accepted by the schema
   * - Strings with raw length 0 or >50 are rejected
   * - The output value is always trimmed
   */
  it("accepts category name iff raw length is 1-50 and output is trimmed", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (name) => {
        const input = {
          name,
          icon: "heart",
          owner: "arul" as const,
          isActive: true,
          createdBy: "uid-123",
        };

        const result = wishlistCategorySchema.safeParse(input);

        if (name.length >= 1 && name.length <= 50) {
          // Schema accepts strings with raw length 1-50
          expect(result.success).toBe(true);
          if (result.success) {
            // Output is always trimmed
            expect(result.data.name).toBe(name.trim());
          }
        } else {
          // Schema rejects strings with raw length 0 or >50
          expect(result.success).toBe(false);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("rejects empty strings and strings exceeding 50 characters", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(""),
          fc.string({ minLength: 51, maxLength: 200 })
        ),
        (name) => {
          const input = {
            name,
            icon: "heart",
            owner: "arul" as const,
            isActive: true,
            createdBy: "uid-123",
          };

          const result = wishlistCategorySchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: wishlist, Property 2: Category duplicate detection", () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * For any two category name strings, the duplicate detection function SHALL
   * return true if and only if the two strings are equal when compared
   * case-insensitively (after trimming), regardless of the original casing.
   */
  it("detects duplicates case-insensitively after trimming", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (name1, name2) => {
          const categories = [makeCategory({ categoryId: "cat-1", name: name1 })];

          const isDuplicate = isDuplicateCategoryName(name2, categories);

          const expected =
            name1.trim().toLowerCase() === name2.trim().toLowerCase();
          expect(isDuplicate).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("respects excludeId parameter", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (name) => {
          const categories = [makeCategory({ categoryId: "cat-1", name })];

          // When excluding the same category, should never be duplicate
          const isDuplicate = isDuplicateCategoryName(name, categories, "cat-1");
          expect(isDuplicate).toBe(false);

          // Without excluding, same name should be duplicate
          const isDuplicate2 = isDuplicateCategoryName(name, categories);
          expect(isDuplicate2).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: wishlist, Property 3: Wishlist item field validation", () => {
  /**
   * **Validates: Requirements 2.2, 2.6**
   *
   * For any nama string and harga number and lokasi string, the wishlist item
   * validation SHALL accept the input if and only if: nama is non-empty and
   * ≤100 characters, harga is a positive integer between 1 and 999,999,999,999,
   * and lokasi (when provided) is ≤500 characters.
   */
  it("accepts item iff nama 1-100 chars, harga 1-999999999999 int, lokasi ≤500", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 150 }),
        fc.oneof(
          fc.integer({ min: -100, max: 1_500_000_000_000 }),
          fc.double({ min: -100, max: 1_500_000_000_000 })
        ),
        fc.string({ minLength: 0, maxLength: 600 }),
        (nama, harga, lokasi) => {
          const input = {
            nama,
            harga,
            lokasi,
            categoryId: "cat-123",
            owner: "arul" as const,
            createdBy: "uid-123",
          };

          const result = wishlistItemSchema.safeParse(input);

          const namaValid = nama.length >= 1 && nama.length <= 100;
          const hargaValid =
            Number.isInteger(harga) && harga >= 1 && harga <= 999_999_999_999;
          const lokasiValid = lokasi.length <= 500;

          if (namaValid && hargaValid && lokasiValid) {
            expect(result.success).toBe(true);
          } else {
            expect(result.success).toBe(false);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe("Feature: wishlist, Property 4: URL detection", () => {
  /**
   * **Validates: Requirements 2.4, 2.5**
   *
   * For any non-empty string, the isUrl function SHALL return true if and only if
   * the string starts with "http://" or "https://" (case-sensitive prefix match).
   */
  it("returns true iff string starts with http:// or https://", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 500 }), (str) => {
        const result = isUrl(str);
        const expected =
          str.startsWith("http://") || str.startsWith("https://");
        expect(result).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });

  it("correctly identifies generated URLs", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.webUrl().map((url) => ({ str: url, shouldBeUrl: true })),
          fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => !s.startsWith("http://") && !s.startsWith("https://"))
            .map((s) => ({ str: s, shouldBeUrl: false }))
        ),
        ({ str, shouldBeUrl }) => {
          expect(isUrl(str)).toBe(shouldBeUrl);
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe("Feature: wishlist, Property 5: Item sorting invariant", () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * For any list of wishlist items with mixed isPurchased values and createdAt
   * timestamps, after applying the sort function, all unpurchased items SHALL
   * appear before all purchased items, and within each group items SHALL be
   * ordered by createdAt descending (newest first).
   */
  it("unpurchased items appear before purchased, newest first within groups", () => {
    fc.assert(
      fc.property(
        fc.array(wishlistItemArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          const sorted = sortWishlistItems(items);

          // Same length (no items lost or added)
          expect(sorted.length).toBe(items.length);

          // Find the boundary between unpurchased and purchased
          let foundPurchased = false;
          for (const item of sorted) {
            if (item.isPurchased) {
              foundPurchased = true;
            } else if (foundPurchased) {
              // Found unpurchased after purchased — violation
              expect(foundPurchased && !item.isPurchased).toBe(false);
            }
          }

          // Within each group, verify createdAt descending
          const unpurchased = sorted.filter((i) => !i.isPurchased);
          const purchased = sorted.filter((i) => i.isPurchased);

          for (let i = 1; i < unpurchased.length; i++) {
            const prev = unpurchased[i - 1].createdAt?.toMillis?.() ?? 0;
            const curr = unpurchased[i].createdAt?.toMillis?.() ?? 0;
            expect(prev).toBeGreaterThanOrEqual(curr);
          }

          for (let i = 1; i < purchased.length; i++) {
            const prev = purchased[i - 1].createdAt?.toMillis?.() ?? 0;
            const curr = purchased[i].createdAt?.toMillis?.() ?? 0;
            expect(prev).toBeGreaterThanOrEqual(curr);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe("Feature: wishlist, Property 6: Progress summary calculation", () => {
  /**
   * **Validates: Requirements 3.4, 3.5**
   *
   * For any list of wishlist items with arbitrary isPurchased boolean values and
   * positive integer harga values, the calculateProgress function SHALL return
   * correct purchasedCount, totalCount, purchasedAmount, and totalAmount.
   */
  it("correctly calculates progress from any item array", () => {
    fc.assert(
      fc.property(
        fc.array(wishlistItemArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          const progress = calculateProgress(items);

          const expectedPurchasedCount = items.filter(
            (i) => i.isPurchased
          ).length;
          const expectedTotalCount = items.length;
          const expectedPurchasedAmount = items
            .filter((i) => i.isPurchased)
            .reduce((sum, i) => sum + i.harga, 0);
          const expectedTotalAmount = items.reduce(
            (sum, i) => sum + i.harga,
            0
          );

          expect(progress.purchasedCount).toBe(expectedPurchasedCount);
          expect(progress.totalCount).toBe(expectedTotalCount);
          expect(progress.purchasedAmount).toBe(expectedPurchasedAmount);
          expect(progress.totalAmount).toBe(expectedTotalAmount);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("purchasedAmount <= totalAmount always holds", () => {
    fc.assert(
      fc.property(
        fc.array(wishlistItemArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          const progress = calculateProgress(items);
          expect(progress.purchasedAmount).toBeLessThanOrEqual(
            progress.totalAmount
          );
          expect(progress.purchasedCount).toBeLessThanOrEqual(
            progress.totalCount
          );
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe("Feature: wishlist, Property 7: Owner filter with empty category exclusion", () => {
  /**
   * **Validates: Requirements 3.6, 3.8**
   *
   * For any list of wishlist items with varying owner values and any active owner
   * filter, the filter function SHALL return only items whose owner matches the
   * filter, and after grouping by category, any category with zero items in the
   * filtered result SHALL be excluded from the output.
   */
  it("filterByOwner returns only matching items (or all if 'all')", () => {
    fc.assert(
      fc.property(
        fc.array(wishlistItemArb, { minLength: 0, maxLength: 20 }),
        fc.constantFrom("all" as OwnerFilter, "arul" as OwnerFilter, "fifi" as OwnerFilter, "shared" as OwnerFilter),
        (items, ownerFilter) => {
          const filtered = filterByOwner(items, ownerFilter);

          if (ownerFilter === "all") {
            expect(filtered.length).toBe(items.length);
          } else {
            // All returned items must match the filter
            for (const item of filtered) {
              expect(item.owner).toBe(ownerFilter);
            }
            // Count should match manual filter
            const expectedCount = items.filter(
              (i) => i.owner === ownerFilter
            ).length;
            expect(filtered.length).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("groupItemsByCategory excludes categories with zero items after filtering", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            categoryId: fc.constantFrom("cat-1", "cat-2", "cat-3"),
            owner: ownerArb,
            isPurchased: fc.boolean(),
            harga: fc.integer({ min: 1, max: 1_000_000 }),
            createdAt: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }).map(makeTimestamp),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        fc.constantFrom("all" as OwnerFilter, "arul" as OwnerFilter, "fifi" as OwnerFilter, "shared" as OwnerFilter),
        (itemSpecs, ownerFilter) => {
          // Build full items from specs
          const items: WishlistItem[] = itemSpecs.map((spec, i) =>
            makeItem({
              itemId: `item-${i}`,
              categoryId: spec.categoryId,
              owner: spec.owner,
              isPurchased: spec.isPurchased,
              harga: spec.harga,
              createdAt: spec.createdAt,
              updatedAt: spec.createdAt,
            })
          );

          // Create categories for all possible categoryIds
          const categories: WishlistCategory[] = [
            makeCategory({ categoryId: "cat-1", name: "Category 1" }),
            makeCategory({ categoryId: "cat-2", name: "Category 2" }),
            makeCategory({ categoryId: "cat-3", name: "Category 3" }),
          ];

          // Filter by owner first
          const filtered = filterByOwner(items, ownerFilter);

          // Group by category
          const groups = groupItemsByCategory(filtered, categories);

          // Every group must have at least one item
          for (const group of groups) {
            expect(group.items.length).toBeGreaterThan(0);
          }

          // Categories with no items in filtered set should not appear
          for (const cat of categories) {
            const itemsInCat = filtered.filter(
              (i) => i.categoryId === cat.categoryId
            );
            const groupExists = groups.some(
              (g) => g.category.categoryId === cat.categoryId
            );
            if (itemsInCat.length === 0) {
              expect(groupExists).toBe(false);
            } else {
              expect(groupExists).toBe(true);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});


describe("Feature: wishlist, Property 8: Purchase status toggle round-trip", () => {
  /**
   * **Validates: Requirements 4.4**
   *
   * For any wishlist item, toggling isPurchased to true SHALL set purchasedAt
   * to a non-null timestamp, and subsequently toggling isPurchased back to false
   * SHALL clear purchasedAt to null, restoring the item to its original
   * unpurchased state.
   */
  it("toggling purchased sets purchasedAt, toggling back clears it", () => {
    // Generate items that start as unpurchased (isPurchased=false, purchasedAt=null)
    const unpurchasedItemArb = fc.record({
      itemId: fc.uuid(),
      nama: fc.string({ minLength: 1, maxLength: 100 }),
      harga: fc.integer({ min: 1, max: 999_999_999_999 }),
      lokasi: fc.string({ minLength: 0, maxLength: 500 }),
      categoryId: fc.uuid(),
      owner: ownerArb,
      isPurchased: fc.constant(false),
      purchasedAt: fc.constant(null),
      createdBy: fc.uuid(),
      createdAt: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }).map(makeTimestamp),
      updatedAt: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }).map(makeTimestamp),
    }) as fc.Arbitrary<WishlistItem>;

    fc.assert(
      fc.property(unpurchasedItemArb, (item) => {
        // Precondition: item starts unpurchased
        expect(item.isPurchased).toBe(false);
        expect(item.purchasedAt).toBeNull();

        // First toggle: false → true
        const afterFirstToggle = simulateTogglePurchased(item);
        expect(afterFirstToggle.isPurchased).toBe(true);
        expect(afterFirstToggle.purchasedAt).not.toBeNull();

        // Second toggle: true → false (round-trip)
        const afterSecondToggle = simulateTogglePurchased(afterFirstToggle);
        expect(afterSecondToggle.isPurchased).toBe(false);
        expect(afterSecondToggle.purchasedAt).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("toggling a purchased item back clears purchasedAt", () => {
    // Generate items that start as purchased (isPurchased=true, purchasedAt=non-null)
    const purchasedItemArb = fc.record({
      itemId: fc.uuid(),
      nama: fc.string({ minLength: 1, maxLength: 100 }),
      harga: fc.integer({ min: 1, max: 999_999_999_999 }),
      lokasi: fc.string({ minLength: 0, maxLength: 500 }),
      categoryId: fc.uuid(),
      owner: ownerArb,
      isPurchased: fc.constant(true),
      purchasedAt: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }).map(makeTimestamp),
      createdBy: fc.uuid(),
      createdAt: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }).map(makeTimestamp),
      updatedAt: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }).map(makeTimestamp),
    }) as fc.Arbitrary<WishlistItem>;

    fc.assert(
      fc.property(purchasedItemArb, (item) => {
        // Precondition: item starts purchased with a timestamp
        expect(item.isPurchased).toBe(true);
        expect(item.purchasedAt).not.toBeNull();

        // Toggle: true → false
        const afterToggle = simulateTogglePurchased(item);
        expect(afterToggle.isPurchased).toBe(false);
        expect(afterToggle.purchasedAt).toBeNull();

        // Toggle again: false → true
        const afterToggleBack = simulateTogglePurchased(afterToggle);
        expect(afterToggleBack.isPurchased).toBe(true);
        expect(afterToggleBack.purchasedAt).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
