# Design — Arthafiloka V2

#[[file:docs/UI_UX_CRITIQUE_V2_PLAN.md]]

## Overview

V2 adalah refactor + polish, bukan rewrite. Arsitektur tinggi tetap sama dengan V1 (Next.js 14 App Router + Firebase + Zustand + shadcn/ui). Yang berubah: konsolidasi komponen, fix UX feedback loop, surface fitur built-but-not-mounted, plus integrasi cross-feature (wishlist ↔ transactions). Tidak ada migration data wajib (semua schema change pakai optional field).

### Goals
- Hilangkan duplikasi triple sheets (~600 LOC saved)
- Hilangkan silent submit failures
- Fix mobile delete pattern (long-press menu)
- Wujudkan Berdua tabs sesuai spec V1
- Konsisten brand & shared label

### Non-Goals
- Tidak menambah fitur core baru (cuma cross-feature integration)
- Tidak menyentuh auth flow (Google whitelist tetap)
- Tidak migrate data Firestore yang sudah ada
- Tidak deploy v2 sebelum manual test mobile delete pass

---

## Architecture

V2 adalah refactor + polish, bukan rewrite. Arsitektur tinggi tetap sama dengan V1 (Next.js 14 App Router + Firebase + Zustand + shadcn/ui). Yang berubah: konsolidasi komponen, fix UX feedback loop, surface fitur built-but-not-mounted, plus integrasi cross-feature (wishlist ↔ transactions). Tidak ada migration data wajib (semua schema change pakai optional field).

### Layering

V2 hanya tambah/refactor di UI + state layer. Service layer (`lib/firestore/*.ts`) hampir tidak berubah kecuali:
- Tambah `lib/firestore/users.ts` (extract direct `updateDoc` dari settings).
- Extract pure helper `computeTransferDeltas`, `computeBalanceDelta` untuk testability.

```
┌─────────────────────────────────────────────────┐
│  UI Layer (changes ~~~~)                        │
│  - TransactionSheet polymorphic (NEW)            │
│  - OwnerOverview (NEW, replaces 3 pages)         │
│  - SpendingDonutMini (NEW)                       │
│  - DeleteTransactionDialog (NEW, extracted)      │
│  - TransactionItemActions (NEW, long-press menu) │
│  - PacarTab/TabunganTab/InvestasiTab (NEW)       │
├─────────────────────────────────────────────────┤
│  State Layer (changes ~~)                       │
│  - useAppStore: tambah hideBalance state         │
├─────────────────────────────────────────────────┤
│  Hook Layer (changes ~~)                        │
│  - useLongPress (NEW)                            │
│  - useTransactions: tambah loadMore + cursor     │
├─────────────────────────────────────────────────┤
│  Service Layer (changes ~)                      │
│  - lib/firestore/users.ts (NEW)                  │
│  - computeTransferDeltas extracted (pure)        │
│  - computeBalanceDelta extracted (pure)          │
├─────────────────────────────────────────────────┤
│  Schema/Types (changes ~)                       │
│  - Account: + savingTarget?, targetDate?         │
│  - WishlistItem: + linkedTransactionId?          │
│  - constants/labels.ts (NEW)                     │
└─────────────────────────────────────────────────┘
```

---

## Data Models

V2 hanya extend 2 schema dengan field optional, no breaking change:

### Account (extension)

```typescript
// src/types/account.ts
export interface Account {
  // ... existing V1 fields (accountId, name, type, owner, balance, etc.)
  savingTarget?: number;     // NEW (V2): target IDR amount, only meaningful for type="savings"
  targetDate?: Timestamp;    // NEW (V2): optional target completion date for savings
}
```

Fields hanya rendered di UI kalau `account.type === "savings"`. Existing accounts tanpa field tetap valid (undefined → "no target").

### WishlistItem (extension)

```typescript
// src/types/wishlist.ts
export interface WishlistItem {
  // ... existing V1 fields (itemId, nama, harga, owner, isPurchased, etc.)
  linkedTransactionId?: string; // NEW (V2): set saat user "Tandai dibeli + catat expense"
}
```

Saat un-purchase, field di-reset ke null/undefined. Linked transaction tidak auto-deleted (user manage manually di transactions page).

### AppStore (extension)

