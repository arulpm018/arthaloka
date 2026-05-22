# Design — Wishlist Feature

## Overview

Fitur Wishlist menambahkan modul baru ke Arthaloka yang memungkinkan Arul & Fifi mencatat dan melacak barang-barang yang ingin dibeli. Item dikelompokkan dalam kategori wishlist (Hantaran Nikah, Kendaraan, Gadget, dll), masing-masing memiliki nama, harga, lokasi/link pembelian, dan status pembelian (checkbox). Progress pembelian ditampilkan per kategori dan secara keseluruhan.

### Goals
- Catat wishlist item dengan cepat via bottom sheet form
- Lihat progress pembelian per kategori dan total
- Filter berdasarkan owner (Arul/Fifi/Shared)
- Realtime sync antara kedua user
- Konsisten dengan pattern UI dan arsitektur yang sudah ada di Arthaloka

### Non-Goals (Phase 1)
- Prioritas/ranking item
- Notifikasi harga turun
- Integrasi e-commerce (scraping harga)
- Budget allocation per wishlist category
- Image/foto attachment untuk item

## Architecture

### High-Level Architecture

Wishlist mengikuti arsitektur yang sama dengan fitur existing di Arthaloka — client-side only, Firebase SDK langsung dari browser, realtime listeners untuk sync.

```
Browser (Next.js CSR) → Firebase SDK → Cloud Firestore (wishlistItems + wishlistCategories)
```

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer                                                    │
│  - WishlistPage (route: /wishlist)                          │
│  - WishlistCategorySection (grouped items)                  │
│  - WishlistItemCard (individual item)                       │
│  - WishlistItemForm (bottom sheet: add/edit)                │
│  - WishlistCategoryForm (bottom sheet: add/edit category)   │
│  - WishlistProgressSummary (overall + per-category)         │
│  - WishlistFilterBar (owner filter)                         │
├─────────────────────────────────────────────────────────────┤
│  Hook Layer                                                  │
│  - useWishlistItems() — realtime listener + CRUD            │
│  - useWishlistCategories() — realtime listener + CRUD       │
│  - useWishlistProgress() — derived progress calculations    │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (lib/firestore/wishlist*.ts)                  │
│  - wishlistItemsService — CRUD for wishlist items           │
│  - wishlistCategoriesService — CRUD for wishlist categories │
├─────────────────────────────────────────────────────────────┤
│  Validation Layer (lib/validations/wishlist*.schema.ts)      │
│  - wishlistItemSchema (Zod)                                 │
│  - wishlistCategorySchema (Zod)                             │
├─────────────────────────────────────────────────────────────┤
│  Firebase SDK (Firestore + Auth)                            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → React Hook Form (Zod validate)
           → Service function (lib/firestore/wishlist*.ts)
           → Firestore write (addDoc / updateDoc / deleteDoc)
           → onSnapshot listener fires
           → Hook state updates
           → Progress recalculated (derived)
           → Component re-renders
```

### Key Design Decisions

1. **Separate collections** (`wishlistItems`, `wishlistCategories`) — tidak reuse collection `categories` yang sudah ada karena wishlist categories punya semantik berbeda (tidak ada budget, tidak terkait transaksi).

2. **Hard delete untuk items** — berbeda dengan transactions/accounts yang soft-delete, wishlist items di-hard-delete karena tidak ada dependency (tidak mempengaruhi balance).

3. **Soft delete untuk categories** — set `isActive: false` agar items yang sudah ada tidak orphan. Items tanpa kategori aktif ditampilkan di "Lainnya".

4. **No batch writes needed** — wishlist tidak mempengaruhi account balance, jadi single document writes cukup (lebih simple dari transaction flow).

5. **Progress calculation di client** — karena jumlah items kecil (estimasi <100), progress dihitung di client dari data yang sudah di-load oleh listener. Tidak perlu Cloud Functions atau aggregation queries.

## Components and Interfaces

### Component Hierarchy

```
WishlistPage (app/(app)/wishlist/page.tsx)
├── Header (title: "Wishlist")
├── WishlistProgressSummary (overall progress bar)
├── WishlistFilterBar (owner filter: All / Arul / Fifi / Shared)
├── WishlistCategorySection[] (per active category with items)
│   ├── Category header (icon + name + category progress)
│   └── WishlistItemCard[] (per item in category)
│       ├── Checkbox (toggle purchase status)
│       ├── Item name + price
│       └── Location/link
├── WishlistEmptyState (when no items)
├── WishlistSkeleton (loading state)
├── FAB (floating action button → open add form)
├── WishlistItemForm (bottom sheet: add/edit item)
└── WishlistCategoryForm (bottom sheet: add/edit category)
```

### Key Component Interfaces

```typescript
// Page-level
interface WishlistPageProps {} // no props, uses hooks internally

