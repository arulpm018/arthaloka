# Implementation Plan: Wishlist Feature

## Overview

Implement the Wishlist module for Arthafiloka — a feature that allows Arul & Fifi to track items they want to buy, organized by categories with progress tracking. The implementation follows the existing app architecture: TypeScript types → Zod validation → Firestore service layer → custom hooks → UI components → navigation integration.

## Tasks

- [x] 1. Set up types, validation schemas, and utility functions
  - [x] 1.1 Create TypeScript types for WishlistItem, WishlistCategory, and derived types
    - Create `src/types/wishlist.ts` with interfaces: `WishlistItem`, `WishlistCategory`, `ProgressSummary`, `CategoryProgress`, `WishlistCategoryGroup`, `CreateWishlistItemInput`, `CreateWishlistCategoryInput`, `OwnerFilter`
    - _Requirements: 1.2, 2.1, 2.2, 3.4, 3.6_

  - [x] 1.2 Create Zod validation schemas for wishlist item and category
    - Create `src/lib/validations/wishlistItem.schema.ts` with nama (1-100 chars), harga (positive int 1-999,999,999,999), lokasi (optional, max 500 chars), categoryId, owner, createdBy
    - Create `src/lib/validations/wishlistCategory.schema.ts` with name (1-50 chars, trimmed), icon, owner, isActive, createdBy
    - _Requirements: 1.2, 1.4, 2.2, 2.6_

  - [x] 1.3 Create wishlist utility functions
    - Create `src/lib/utils/wishlist.ts` with: `isUrl`, `formatHarga`, `groupItemsByCategory`, `calculateProgress`, `filterByOwner`, `sortWishlistItems`, `isDuplicateCategoryName`
    - `isUrl`: returns true if string starts with "http://" or "https://"
    - `formatHarga`: format number as IDR currency "Rp X.XXX.XXX" (reuse existing formatCurrency pattern)
    - `groupItemsByCategory`: group items by category, exclude empty groups, sort within groups
    - `calculateProgress`: return purchasedCount, totalCount, purchasedAmount, totalAmount
    - `filterByOwner`: filter items by owner, return all if filter is "all"
    - `sortWishlistItems`: unpurchased first (createdAt desc), then purchased (createdAt desc)
    - `isDuplicateCategoryName`: case-insensitive duplicate check with optional excludeId
    - _Requirements: 2.4, 2.5, 3.3, 3.4, 3.5, 3.6, 3.8, 1.3_

  - [x] 1.4 Write property tests for utility functions (Properties 1-7)
    - **Property 1: Category name validation** — generate random strings, verify category schema accepts iff trimmed length is 1-50
    - **Validates: Requirements 1.2, 1.4**
    - **Property 2: Category duplicate detection** — generate random string pairs with case variations, verify isDuplicateCategoryName
    - **Validates: Requirements 1.3**
    - **Property 3: Wishlist item field validation** — generate random nama/harga/lokasi, verify item schema acceptance
    - **Validates: Requirements 2.2, 2.6**
    - **Property 4: URL detection** — generate random strings (some with http/https prefix), verify isUrl
    - **Validates: Requirements 2.4, 2.5**
    - **Property 5: Item sorting invariant** — generate random item arrays, verify sort order (unpurchased before purchased, newest first within groups)
    - **Validates: Requirements 3.3**
    - **Property 6: Progress summary calculation** — generate random item arrays, verify calculateProgress math
    - **Validates: Requirements 3.4, 3.5**
    - **Property 7: Owner filter with empty category exclusion** — generate random items with varying owners, verify filter + grouping exclusion
    - **Validates: Requirements 3.6, 3.8**

  - [x] 1.5 Write unit tests for utility functions
    - Test `isUrl` with various URL and non-URL strings
    - Test `formatHarga` with edge cases (0, large numbers, etc.)
    - Test `sortWishlistItems` with mixed purchased/unpurchased items
    - Test `calculateProgress` with empty arrays, all purchased, none purchased
    - Test `filterByOwner` with each filter value
    - Test `groupItemsByCategory` with empty categories, inactive categories
    - Test `isDuplicateCategoryName` with case variations, excludeId
    - Test Zod schemas with valid/invalid inputs
    - _Requirements: 1.2, 1.3, 2.2, 2.4, 2.5, 2.6, 3.3, 3.4, 3.5, 3.6_