```typescript
// src/store/useAppStore.ts
interface AppStore {
  // ... existing
  hideBalance: boolean;             // NEW (V2): persisted to localStorage
  prefillData: Partial<TransactionFormValues> | null;  // NEW (V2): for wishlist→tx flow
  prefillSource: { type: "wishlist"; itemId: string } | null; // NEW (V2): track source
  setHideBalance: (hide: boolean) => void;
  openSheetWithPrefill: (type, prefillData, source) => void;
}
```

Hanya `hideBalance` yang di-persist; `prefillData`/`prefillSource` ephemeral (cleared on `closeSheet`).

### Constants (new module)

```typescript
// src/lib/constants/labels.ts
export const OWNER_LABELS: Record<Owner, string> = {
  arul: "Arul",
  fifi: "Fifi",
  shared: "Bareng",  // ← display label untuk owner="shared"
};

export const OWNER_COLORS: Record<Owner, string> = {
  arul: "#2383E2",   // blue
  fifi: "#E255A1",   // pink
  shared: "#9B59B6", // purple
};
```

Tidak ada Firestore data churn — `owner` field tetap stored as `"shared"`.

---

## Correctness Properties

V2 memperkenalkan beberapa pure helper yang harus memenuhi invariant berikut:

### Property 1: Balance Delta Sign Correctness
**Validates: Requirements 12.4**

For `computeBalanceDelta(type, amount)`:
- `amount > 0 ∧ type === "expense"` ⇒ result `< 0` (always negative)
- `amount > 0 ∧ type === "income"` ⇒ result `> 0` (always positive)
- `amount === 0` ⇒ result `=== 0`

### Property 2: Transfer Zero-Sum Invariant
**Validates: Requirements 12.3**

For `computeTransferDeltas(oldTransfer, newInput)`:
- Sum of all deltas in returned Map = 0 (transfers conserve total balance across affected accounts).
- Same `fromAccountId` + same `amount` (no-op edit): delta for that account = 0 (stripped from result).
- Different `fromAccountId` between old and new: at least 2 non-zero deltas (one per side affected).

### Property 3: Long-Press Cancellation Distance
**Validates: Requirements 12.5**

For `shouldCancelLongPress(start, current, threshold)`:
- `Math.hypot(current.x - start.x, current.y - start.y) > threshold` ⇔ result `=== true`.
- Identity move (start == current): result `=== false`.
- Symmetric: swapping `start` and `current` returns same result.

### Property 4: Submit Feedback Atomicity
**Validates: Requirements 3.1, 3.2, 3.3**

Untuk semua mutation di sheet:
- Either: write succeeds → toast.success fired → sheet closed (idempotent — reentry safe).
- Or: write fails → toast.error fired → sheet stays open dengan form state preserved.
- No path: write attempted → sheet closed → no toast (the silent-fail trap V1 has).

### Property 5: Owner Label Display Consistency
**Validates: Requirements 1.2, 1.4**

For all UI components rendering owner label:
- Display text === `OWNER_LABELS[owner]`.
- No hardcoded "Berdua" / "Together" / "Bersama" / "shared" string in rendered text.
- Database value tetap `"shared"` (not affected by display label change).

### Property 6: Schema Backward Compatibility
**Validates: Requirements 7.1, 9.1**

For Account & WishlistItem:
- Documents tanpa `savingTarget` / `targetDate` / `linkedTransactionId` tetap valid (no migration required).
- Zod schema accepts both undefined dan typed value.
- UI handles undefined gracefully (e.g., savings tab shows progress=0 kalau no target).

---

## Components and Interfaces

Detail komponen di-spread di section sebelumnya (numbered 1-13 di "Components and Interfaces" detail block). Untuk reference cepat, berikut daftar komponen yang dibikin/diubah di V2:

### Komponen Baru
- `src/lib/constants/labels.ts` — `OWNER_LABELS`, `OWNER_COLORS` constants.
- `src/hooks/useLongPress.ts` — long-press gesture hook + `shouldCancelLongPress` pure helper.
- `src/components/transactions/TransactionSheet.tsx` — polymorphic sheet untuk expense+income mode.
- `src/components/transactions/DeleteTransactionDialog.tsx` — reusable delete confirmation.
- `src/components/transactions/DeleteTransferDialog.tsx` — reusable delete confirmation untuk transfer.
- `src/components/transactions/TransactionItemActions.tsx` — long-press dropdown menu (Edit/Hapus).
- `src/components/dashboard/OwnerOverview.tsx` — shared component untuk 3 owner pages.
- `src/components/dashboard/SpendingDonutMini.tsx` — Recharts donut chart top 5 categories.
- `src/components/together/PacarTab.tsx` — Bareng tab "Pacaran".
- `src/components/together/TabunganTab.tsx` — Bareng tab "Tabungan" dengan progress bar.
- `src/components/together/InvestasiTab.tsx` — Bareng tab "Investasi" dengan total aggregated.
- `src/lib/firestore/users.ts` — Service untuk user preferences updates.
- `src/lib/firestore/helpers.ts` — Pure helpers `computeBalanceDelta`, `computeTransferDeltas`.

### Komponen Yang Dihapus
- `src/components/transactions/ExpenseSheet.tsx` — replaced by `TransactionSheet mode="expense"`.
- `src/components/transactions/IncomeSheet.tsx` — replaced by `TransactionSheet mode="income"`.
- `src/components/shared/OwnerBadge.tsx` — dead code.
- `src/components/shared/PageTransition.tsx` — dead code.
- `src/app/(app)/berdua/` — folder kosong legacy.

### Komponen Yang Diperluas
- `src/components/shared/AmountInput.tsx` — tambah prop `prefix?: string`.
- `src/components/layout/Header.tsx` — tambah prop `ownerColor?: string`.
- `src/components/transactions/TransactionItem.tsx` — replace `onContextMenu` dengan `useLongPress`.
- `src/components/transactions/TransferItem.tsx` — same long-press pattern.
- `src/components/wishlist/WishlistItemCard.tsx` — same + opt-in expense flow.
- `src/components/accounts/AccountForm.tsx` — color palette 16 warna, conditional savings fields.
- `src/components/transactions/TransferSheet.tsx` — submit pattern fix, pakai DeleteTransferDialog.
- `src/components/dashboard/SummaryCards.tsx` — apply global hideBalance state.
- `src/store/useAppStore.ts` — tambah `hideBalance`, `prefillData`, `prefillSource`.
- `src/hooks/useTransactions.ts` — cursor pagination + `loadMore` + `hasMore`.

### Komponen Yang Dipindah ke Tipis Wrapper
- `src/app/(app)/arul/page.tsx` — `<OwnerOverview owner="arul" />`.
- `src/app/(app)/fifi/page.tsx` — `<OwnerOverview owner="fifi" />`.
- `src/app/(app)/together/page.tsx` — replaced dengan tabbed implementation (3 tabs).

---



### 1. `OWNER_LABELS` constants

```typescript
// src/lib/constants/labels.ts
import { Owner } from "@/types";

export const OWNER_LABELS: Record<Owner, string> = {
  arul: "Arul",
  fifi: "Fifi",
  shared: "Bareng",  // ← display label untuk owner="shared"
};

export const OWNER_COLORS: Record<Owner, string> = {
  arul: "#2383E2",   // blue
  fifi: "#E255A1",   // pink
  shared: "#9B59B6", // purple
};
```

Semua component yang display owner label baca dari sini.

### 2. `useLongPress` hook

```typescript
// src/hooks/useLongPress.ts
interface UseLongPressOptions {
  onLongPress: () => void;
  onTap?: () => void;
  durationMs?: number;     // default 400
  moveThresholdPx?: number; // default 10
}

interface UseLongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  onContextMenu: (e: React.MouseEvent) => void; // desktop right-click → trigger long-press
}

export function useLongPress(options: UseLongPressOptions): UseLongPressHandlers;
```

Behavior:
- Pointer down → start timer.
- If pointer move > threshold → cancel timer.
- If pointer up before timer → fire `onTap` (if provided).
- If timer fires (pointer still down + not moved) → vibrate(8) + `onLongPress`.
- Right-click also fires `onLongPress` (desktop fallback).

Pure helper for testability:
```typescript
export function shouldCancelLongPress(
  start: { x: number; y: number },
  current: { x: number; y: number },
  threshold: number
): boolean {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  return Math.hypot(dx, dy) > threshold;
}
```