// Progress
interface WishlistProgressSummaryProps {
  purchasedCount: number;
  totalCount: number;
  purchasedAmount: number;
  totalAmount: number;
}

// Filter
interface WishlistFilterBarProps {
  activeFilter: OwnerFilter;
  onChange: (filter: OwnerFilter) => void;
}
type OwnerFilter = "all" | "arul" | "fifi" | "shared";

// Category Section
interface WishlistCategorySectionProps {
  category: WishlistCategory;
  items: WishlistItem[];
  progress: CategoryProgress;
  onTogglePurchased: (item: WishlistItem) => void;
  onEditItem: (item: WishlistItem) => void;
  onEditCategory: (category: WishlistCategory) => void;
}

// Item Card
interface WishlistItemCardProps {
  item: WishlistItem;
  onTogglePurchased: () => void;
  onTap: () => void;
}

// Item Form (bottom sheet)
interface WishlistItemFormProps {
  open: boolean;
  onClose: () => void;
  editingItem?: WishlistItem | null;
  categories: WishlistCategory[];
}

// Category Form (bottom sheet)
interface WishlistCategoryFormProps {
  open: boolean;
  onClose: () => void;
  editingCategory?: WishlistCategory | null;
}
```

### Custom Hooks Interface

```typescript
// Wishlist Items — realtime listener + CRUD
useWishlistItems(): {
  items: WishlistItem[];
  isLoading: boolean;
  error: string | null;
  create: (input: CreateWishlistItemInput) => Promise<string>;
  update: (id: string, data: Partial<WishlistItem>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  togglePurchased: (item: WishlistItem) => Promise<void>;
}

// Wishlist Categories — realtime listener + CRUD
useWishlistCategories(): {
  categories: WishlistCategory[];
  isLoading: boolean;
  error: string | null;
  create: (input: CreateWishlistCategoryInput) => Promise<string>;
  update: (id: string, data: Partial<WishlistCategory>) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  isDuplicateName: (name: string, excludeId?: string) => boolean;
}

// Wishlist Progress — derived from items
useWishlistProgress(items: WishlistItem[]): {
  overall: ProgressSummary;
  byCategory: Map<string, CategoryProgress>;
}
```

### Service Layer Interface

```typescript
// lib/firestore/wishlistItems.ts
wishlistItemsService: {
  create(input: CreateWishlistItemInput): Promise<string>;
  update(id: string, data: Partial<WishlistItem>): Promise<void>;
  remove(id: string): Promise<void>;  // hard delete
  togglePurchased(item: WishlistItem): Promise<void>;
  // → sets isPurchased = !isPurchased, purchasedAt = now or null
}

// lib/firestore/wishlistCategories.ts
wishlistCategoriesService: {
  create(input: CreateWishlistCategoryInput): Promise<string>;
  update(id: string, data: Partial<WishlistCategory>): Promise<void>;
  deactivate(id: string): Promise<void>;  // soft delete: isActive = false
}
```

## Data Models

### WishlistCategory

```typescript
interface WishlistCategory {
  categoryId: string;           // auto-generated (document ID)
  name: string;                 // 1-50 chars, trimmed
  icon: string;                 // Lucide icon name
  owner: "arul" | "fifi" | "shared";
  isActive: boolean;            // false = soft deleted
  createdBy: string;            // Firebase UID
  createdAt: Timestamp;
}

type CreateWishlistCategoryInput = Omit<WishlistCategory, "categoryId" | "createdAt">;
```

### WishlistItem

```typescript
interface WishlistItem {
  itemId: string;               // auto-generated (document ID)
  nama: string;                 // 1-100 chars, item name
  harga: number;                // positive integer, 1 - 999,999,999,999 (IDR)
  lokasi: string;               // optional, max 500 chars (store name or URL)
  categoryId: string;           // reference to wishlistCategories doc
  owner: "arul" | "fifi" | "shared";
  isPurchased: boolean;         // purchase status
  purchasedAt: Timestamp | null; // set when marked purchased, cleared when unmarked
  createdBy: string;            // Firebase UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type CreateWishlistItemInput = Omit<WishlistItem, "itemId" | "createdAt" | "updatedAt" | "isPurchased" | "purchasedAt">;
```

### Derived Types

```typescript
interface ProgressSummary {
  purchasedCount: number;
  totalCount: number;
  purchasedAmount: number;      // sum of harga for purchased items
  totalAmount: number;          // sum of harga for all items
}

interface CategoryProgress extends ProgressSummary {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
}

// Grouped display structure
interface WishlistCategoryGroup {
  category: WishlistCategory;
  items: WishlistItem[];        // sorted: unpurchased first (createdAt desc), then purchased (createdAt desc)
  progress: CategoryProgress;
}
```

### Validation Schemas (Zod)

```typescript
// lib/validations/wishlistItem.schema.ts
const wishlistItemSchema = z.object({
  nama: z.string()
    .min(1, "Nama item harus diisi")
    .max(100, "Nama item maksimal 100 karakter"),
  harga: z.number()
    .int("Harga harus bilangan bulat")
    .min(1, "Harga minimal Rp 1")
    .max(999_999_999_999, "Harga maksimal Rp 999.999.999.999"),
  lokasi: z.string()
    .max(500, "Lokasi/link maksimal 500 karakter")
    .optional()
    .default(""),
  categoryId: z.string().min(1, "Kategori harus dipilih"),
  owner: z.enum(["arul", "fifi", "shared"]),
  createdBy: z.string().min(1),
});

// lib/validations/wishlistCategory.schema.ts
const wishlistCategorySchema = z.object({
  name: z.string()
    .min(1, "Nama kategori harus diisi")
    .max(50, "Nama kategori maksimal 50 karakter")
    .transform((val) => val.trim()),
  icon: z.string().min(1, "Icon harus dipilih"),
  owner: z.enum(["arul", "fifi", "shared"]),
  isActive: z.boolean().default(true),
  createdBy: z.string().min(1),
});
```

### Firestore Collections

```
/wishlistCategories/{categoryId}  → WishlistCategory documents
/wishlistItems/{itemId}           → WishlistItem documents
```

### Firestore Security Rules (additions)

```javascript
match /wishlistItems/{itemId} {
  allow read, write: if isAllowedUser();
}

match /wishlistCategories/{catId} {
  allow read, write: if isAllowedUser();
}
```

### Utility Functions

```typescript
// lib/utils/wishlist.ts

/** Check if a lokasi string is a URL (starts with http:// or https://) */
function isUrl(lokasi: string): boolean;

/** Format harga as IDR currency: "Rp 1.500.000" */
function formatHarga(harga: number): string;
// Note: reuses existing formatCurrency pattern from the app

/** Group items by category, sort within groups, exclude empty groups */
function groupItemsByCategory(
  items: WishlistItem[],
  categories: WishlistCategory[]
): WishlistCategoryGroup[];

/** Calculate progress summary from a list of items */
function calculateProgress(items: WishlistItem[]): ProgressSummary;

/** Filter items by owner */
function filterByOwner(items: WishlistItem[], owner: OwnerFilter): WishlistItem[];

/** Sort items: unpurchased first (createdAt desc), then purchased (createdAt desc) */
function sortWishlistItems(items: WishlistItem[]): WishlistItem[];

/** Check duplicate category name (case-insensitive) */
function isDuplicateCategoryName(
  name: string,
  existingCategories: WishlistCategory[],
  excludeId?: string
): boolean;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Category name validation

*For any* string input, after trimming leading/trailing whitespace, the wishlist category validation SHALL accept the name if and only if its length is between 1 and 50 characters (inclusive).

**Validates: Requirements 1.2, 1.4**

### Property 2: Category duplicate detection

*For any* two category name strings, the duplicate detection function SHALL return true if and only if the two strings are equal when compared case-insensitively (after trimming), regardless of the original casing.

**Validates: Requirements 1.3**

### Property 3: Wishlist item field validation

*For any* nama string and harga number and lokasi string, the wishlist item validation SHALL accept the input if and only if: nama is non-empty and ≤100 characters, harga is a positive integer between 1 and 999,999,999,999, and lokasi (when provided) is ≤500 characters.

**Validates: Requirements 2.2, 2.6**

### Property 4: URL detection

*For any* non-empty string, the `isUrl` function SHALL return true if and only if the string starts with "http://" or "https://" (case-sensitive prefix match).

**Validates: Requirements 2.4, 2.5**

### Property 5: Item sorting invariant

*For any* list of wishlist items with mixed `isPurchased` values and `createdAt` timestamps, after applying the sort function, all unpurchased items SHALL appear before all purchased items, and within each group items SHALL be ordered by `createdAt` descending (newest first).

**Validates: Requirements 3.3**

### Property 6: Progress summary calculation

*For any* list of wishlist items with arbitrary `isPurchased` boolean values and positive integer `harga` values, the `calculateProgress` function SHALL return a `purchasedCount` equal to the count of items where `isPurchased === true`, a `totalCount` equal to the total number of items, a `purchasedAmount` equal to the sum of `harga` of purchased items, and a `totalAmount` equal to the sum of `harga` of all items.

**Validates: Requirements 3.4, 3.5**

### Property 7: Owner filter with empty category exclusion

*For any* list of wishlist items with varying `owner` values and any active owner filter, the filter function SHALL return only items whose `owner` matches the filter, and after grouping by category, any category with zero items in the filtered result SHALL be excluded from the output.

**Validates: Requirements 3.6, 3.8**

### Property 8: Purchase status toggle round-trip

*For any* wishlist item, toggling `isPurchased` to true SHALL set `purchasedAt` to a non-null timestamp, and subsequently toggling `isPurchased` back to false SHALL clear `purchasedAt` to null, restoring the item to its original unpurchased state.

**Validates: Requirements 4.4**

## Error Handling

### Error Categories & Responses

| Category | Example | UI Response |
|----------|---------|-------------|
| Validation | Empty nama, harga = 0, lokasi > 500 chars | Inline form errors (Zod), prevent submission |
| Firestore Write | Network error, permission denied | Toast error "Gagal menyimpan. Coba lagi.", retain form data |
| Firestore Listener | Connection lost, permission error | Error message in UI, retain last loaded data |
| Optimistic Update Rollback | Toggle purchased fails | Revert checkbox + visual state, show error toast |
| Duplicate Category | Name already exists | Inline error "Nama kategori sudah digunakan" |

### Error Flow

```
Service function throws
  → Hook catches error
  → Sets error state / shows toast
  → Form retains user input (no reset on error)
  → User can retry
```

### Optimistic Update Pattern (Toggle Purchased)

```
1. User taps checkbox
2. UI immediately updates (optimistic)
3. Firestore write initiated
4. If success → done (listener confirms)
5. If failure → revert UI state + show error toast
```

### Offline Handling

- Firestore offline persistence caches wishlist data
- Read-only mode when offline (display cached data)
- Write attempts while offline will queue and sync when reconnected
- No explicit offline badge needed (follows app-wide pattern)

## Testing Strategy

### Unit Tests (Vitest)

Focus on pure utility functions:
- `isUrl()` — various URL and non-URL strings
- `sortWishlistItems()` — mixed purchased/unpurchased items
- `calculateProgress()` — various item combinations
- `filterByOwner()` — filter logic
- `groupItemsByCategory()` — grouping + empty exclusion
- `isDuplicateCategoryName()` — case-insensitive comparison
- Zod schemas — valid/invalid inputs for both item and category

### Property-Based Tests (fast-check)

Library: **fast-check** (already compatible with Vitest, no additional test runner needed)

Each property test runs minimum 100 iterations with randomly generated inputs:

- **Property 1**: Generate random strings (including whitespace-heavy), verify category name validation
- **Property 2**: Generate random string pairs with case variations, verify duplicate detection
- **Property 3**: Generate random nama/harga/lokasi combinations, verify item validation
- **Property 4**: Generate random strings (some with http/https prefix), verify URL detection
- **Property 5**: Generate random item arrays with mixed isPurchased/createdAt, verify sort order
- **Property 6**: Generate random item arrays with random harga/isPurchased, verify progress math
- **Property 7**: Generate random items with random owners, apply filter, verify exclusion
- **Property 8**: Generate random items, toggle purchased twice, verify purchasedAt cleared

Tag format: `Feature: wishlist, Property {N}: {description}`

### Component Tests (React Testing Library)

- WishlistItemForm: validation errors, submit behavior, pre-fill on edit
- WishlistItemCard: checkbox toggle, tap to edit, purchased styling
- WishlistCategorySection: items grouped correctly, progress displayed
- WishlistPage: empty state, loading skeleton, FAB opens form
- WishlistFilterBar: filter selection updates display

### Integration Tests

- Create item → appears in list via realtime listener
- Toggle purchased → progress updates
- Delete item → removed from list, progress recalculated
- Create category → appears in category picker
- Delete category with items → confirmation dialog flow

### Test Configuration

```typescript
// vitest.config.ts additions (if not already configured)
// fast-check for property-based testing
import fc from "fast-check";

// Each property test: minimum 100 runs
fc.assert(fc.property(...), { numRuns: 100 });
```