- [x] 2. Implement Firestore service layer
  - [x] 2.1 Create wishlist items Firestore service
    - Create `src/lib/firestore/wishlistItems.ts`
    - Implement `create(input)`: addDoc to "wishlistItems" collection with serverTimestamp for createdAt/updatedAt, isPurchased=false, purchasedAt=null
    - Implement `update(id, data)`: updateDoc with updatedAt serverTimestamp
    - Implement `remove(id)`: deleteDoc (hard delete)
    - Implement `togglePurchased(item)`: update isPurchased to opposite, set purchasedAt to serverTimestamp or null
    - Follow existing pattern from `src/lib/firestore/transactions.ts`
    - _Requirements: 4.1, 4.3, 4.4, 5.2, 5.5, 7.1_

  - [x] 2.2 Create wishlist categories Firestore service
    - Create `src/lib/firestore/wishlistCategories.ts`
    - Implement `create(input)`: addDoc to "wishlistCategories" collection with serverTimestamp for createdAt
    - Implement `update(id, data)`: updateDoc
    - Implement `deactivate(id)`: updateDoc with isActive=false (soft delete)
    - Follow existing pattern from `src/lib/firestore/categories.ts`
    - _Requirements: 1.2, 1.4, 1.5, 1.6, 7.2_

  - [x] 2.3 Add Firestore security rules for wishlist collections
    - Add rules for `/wishlistItems/{itemId}` — allow read, write if isAllowedUser()
    - Add rules for `/wishlistCategories/{catId}` — allow read, write if isAllowedUser()
    - Update `firestore.rules` file
    - _Requirements: 7.5_

- [x] 3. Checkpoint - Ensure types, validations, utilities, and services compile correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement custom hooks
  - [x] 4.1 Create useWishlistItems hook
    - Create `src/hooks/useWishlistItems.ts`
    - Set up onSnapshot realtime listener on "wishlistItems" collection
    - Expose: items, isLoading, error, create, update, remove, togglePurchased
    - Handle listener errors by setting error state and retaining last loaded data
    - Follow existing pattern from `src/hooks/useTransactions.ts`
    - _Requirements: 7.3, 7.6, 7.7_

  - [x] 4.2 Create useWishlistCategories hook
    - Create `src/hooks/useWishlistCategories.ts`
    - Set up onSnapshot realtime listener on "wishlistCategories" collection, filter isActive=true
    - Expose: categories, isLoading, error, create, update, deactivate, isDuplicateName
    - _Requirements: 1.1, 1.3, 7.3, 7.6_

  - [x] 4.3 Create useWishlistProgress hook
    - Create `src/hooks/useWishlistProgress.ts`
    - Accept items array, compute overall ProgressSummary and per-category CategoryProgress map
    - Use `calculateProgress` utility internally
    - _Requirements: 3.4, 3.5_

  - [x] 4.4 Write property test for purchase status toggle round-trip
    - **Property 8: Purchase status toggle round-trip**
    - Generate random items, toggle purchased twice, verify purchasedAt cleared
    - **Validates: Requirements 4.4**