### 3. `TransactionSheet` polymorphic

```typescript
// src/components/transactions/TransactionSheet.tsx
type TransactionMode = "expense" | "income";

interface TransactionSheetProps {
  mode: TransactionMode;
}

export const TransactionSheet = ({ mode }: TransactionSheetProps) => {
  // Reads activeSheet from Zustand, opens iff matches mode.
  // Configures: title, button color, category filter, account label.
  // Submit: await service → toast.success → closeSheet (or toast.error + stay open).
};
```

Configuration constants inside component:
```typescript
const MODE_CONFIG: Record<TransactionMode, {
  title: { create: string; edit: string };
  buttonClass: string;
  buttonLabel: { create: string; edit: string };
  accountLabel: string;
  categoryFilterTypes: ReadonlyArray<"expense" | "income" | "both">;
  successMessage: { create: string; edit: string };
  defaultType: "expense" | "income";
}> = {
  expense: {
    title: { create: "Tambah Pengeluaran", edit: "Edit Pengeluaran" },
    buttonClass: "",
    buttonLabel: { create: "Simpan Pengeluaran", edit: "Simpan Perubahan" },
    accountLabel: "Akun",
    categoryFilterTypes: ["expense", "both"],
    successMessage: { create: "Pengeluaran tersimpan", edit: "Perubahan tersimpan" },
    defaultType: "expense",
  },
  income: {
    title: { create: "Tambah Pemasukan", edit: "Edit Pemasukan" },
    buttonClass: "bg-income hover:bg-income/90 text-white",
    buttonLabel: { create: "Simpan Pemasukan", edit: "Simpan Perubahan" },
    accountLabel: "Ke Akun",
    categoryFilterTypes: ["income", "both"],
    successMessage: { create: "Pemasukan tersimpan", edit: "Perubahan tersimpan" },
    defaultType: "income",
  },
};
```

### 4. `DeleteTransactionDialog` & `DeleteTransferDialog`

```typescript
// src/components/transactions/DeleteTransactionDialog.tsx
interface DeleteTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  transactionName: string;
  isLoading: boolean;
}
```

Reused by TransactionSheet + TransactionItemActions. Same for transfer variant (different description).

### 5. `TransactionItemActions` long-press menu

```typescript
// src/components/transactions/TransactionItemActions.tsx
interface TransactionItemActionsProps {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  triggerRect?: DOMRect; // for positioning, optional
}
```

Renders shadcn `DropdownMenu` (or `Popover`) with items:
- ✏ Edit
- 🗑 Hapus  
- ❌ Batal

### 6. `OwnerOverview` shared component

```typescript
// src/components/dashboard/OwnerOverview.tsx
interface OwnerOverviewProps {
  owner: Owner;
}

export const OwnerOverview = ({ owner }: OwnerOverviewProps) => {
  // All state + hooks + render that used to be duplicated in 3 owner pages.
};
```

The 3 page files become:
```typescript
// src/app/(app)/arul/page.tsx
import { OwnerOverview } from "@/components/dashboard/OwnerOverview";
export default function ArulPage() {
  return <OwnerOverview owner="arul" />;
}
```

### 7. `SpendingDonutMini`

```typescript
// src/components/dashboard/SpendingDonutMini.tsx
interface SpendingDonutMiniProps {
  budgets: BudgetStatus[]; // already sorted/computed
}
```

- Compute: top 5 categories by spent, sisanya jadi "Lainnya".
- Render Recharts `<PieChart><Pie innerRadius outerRadius>`.
- Legend: list with color dot + name + amount.
- Mobile: legend di bawah; desktop: legend di kanan.

Loaded via `next/dynamic`:
```typescript
// dashboard/page.tsx
const SpendingDonutMini = dynamic(
  () => import("@/components/dashboard/SpendingDonutMini").then(m => m.SpendingDonutMini),
  { ssr: false, loading: () => <DonutSkeleton /> }
);
```

### 8. Berdua Tabs

```typescript
// src/app/(app)/together/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PacarTab } from "@/components/together/PacarTab";
import { TabunganTab } from "@/components/together/TabunganTab";
import { InvestasiTab } from "@/components/together/InvestasiTab";

export default function TogetherPage() {
  return (
    <>
      <Header title="Bareng">
        <MonthPicker ... />
      </Header>
      <Tabs defaultValue="pacaran">
        <TabsList>
          <TabsTrigger value="pacaran">Pacaran</TabsTrigger>
          <TabsTrigger value="tabungan">Tabungan</TabsTrigger>
          <TabsTrigger value="investasi">Investasi</TabsTrigger>
        </TabsList>
        <TabsContent value="pacaran"><PacarTab /></TabsContent>
        <TabsContent value="tabungan"><TabunganTab /></TabsContent>
        <TabsContent value="investasi"><InvestasiTab /></TabsContent>
      </Tabs>
      <FAB ... />
      <ActionSheet ... />
    </>
  );
}
```

Each tab fetches accounts filtered by `type` AND `owner === "shared"`.

`TabunganTab` shows progress bar:
```typescript
const progress = account.savingTarget
  ? Math.min((account.balance / account.savingTarget) * 100, 100)
  : 0;
```

### 9. Pure helpers extracted

```typescript
// src/lib/firestore/helpers.ts
export function computeBalanceDelta(
  type: "expense" | "income",
  amount: number
): number {
  return type === "expense" ? -amount : amount;
}

export interface ComputedTransferDeltas {
  deltas: Map<string, number>; // accountId → delta
}

export function computeTransferDeltas(
  oldTransfer: Pick<Transfer, "fromAccountId" | "toAccountId" | "amount">,
  newInput: Pick<CreateTransferInput, "fromAccountId" | "toAccountId" | "amount">
): ComputedTransferDeltas {
  const deltas = new Map<string, number>();
  const add = (id: string, d: number) => deltas.set(id, (deltas.get(id) ?? 0) + d);
  
  // Reverse old
  add(oldTransfer.fromAccountId, oldTransfer.amount);
  add(oldTransfer.toAccountId, -oldTransfer.amount);
  // Apply new
  add(newInput.fromAccountId, -newInput.amount);
  add(newInput.toAccountId, newInput.amount);
  
  // Strip zero deltas
  for (const [id, d] of deltas) {
    if (d === 0) deltas.delete(id);
  }
  
  return { deltas };
}
```

`transactionsService` and `transfersService` import these helpers. Tests target the pure functions.

### 10. `useTransactions` cursor pagination

```typescript
// src/hooks/useTransactions.ts
interface UseTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  remove: (tx: Transaction) => Promise<void>;
}

export function useTransactions(filters: TxFilters): UseTransactionsResult;
```

Implementation strategy:
- State: `transactions`, `lastDoc` (DocumentSnapshot), `hasMore`.
- Initial query: `limit(20)` with realtime onSnapshot.
- `loadMore()`: fire one-time `getDocs` with `startAfter(lastDoc).limit(20)`, append result, update `lastDoc`.
- `hasMore = result.docs.length === 20`.
- Filter changes invalidate cursor (reset to page 1).

### 11. AppStore additions

```typescript
// src/store/useAppStore.ts
interface AppStore {
  // ... existing
  hideBalance: boolean;
  setHideBalance: (hide: boolean) => void;
}
```

Persist to localStorage on change (manual `useEffect` in Provider, or use Zustand `persist` middleware if simpler).

### 12. Schema extensions

```typescript
// src/types/account.ts
export interface Account {
  // ... existing
  savingTarget?: number;     // NEW: target IDR for savings type
  targetDate?: Timestamp;    // NEW: target date for savings type
}

// src/lib/validations/account.schema.ts
export const accountSchema = z.object({
  // ... existing
  savingTarget: z.number().int().min(0).optional(),
  targetDate: z.any().optional(), // Timestamp
});
```

```typescript
// src/types/wishlist.ts
export interface WishlistItem {
  // ... existing
  linkedTransactionId?: string; // NEW: link to created expense
}
```

### 13. AmountInput extension

```typescript
interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  autoFocus?: boolean;
  className?: string;
  prefix?: string; // NEW: default "Rp", pass "" to hide
}
```

When `prefix === ""`, no prefix label rendered, padding adjusted to `pl-3`.

---

## Data Flow Changes

### Submit Transaction (Critical Fix)

**Before V2 (broken):**
```
User submit → setSubmitError(null) → closeSheet() → service.create()
                                                  ↓ fail silently
                                            console.error only
```