- [x] 5. Implement UI components
  - [x] 5.1 Create WishlistItemCard component
    - Create `src/components/wishlist/WishlistItemCard.tsx`
    - Display: checkbox (toggle purchased), nama (with strikethrough + 50% opacity when purchased), harga (formatted), lokasi (as link if URL, plain text otherwise)
    - Handle onTogglePurchased and onTap callbacks
    - _Requirements: 3.2, 4.2, 2.4, 2.5_

  - [x] 5.2 Create WishlistCategorySection component
    - Create `src/components/wishlist/WishlistCategorySection.tsx`
    - Display: category header (icon + name + progress), list of WishlistItemCard
    - Show category progress (purchased count / total count, purchased amount / total amount)
    - _Requirements: 3.1, 3.4_

  - [x] 5.3 Create WishlistProgressSummary component
    - Create `src/components/wishlist/WishlistProgressSummary.tsx`
    - Display overall progress bar with purchased count/total and purchased amount/total amount
    - Use @radix-ui/react-progress for the progress bar
    - _Requirements: 3.5_

  - [x] 5.4 Create WishlistFilterBar component
    - Create `src/components/wishlist/WishlistFilterBar.tsx`
    - Display filter buttons: All, Arul, Fifi, Shared
    - Highlight active filter, call onChange callback
    - _Requirements: 3.6, 3.7_

  - [x] 5.5 Create WishlistItemForm bottom sheet component
    - Create `src/components/wishlist/WishlistItemForm.tsx`
    - Use Sheet (side="bottom") from shadcn/ui with max-height 85vh, rounded top corners, vertical scroll
    - Form fields: nama, harga (number input), lokasi (optional), categoryId (select from categories), owner (select: arul/fifi/shared)
    - Integrate react-hook-form + Zod resolver for validation
    - Support add mode (empty form) and edit mode (pre-filled with editingItem data)
    - Show inline validation errors, retain data on submission failure
    - Include delete button in edit mode with confirmation dialog
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8, 5.1, 5.2, 5.3, 5.4, 5.7, 6.4_

  - [x] 5.6 Create WishlistCategoryForm bottom sheet component
    - Create `src/components/wishlist/WishlistCategoryForm.tsx`
    - Use Sheet (side="bottom") for add/edit category
    - Form fields: name, icon (icon picker), owner
    - Validate duplicate name using isDuplicateName from hook
    - Support add and edit modes
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 5.7 Create WishlistEmptyState and WishlistSkeleton components
    - Create `src/components/wishlist/WishlistEmptyState.tsx` — icon, title, description, "Add item" button
    - Create `src/components/wishlist/WishlistSkeleton.tsx` — skeleton loading state matching the page layout
    - _Requirements: 6.6, 6.7_

- [x] 6. Checkpoint - Ensure all components compile and render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Assemble WishlistPage and integrate navigation
  - [x] 7.1 Create WishlistPage route
    - Create `src/app/(app)/wishlist/page.tsx`
    - Compose: Header, WishlistProgressSummary, WishlistFilterBar, WishlistCategorySection[] (mapped from grouped items), WishlistEmptyState (conditional), WishlistSkeleton (conditional), FAB, WishlistItemForm, WishlistCategoryForm
    - Wire hooks: useWishlistItems, useWishlistCategories, useWishlistProgress
    - Implement owner filter state with filterByOwner + groupItemsByCategory
    - Implement optimistic toggle for purchase status (revert on error + toast)
    - FAB positioned fixed at bottom-right (bottom 96px, right 16px)
    - Page layout: max-w-4xl mx-auto, p-4
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 3.8, 4.1, 4.5, 4.6, 6.1, 6.3, 6.5, 6.6, 6.7_

  - [x] 7.2 Add Wishlist entry to More page navigation
    - Update `src/app/(app)/more/page.tsx` to add a Wishlist menu item with Heart icon, label "Wishlist", description "Daftar barang yang ingin dibeli", and link to `/wishlist`
    - Place it in the menu items array (before Settings)
    - _Requirements: 6.2_

  - [x] 7.3 Handle category deletion with confirmation dialog
    - In WishlistPage or WishlistCategorySection, implement delete category flow
    - If category has items: show confirmation dialog warning items will become uncategorized
    - If category has no items: proceed with soft-delete directly (or with simple confirmation)
    - _Requirements: 1.5, 1.6_

- [x] 8. Final checkpoint - Ensure all tests pass and feature is complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The project uses TypeScript, Next.js App Router, Firebase/Firestore, Tailwind CSS, shadcn/ui, react-hook-form + Zod, and lucide-react icons
- Follow existing patterns from transactions/categories/accounts for service layer and hooks
- fast-check needs to be installed as a dev dependency along with vitest for testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5", "2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.7"] },
    { "id": 5, "tasks": ["5.5", "5.6"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3"] }
  ]
}
```