**After V2:**
```
User submit → service.create() → success: toast.success + closeSheet
                              ↓ failure: toast.error + sheet stays open
```

### Long-Press Delete

**Before V2:**
```
User long-press (mobile) → no event → user stuck → must open edit sheet → scroll → delete → confirm (5+ taps)
```

**After V2:**
```
User long-press → useLongPress fires → vibrate → TransactionItemActions menu opens →
  Edit: open TransactionSheet for editing
  Delete: open DeleteTransactionDialog → confirm → service.delete → toast
  Cancel: close menu (1 tap to dismiss)
```

### Wishlist Mark Purchased + Catat Expense

```
User toggle purchase (false → true) →
  WishlistItemCard shows DropdownMenu:
    "Tandai sudah dibeli" → service.togglePurchased only
    "Tandai sudah dibeli + catat pengeluaran" →
       1. Open TransactionSheet pre-filled
       2. On submit, capture transactionId
       3. Service: togglePurchased + update linkedTransactionId
       4. Toast success
```

---

## Migration Strategy

V2 tidak perlu migrate data Firestore — semua schema change pakai optional fields.

**Account.savingTarget**: existing accounts tanpa field tetap valid. UI handles `undefined` as "no target".

**WishlistItem.linkedTransactionId**: same — optional.

**Owner label `"shared"` → display "Bareng"**: hanya display layer, value Firestore tetap `"shared"`.

**Brand rename "Arthaloka" → "Arthafiloka"**: hanya text di UI/docs, no data churn.

---

## Error Handling

Adopt unified pattern di semua mutations:
```typescript
try {
  await service.action(data);
  toast.success("...");
  closeSheet();
} catch (error) {
  console.error("...", error);
  toast.error("Gagal menyimpan. Coba lagi.");
  // Sheet stays open with form state preserved
}
```

For pagination (`loadMore`), errors don't block UI — just log + toast warning, retain existing data.

---

## Testing Strategy

### Pure Function Tests (Vitest)
- `computeBalanceDelta(type, amount)` — sign correctness
- `computeTransferDeltas(old, new)` — merging logic, zero stripping
- `shouldCancelLongPress(start, current, threshold)` — distance check
- `formatCurrency`, `formatDate` — edge cases

### Property-Based Tests (fast-check)
- `computeTransferDeltas`: invariant — sum of all deltas always = 0 (zero-sum transfer)
- `computeBalanceDelta`: amount > 0 ∧ type=expense ⇒ delta < 0; type=income ⇒ delta > 0

### Component Tests (manual smoke + future RTL)
- TransactionSheet mode="expense" submits correctly
- TransactionSheet mode="income" submits correctly
- TransactionItemActions: long-press → menu open → Edit/Delete fires correct callback
- Owner pages render via OwnerOverview wrapper

### Manual Test Checklist
- [ ] iOS Safari long-press transaction list → menu muncul
- [ ] Android Chrome long-press → menu muncul + haptic
- [ ] Desktop right-click → menu muncul
- [ ] Tap (not hold) → still opens edit sheet (existing behaviour)
- [ ] Submit transaction offline → toast shows, sheet stays
- [ ] Submit transaction online → toast success, sheet closes
- [ ] Berdua page tabs all 3 tabs render correct accounts
- [ ] Hide balance toggle → all amounts replaced with bullets
- [ ] Wishlist mark purchased → dropdown opens dengan 2 opsi

---

## Rollout Plan

1. Sprint 1-3 sequential — foundation, dashboard, sheet refactor.
2. Sprint 4-6 parallel possible (delete pattern + owner pages independent of pagination).
3. Sprint 7 (Berdua tabs + wishlist integration) depends on sheet refactor.
4. Sprint 8 (settings + tech debt) bisa dikerjakan opportunistic kapan saja.
5. Sprint 9 (testing + a11y) di akhir sebelum sign-off.
6. Branch strategy: `feature/v2-{sprint-num}-{topic}` → PR ke `main` setelah sprint deliverable lengkap.
7. No Firestore rules change. No production deploy gate kecuali manual mobile test pass.

---

*Reference: `docs/UI_UX_CRITIQUE_V2_PLAN.md` for detailed critique and rationale.*
