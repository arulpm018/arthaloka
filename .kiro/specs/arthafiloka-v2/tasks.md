# Implementation Plan: Arthafiloka V2

## Overview

V2 adalah refactor + polish dari V1. Tasks dibagi jadi 9 sprint, masing-masing punya theme jelas. Tasks atomic dengan acceptance criteria yang dapat dieksekusi oleh sub-agent. Setiap task referensi requirement (`AC*.*`) untuk traceability.

Reference: `docs/UI_UX_CRITIQUE_V2_PLAN.md` (kritik), `requirements.md` (acceptance criteria), `design.md` (komponen + data flow).

**Konvensi**:
- Setiap leaf task atomic — bisa diselesaikan tanpa dependency ke leaf lain di sprint sama (kecuali declared).
- Untuk file rename / replace, pastikan import path tetap valid setelah perubahan.
- Setelah perubahan kode, jalankan `npm run lint` dan `npm run build` untuk validasi syntax/type. Tidak perlu jalanin app secara live.
- Test command: `npm test` (vitest).

## Tasks

- [x] 1. Sprint 1 — Foundation Cleanup
  - [x] 1.1 Buat constants untuk owner labels & colors
    - Buat `src/lib/constants/labels.ts` exporting `OWNER_LABELS: Record<Owner, string> = { arul: "Arul", fifi: "Fifi", shared: "Bareng" }` dan `OWNER_COLORS: Record<Owner, string> = { arul: "#2383E2", fifi: "#E255A1", shared: "#9B59B6" }`.
    - Type `Owner` import dari `@/types`.
    - Tidak ada usage replacement di task ini — hanya bikin constants. Replacement done in 1.2.
    - _Requirements: AC1.4_

  - [x] 1.2 Replace hardcoded owner labels dengan constants di seluruh UI
    - Audit semua hardcoded "Berdua", "Together", "Bersama" di display text via grep: `rg "Berdua|Together|Bersama" --type tsx --type ts src/`.
    - Replace dengan import dari `OWNER_LABELS["shared"]` dimana label dipakai untuk display owner (bukan untuk route path).
    - Files yang perlu di-update (minimum): `BottomNav.tsx`, `Sidebar.tsx`, `AccountList.tsx`, `AccountForm.tsx`, `AccountDetailSheet.tsx`, `CategoryList.tsx`, `CategoryForm.tsx`, `TransactionFilters.tsx`, `TransferSheet.tsx` (`getOwnerLabel`), `WishlistItemForm.tsx` (ownerOptions), `WishlistFilterBar.tsx`, `categories/page.tsx` (scopeTabs), `SummaryCards.tsx` (ownerLabels).
    - Route paths `/together` tetap dipakai. Hanya display text yang berubah.
    - Verify: `npm run build` pass, no broken text.
    - _Requirements: AC1.2, AC1.4_

  - [x] 1.3 Hapus folder kosong `src/app/(app)/berdua/`
    - Verify folder kosong via list_directory.
    - Hapus folder.
    - Verify no Next.js route registration error via `npm run build`.
    - _Requirements: AC1.3_

  - [x] 1.4 Hapus dead components
    - Verify no import via grep:
      - `rg "OwnerBadge" src/`
      - `rg "PageTransition" src/`
    - Kalau result kosong (selain definition file), hapus:
      - `src/components/shared/OwnerBadge.tsx`
      - `src/components/shared/PageTransition.tsx`
    - _Requirements: AC11.1_

  - [x] 1.5 Update brand "Arthaloka" → "Arthafiloka" di semua docs & UI
    - Audit: `rg "Arthaloka" --type md --type tsx --type ts --type json`.
    - Update files:
      - `plan.md` — replace brand throughout.
      - `docs/ANDROID_SYSTEM_DESIGN.md` — replace "Arthaloka" jadi "Arthafiloka".
      - `.kiro/steering/arthaloka-context.md` → rename file ke `arthafiloka-context.md` + update content.
      - `.kiro/specs/arthaloka/design.md` — sync brand.
      - Login page subcopy kalau ada.
    - JANGAN rename `.kiro/specs/arthaloka/` directory (preserve history).
    - JANGAN ubah Firestore collection names atau project IDs.
    - _Requirements: AC1.1, AC1.6, AC1.7_

  - [x] 1.6 Update README.md dari boilerplate ke project description
    - Replace content dengan: tagline (Arthafiloka — couple finance tracker), setup steps (`npm install`, `.env.local` config, `firebase login`, `npm run dev`), scripts table, tech stack list (Next.js 14, React 18, Firebase, Tailwind, shadcn/ui, Zustand, RHF+Zod), link ke `plan.md` dan `docs/UI_UX_CRITIQUE_V2_PLAN.md`, dan note "Private app for Arul & Fifi".
    - _Requirements: AC1.5_

  - [x] 1.7 Hapus custom CSS variables redundan di `globals.css`
    - Identify yang TIDAK dipakai via grep di codebase:
      - `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-hover`
      - `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`
      - `--border-default`, `--border-strong`
      - `--shadow-sm`, `--shadow-md`, `--shadow-sheet` (kecuali dipakai)
    - Test command: `rg "var\(--bg-primary\)|var\(--text-secondary\)|..." src/`.
    - Hapus yang tidak dipakai dari `:root` block dan `.dark` block.
    - Keep: `--color-income`, `--color-expense`, `--color-transfer`, `--color-warning`, `--color-info`, `--color-arul`, `--color-fifi`, `--color-shared` kalau dipakai (verify di tailwind.config.ts).
    - Verify: theme switching tetap work via manual test.
    - _Requirements: AC11.4_

  - [x] 1.8 Update steering docs: replace ghost tokens dengan shadcn standard
    - Update `.kiro/steering/component-patterns.md`:
      - Replace `bg-secondary`, `text-secondary`, `bg-tertiary`, `text-muted` (yang reference custom CSS var) dengan shadcn standard: `bg-card`, `text-muted-foreground`, `border-border`.
      - Sync code examples dengan reality di project (ExpenseSheet pattern, TransactionItem layout, dll).
    - Update `.kiro/steering/coding-standards.md` kalau reference token sama.
    - _Requirements: AC11.7_

  - [x] 1.9 Audit `tsconfig.json`: enable strictness flags
    - Tambah ke `compilerOptions`: `"noUnusedLocals": true`, `"noUnusedParameters": true`.
    - Run `npm run build` — fix resulting errors (kemungkinan unused imports / params).
    - Don't suppress with `_` underscore unless intentional callback signature.
    - Commit hanya kalau build pass.
    - _Requirements: AC11.5_

- [x] 2. Sprint 2 — Dashboard Completeness
  - [x] 2.1 Mount `BudgetAlerts` di dashboard
    - Edit `src/app/(app)/dashboard/page.tsx`:
      - Import `BudgetAlerts` dari `@/components/dashboard/BudgetAlerts`.
      - Render `<BudgetAlerts budgets={budgets} />` antara `<SummaryCards />` dan `<SpendingByCategory />`.
    - Component sendiri tidak butuh perubahan — sudah filter `warning|over` internally dan return null kalau kosong.
    - _Requirements: AC2.1_

  - [x] 2.2 Bikin `SpendingDonutMini` component
    - Buat `src/components/dashboard/SpendingDonutMini.tsx`.
    - Props: `{ budgets: BudgetStatus[] }`.
    - Logic: filter `b.spent > 0`, sort descending by `spent`, top 5 stay, sisanya aggregate jadi `{ name: "Lainnya", amount: sum }`.
    - Render Recharts `PieChart` + `Pie` (innerRadius 50, outerRadius 80, cy=120, height 200).
    - Color: pakai palette tetap (e.g., `["#3b82f6", "#ec4899", "#a855f7", "#10b981", "#f59e0b", "#94a3b8"]`).
    - Legend: list kanan (md+) atau bawah (mobile) dengan dot color + name + formatted amount.
    - Return null kalau `budgets.filter(b => b.spent > 0).length === 0`.
    - _Requirements: AC2.2_

  - [x] 2.3 Dynamic import donut di dashboard + skeleton
    - Edit `src/app/(app)/dashboard/page.tsx`:
      - Import `dynamic` dari `next/dynamic`.
      - `const SpendingDonutMini = dynamic(() => import("@/components/dashboard/SpendingDonutMini").then(m => ({ default: m.SpendingDonutMini })), { ssr: false, loading: () => <DonutSkeleton /> })`.
      - Bikin `DonutSkeleton` inline atau di `LoadingState` variant: circle 160px gray pulse + 5 lines legend.
      - Render `<SpendingDonutMini budgets={budgets} />` di atas `<SpendingByCategory budgets={budgets} />`.
    - _Requirements: AC2.3, AC2.4_

  - [x] 2.4 Tambah owner color indicator di Header untuk owner pages
    - Edit `src/components/layout/Header.tsx`:
      - Tambah optional prop `ownerColor?: string`.
      - Render colored dot kecil (`<span className="h-2 w-2 rounded-full" style={{ backgroundColor: ownerColor }} />`) sebelum `<h1>` kalau prop ada.
      - Optional: tambah border-bottom-color tinted via inline style.
    - Saat ini owner pages render Header langsung. Akan di-pass via `OwnerOverview` di Sprint 4. Untuk sekarang, hanya extend Header API — tidak perlu wire ke pages dulu.
    - _Requirements: AC2.5_

- [x] 3. Sprint 3 — Submit UX Fix & Sheet Refactor (Critical)
  - [x] 3.1 Bikin `<DeleteTransactionDialog />` reusable
    - Buat `src/components/transactions/DeleteTransactionDialog.tsx`.
    - Props: `{ open: boolean; onClose: () => void; onConfirm: () => Promise<void> | void; transactionName: string; isLoading: boolean }`.
    - Render shadcn Dialog dengan: title "Hapus Transaksi", description "Yakin ingin menghapus transaksi <strong>{name}</strong>? Saldo akun akan dikembalikan. Aksi ini tidak bisa dibatalkan.", footer "Batal" + "Hapus" (variant destructive, disabled saat loading, label "Menghapus..." saat loading).
    - Component pure presentational — no Firestore call inside.
    - _Requirements: AC4.1_

  - [x] 3.2 Bikin `<DeleteTransferDialog />` reusable
    - Buat `src/components/transactions/DeleteTransferDialog.tsx`.
    - Props sama dengan DeleteTransactionDialog: `{ open, onClose, onConfirm, transferName, isLoading }`.
    - Description berbeda: "Yakin ingin menghapus transfer <strong>{name}</strong>? Saldo kedua akun akan dikembalikan. Aksi ini tidak bisa dibatalkan."
    - Title: "Hapus Transfer".
    - _Requirements: AC4.2_

  - [x] 3.3 Bikin `TransactionSheet` polymorphic
    - Buat `src/components/transactions/TransactionSheet.tsx`.
    - Props: `{ mode: "expense" | "income" }`.
    - Define `MODE_CONFIG` constant in-file (lihat `design.md` section 3 untuk struktur lengkap).
    - Reads `activeSheet`, `closeSheet`, `editingTransaction`, `currentUser`, `defaultOwner` dari Zustand.
    - `isOpen = activeSheet === mode`.
    - `isEditing = !!editingTransaction && editingTransaction.type === mode`.
    - Form fields identical dengan ExpenseSheet (amount, name, category, owner, account, date, note) — pakai `MODE_CONFIG[mode]` untuk title, button class, label, category filter, success toast message.
    - **Submit pattern (CRITICAL fix per AC3)**:
      ```
      try {
        await service.create/update(...);
        toast.success(MODE_CONFIG[mode].successMessage[isEditing ? "edit" : "create"]);
        closeSheet();
      } catch (error) {
        console.error(...);
        toast.error("Gagal menyimpan. Coba lagi.");
        // Sheet stays open
      }
      ```
    - Pakai `<DeleteTransactionDialog />` (replaces inline dialog).
    - Account reset on owner change: tambah `useEffect([selectedOwner])` yang clear `accountId` kalau current account.owner ≠ selectedOwner.
    - Hapus `submitError` & `submitSuccess` lokal state — replaced dengan toast.
    - Test: `npm run build` pass, tidak ada compile error.
    - _Requirements: AC3.1, AC3.2, AC3.3, AC3.5, AC3.6, AC4.3, AC4.6_

  - [x] 3.4 Replace Expense+Income sheets dengan TransactionSheet di AppShell
    - Edit `src/components/layout/AppShell.tsx`:
      - Hapus import `ExpenseSheet` dan `IncomeSheet`.
      - Import `TransactionSheet` dari `@/components/transactions/TransactionSheet`.
      - Render dua instance: `<TransactionSheet mode="expense" />` dan `<TransactionSheet mode="income" />`.
      - `<TransferSheet />` tetap dipakai (akan refactored di task 3.5).
    - Hapus file:
      - `src/components/transactions/ExpenseSheet.tsx`
      - `src/components/transactions/IncomeSheet.tsx`
    - Verify no other import: `rg "ExpenseSheet|IncomeSheet" src/`.
    - Run `npm run build` — pass.
    - _Requirements: AC4.4_

  - [x] 3.5 Refactor TransferSheet — adopt new submit pattern + DeleteTransferDialog
    - Edit `src/components/transactions/TransferSheet.tsx`:
      - Replace inline Dialog dengan `<DeleteTransferDialog />`.
      - Submit pattern: `await ... → toast.success → closeSheet`. Hapus `setTimeout(() => closeSheet(), 800)`. Pada error, `toast.error` + sheet stays.
      - Hapus `submitError` & `submitSuccess` state.
    - Test: build pass.
    - _Requirements: AC3.1, AC3.2, AC3.3, AC3.4, AC3.5, AC4.5_

  - [x] 3.6 Extend `AmountInput` dengan prop `prefix`
    - Edit `src/components/shared/AmountInput.tsx`:
      - Tambah prop optional `prefix?: string` (default `"Rp"`).
      - Conditional render: kalau prefix non-empty, render span; kalau empty, no span dan adjust input padding ke `pl-3`.
    - Backward compat verified: existing usages tanpa prop tetap render "Rp".
    - _Requirements: AC4.7_

  - [x] 3.7 Replace inline `BalanceInput` di AccountForm dengan `AmountInput`
    - Edit `src/components/accounts/AccountForm.tsx`:
      - Hapus internal `BalanceInput` component (function di bottom file).
      - Replace usage: `<AmountInput value={watch("balance")} onChange={(val) => setValue("balance", val, { shouldValidate: true })} prefix="" />`.
      - Hapus `useState` `display` dan `useEffect` related.
    - _Requirements: AC4.7_

  - [x] 3.8 Expand color picker palette di AccountForm
    - Edit `src/components/accounts/AccountForm.tsx`:
      - Replace `colors` array dengan 16 warna Tailwind 500: `["#64748b", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9"]`.
      - Layout grid: `grid-cols-8 gap-2` mobile, masih `flex-wrap` OK juga.
    - _Requirements: AC4.8_

- [x] 4. Sprint 4 — Mobile Delete & Owner Pages Refactor
  - [x] 4.1 Extract `useLongPress` hook
    - Buat `src/hooks/useLongPress.ts`.
    - Export hook dengan signature di `design.md` section 2.
    - Export pure helper `shouldCancelLongPress(start, current, threshold): boolean`.
    - Internal: pakai `useRef` untuk timer + start position + moved flag, `useState` untuk pressing visual cue (returned via additional return value `pressing: boolean`).
    - Default: `durationMs=400`, `moveThresholdPx=10`. Vibrate(8) on long-press fire.
    - Don't bundle "tap-or-press" dispatch yet — caller decides on `onPointerUp` whether to call `onTap` or not.
    - _Requirements: AC5.1, AC5.2_

  - [x] 4.2 Refactor `BottomNav.OwnerSwitcher` pakai `useLongPress`
    - Edit `src/components/layout/BottomNav.tsx`:
      - Replace inline long-press logic di `OwnerSwitcher` dengan `useLongPress` hook.
      - Behavior preserved: tap → navigate, long-press → open dropdown, coach mark logic tetap, vibration tetap.
      - Test manual: `npm run dev`, klik tap → navigate; klik tahan 400ms → dropdown muncul.
    - _Requirements: AC5.3_

  - [x] 4.3 Bikin `<TransactionItemActions />` overlay menu
    - Buat `src/components/transactions/TransactionItemActions.tsx`.
    - Props: `{ open: boolean; onOpenChange: (open: boolean) => void; onEdit: () => void; onDelete: () => void; trigger: React.ReactNode }`.
    - Render shadcn `DropdownMenu`:
      - Trigger: pass through.
      - Content: items "Edit" (Pencil icon), "Hapus" (Trash icon, destructive class), "Batal" (X icon, kalau perlu — atau just rely on outside click).
    - _Requirements: AC5.4_

  - [x] 4.4 Replace `onContextMenu` di `TransactionItem` dengan long-press menu
    - Edit `src/components/transactions/TransactionItem.tsx`:
      - Hapus `useState` `showActions` lama.
      - Use `useLongPress({ onLongPress: () => setMenuOpen(true), onTap })` — tap masih open edit sheet via `onTap` prop.
      - Render `<TransactionItemActions open={menuOpen} onOpenChange={setMenuOpen} onEdit={onTap} onDelete={onDelete} trigger={...} />`.
      - `<button>` jadi DropdownMenu trigger.
    - _Requirements: AC5.5_

  - [x] 4.5 Replace context menu di `TransferItem` dengan long-press menu
    - Edit `src/components/transactions/TransferItem.tsx` (read existing implementation; mirror pattern from TransactionItem refactor).
    - Same pattern: `useLongPress` + `TransactionItemActions` (atau buat `TransferItemActions` kalau perlu beda label).
    - _Requirements: AC5.6_

  - [x] 4.6 Tambah long-press menu di `WishlistItemCard`
    - Edit `src/components/wishlist/WishlistItemCard.tsx`:
      - Tambah props optional `onEdit?: () => void; onDelete?: () => void`.
      - Use `useLongPress({ onLongPress: () => setMenuOpen(true) })`.
      - Render dropdown menu dengan Edit / Hapus.
      - Pages `wishlist/page.tsx` pass `onEdit={handleEditItem}` (existing) dan `onDelete={(item) => setItemToDelete(item)}` (need new state + dialog).
    - Implement delete dialog di `wishlist/page.tsx` kalau belum ada — pakai `<AlertDialog>` consistent.
    - _Requirements: AC5.7_

  - [x] 4.7 Manual test long-press di iOS Safari + Android Chrome
    - Document hasil test di `docs/UI_UX_CRITIQUE_V2_PLAN.md` (append section "V2 Manual QA Log").
    - Test cases (each platform):
      - Tap row → opens edit sheet.
      - Long-press 400ms → menu appears + haptic (mobile only).
      - During long-press, drag finger > 10px → menu does NOT appear.
      - Right-click on desktop → menu appears.
    - Kalau ada device tidak available, document via Chrome DevTools mobile emulation.
    - _Requirements: AC5.8_

  - [x] 4.8 Bikin `OwnerOverview` shared component
    - Buat `src/components/dashboard/OwnerOverview.tsx`.
    - Props: `{ owner: Owner }`.
    - Encapsulate semua state/hooks/render dari current `arul/page.tsx` (lihat existing implementation).
    - Tambahan: pass `OWNER_LABELS[owner]` dan `OWNER_COLORS[owner]` ke `<Header title={OWNER_LABELS[owner]} ownerColor={OWNER_COLORS[owner]}>`.
    - Setelah component done, lanjut task 4.9 untuk wire ke pages.
    - _Requirements: AC6.1, AC2.5_

  - [x] 4.9 Refactor 3 owner pages jadi tipis wrapper
    - Edit:
      - `src/app/(app)/arul/page.tsx`: replace seluruh body dengan `import { OwnerOverview } from "@/components/dashboard/OwnerOverview"; export default function ArulPage() { return <OwnerOverview owner="arul" />; }`.
      - `src/app/(app)/fifi/page.tsx`: same dengan `owner="fifi"`.
      - `src/app/(app)/together/page.tsx`: TEMPORARILY same dengan `owner="shared"` — akan di-replace dengan tabbed implementation di Sprint 5.
    - Verify: build pass + manual test ketiga pages render correct (load dashboard data per owner).
    - _Requirements: AC6.2, AC6.3, AC6.4, AC6.5_

- [x] 5. Sprint 5 — Berdua Tabs
  - [x] 5.1 Extend `Account` schema dengan `savingTarget` & `targetDate`
    - Edit `src/types/account.ts`:
      - Tambah optional fields ke interface `Account`: `savingTarget?: number; targetDate?: Timestamp`.
    - Edit `src/lib/validations/account.schema.ts`:
      - Tambah field ke Zod schema: `savingTarget: z.number().int().min(0).optional()`, `targetDate: z.any().optional()` (Timestamp).
    - Tidak perlu Firestore migration — fields optional, existing accounts unaffected.
    - _Requirements: AC7.1_

  - [x] 5.2 Tambah conditional fields di `AccountForm` untuk type=savings
    - Edit `src/components/accounts/AccountForm.tsx`:
      - Setelah field "Saldo Awal" (hanya muncul saat create), conditional render kalau `selectedType === "savings"`:
        - Field "Target Tabungan (opsional)": `<AmountInput value={watch("savingTarget") ?? 0} onChange={(val) => setValue("savingTarget", val || undefined)} prefix="Rp" />`.
        - Field "Target Tanggal (opsional)": `<Input type="date" />` set ke `targetDate` field.
      - Reset fields kalau type berubah dari savings ke yang lain.
    - _Requirements: AC7.2_

  - [x] 5.3 Bikin `PacarTab` component
    - Buat `src/components/together/PacarTab.tsx`.
    - Filter: `accounts.filter(a => a.owner === "shared" && ["bank", "cash", "e-wallet"].includes(a.type))`.
    - Render: list `<AccountCard>` + summary income/expense + `<RecentTransactions>` filtered ke owner=shared dan accountId in filtered set.
    - Kalau kosong, `<EmptyState>` "Belum ada akun pacaran".
    - _Requirements: AC7.3, AC7.4_

  - [x] 5.4 Bikin `TabunganTab` component
    - Buat `src/components/together/TabunganTab.tsx`.
    - Filter: `accounts.filter(a => a.owner === "shared" && a.type === "savings")`.
    - For each account, render card with progress bar:
      ```
      const progress = account.savingTarget
        ? Math.min((account.balance / account.savingTarget) * 100, 100)
        : 0;
      ```
    - Display: balance, target (kalau ada), targetDate (formatted, kalau ada), progress bar, percentage.
    - Total bagian atas: sum balances + sum targets.
    - _Requirements: AC7.3, AC7.4_

  - [x] 5.5 Bikin `InvestasiTab` component
    - Buat `src/components/together/InvestasiTab.tsx`.
    - Filter: `accounts.filter(a => a.owner === "shared" && a.type === "investment")`.
    - Render: card list + total nilai aggregated bagian atas (e.g., "Total Investasi: Rp X.XXX.XXX").
    - Future placeholder note: "Performa & return akan datang di v3".
    - _Requirements: AC7.3, AC7.4_

  - [x] 5.6 Replace `together/page.tsx` dengan tabbed implementation
    - Edit `src/app/(app)/together/page.tsx`:
      - Replace `<OwnerOverview owner="shared" />` (dari Sprint 4) dengan implementation tabbed.
      - Header pakai title `OWNER_LABELS["shared"]` ("Bareng") + `ownerColor={OWNER_COLORS["shared"]}` + MonthPicker.
      - Render shadcn `<Tabs defaultValue="pacaran">` dengan 3 TabsTrigger + TabsContent.
      - Setiap TabsContent render component tab masing-masing.
      - FAB + ActionSheet tetap di bawah, `setDefaultOwner("shared")` on mount.
    - Use `useAccounts("shared")` once di parent, pass via props ke tabs (atau pass useAccounts result down).
    - _Requirements: AC7.3, AC7.5, AC7.6_

- [x] 6. Sprint 6 — Pagination & Search
  - [x] 6.1 Refactor `useTransactions` dengan cursor pagination
    - Edit `src/hooks/useTransactions.ts`:
      - Tambah state: `lastDoc: DocumentSnapshot | null`, `hasMore: boolean`.
      - Initial query: existing pattern (onSnapshot dengan limit 20). Saat snapshot received, set `lastDoc = snapshot.docs[snapshot.docs.length - 1]` dan `hasMore = snapshot.docs.length === 20`.
      - Add `loadMore()`: fire one-time `getDocs(query(..., startAfter(lastDoc), limit(20)))`. Append result ke transactions, update `lastDoc`, update `hasMore`.
      - Reset cursor saat filters berubah.
      - Return: `{ transactions, isLoading, hasMore, loadMore, remove }`.
    - Test: `npm run build` pass.
    - _Requirements: AC8.1, AC8.2_

  - [x] 6.2 Implement infinite scroll trigger di `TransactionList`
    - Edit `src/components/transactions/TransactionList.tsx`:
      - Tambah optional props: `hasMore?: boolean`, `onLoadMore?: () => void`.
      - Di akhir list (setelah last `sortedDates.map`), kalau `hasMore && onLoadMore`, render `<div ref={triggerRef} className="h-4" />`.
      - `useEffect` setup IntersectionObserver pada triggerRef. Saat intersect, panggil `onLoadMore`.
      - Fallback button: di bawah trigger, render button `<Button variant="outline" size="sm" onClick={onLoadMore}>Muat lebih banyak</Button>` kalau `hasMore` (button useful sebagai fallback dan visual indicator).
    - _Requirements: AC8.3_

  - [x] 6.3 Wire pagination di `transactions/page.tsx`
    - Edit `src/app/(app)/transactions/page.tsx`:
      - Destructure `hasMore`, `loadMore` dari `useTransactions(filters)`.
      - Pass ke `<TransactionList ... hasMore={hasMore} onLoadMore={loadMore} />`.
    - _Requirements: AC8.3_

  - [x] 6.4 Add search input di `TransactionFilters`
    - Edit `src/components/transactions/TransactionFilters.tsx`:
      - Tambah input search bagian atas: `<Input placeholder="Cari transaksi..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />`.
      - Debounce 300ms via custom logic atau `useDebouncedValue` hook (bikin baru kalau tidak ada).
      - Setelah debounce, panggil `onChange({ ...filters, search: debouncedValue || undefined })`.
    - _Requirements: AC8.4_

  - [x] 6.5 Apply search filter di transactions page
    - Edit `src/app/(app)/transactions/page.tsx`:
      - Saat dapat `transactions` dari hook, filter client-side kalau `partialFilters.search`:
        ```typescript
        const filteredTransactions = useMemo(() =>
          partialFilters.search
            ? transactions.filter(t => 
                t.name.toLowerCase().includes(partialFilters.search!.toLowerCase())
              )
            : transactions,
          [transactions, partialFilters.search]
        );
        ```
      - Pass `filteredTransactions` ke TransactionList.
    - _Requirements: AC8.4, AC8.5_

- [x] 7. Sprint 7 — Wishlist Cross-Feature Integration
  - [x] 7.1 Extend `WishlistItem` schema dengan `linkedTransactionId`
    - Edit `src/types/wishlist.ts`:
      - Tambah optional field `linkedTransactionId?: string`.
    - Edit `src/lib/validations/wishlistItem.schema.ts`:
      - Tambah `linkedTransactionId: z.string().optional()`.
    - Tidak perlu Firestore migration.
    - _Requirements: AC9.1_

  - [x] 7.2 Refactor toggle purchased UX di WishlistItemCard
    - Edit `src/components/wishlist/WishlistItemCard.tsx`:
      - Replace simple `onTogglePurchased` button dengan dropdown menu saat user klik checkbox AND item belum purchased:
        - Item 1: "Tandai sudah dibeli" → just toggle.
        - Item 2: "Tandai dibeli + catat pengeluaran" → call new prop `onMarkPurchasedWithExpense?: () => void`.
      - Saat already purchased, click checkbox simpel toggle un-purchase.
      - Don't break existing `onTogglePurchased` flow.
    - _Requirements: AC9.2_

  - [x] 7.3 Implement "mark + catat expense" flow di WishlistPage
    - Edit `src/app/(app)/wishlist/page.tsx`:
      - State baru: `markingItem: WishlistItem | null`.
      - Handler `handleMarkWithExpense(item)`: 
        1. Set `markingItem = item`.
        2. Open `TransactionSheet` mode="expense" via Zustand `openSheet("expense", null)` — pre-fill via custom mechanism (lihat 7.4).
      - Pass `onMarkPurchasedWithExpense={() => handleMarkWithExpense(item)}` ke WishlistItemCard via WishlistCategorySection.
    - _Requirements: AC9.2, AC9.3_

  - [x] 7.4 Wire wishlist→transaction prefill via Zustand
    - Edit `src/store/useAppStore.ts`:
      - Tambah state: `prefillData: Partial<TransactionFormValues> | null`, `prefillSource: { type: "wishlist"; itemId: string } | null`.
      - Action `openSheetWithPrefill(type, prefillData, source)`.
      - `closeSheet()` clear prefillData + source.
    - Edit `TransactionSheet.tsx`:
      - Dalam useEffect setup defaults, kalau `prefillData` ada, override defaults dengan prefill values (name, amount, owner, account default tetap).
      - On submit success, kalau `prefillSource?.type === "wishlist"`, panggil `wishlistItemsService.update(prefillSource.itemId, { isPurchased: true, purchasedAt: serverTimestamp(), linkedTransactionId: <new tx id> })`.
      - Need `transactionsService.create` return tx id (sudah ada).
    - Update `src/lib/firestore/wishlistItems.ts` `update()` accepts `linkedTransactionId` field.
    - _Requirements: AC9.3, AC9.4_

  - [x] 7.5 Reset linkedTransactionId on un-purchase
    - Edit `src/lib/firestore/wishlistItems.ts`:
      - `togglePurchased(item)`: kalau going `true → false`, set `linkedTransactionId: null` (deleteField atau just null).
    - Don't auto-delete linked transaction — user manage manually di transactions page.
    - _Requirements: AC9.4_

  - [x] 7.6 Update `WishlistItemForm` owner label
    - Edit `src/components/wishlist/WishlistItemForm.tsx`:
      - `ownerOptions` array, replace `{ value: "shared", label: "Berdua" }` dengan `{ value: "shared", label: OWNER_LABELS["shared"] }` ("Bareng").
    - _Requirements: AC9.5, AC1.2_

- [x] 8. Sprint 8 — Settings, Privacy, Tech Debt
  - [x] 8.1 Bikin service `lib/firestore/users.ts`
    - Buat `src/lib/firestore/users.ts`.
    - Export `usersService` dengan methods:
      - `updatePreferences(uid: string, updates: Partial<User['preferences']>): Promise<void>` — pakai `updateDoc` dengan dot-notation update path.
      - Future: `linkPartner(uid, partnerUid)` (foundation, optional).
    - _Requirements: AC10.4_

  - [x] 8.2 Refactor settings page pakai service
    - Edit `src/app/(app)/settings/page.tsx`:
      - Replace inline `await updateDoc(...)` dengan `await usersService.updatePreferences(uid, { defaultAccountId: ... })`.
      - Hapus direct Firestore imports yang tidak dipakai.
    - _Requirements: AC10.4_

  - [x] 8.3 Filter default account selector ke owner=current user
    - Edit `src/app/(app)/settings/page.tsx`:
      - Filter `accounts.filter(a => a.owner === currentUser?.role || a.owner === "shared")` sebelum render Select options.
    - _Requirements: AC10.1_

  - [x] 8.4 Tambah `hideBalance` state di Zustand + persist
    - Edit `src/store/useAppStore.ts`:
      - Tambah state: `hideBalance: boolean` (default false).
      - Action: `setHideBalance: (hide: boolean) => void`.
      - Persistence: gunakan Zustand `persist` middleware (install dari `zustand/middleware`) atau manual `useEffect` di Provider sync to localStorage. Pick middleware untuk simplicity.
    - Storage key: `arthafiloka-app-store`. Hanya persist `hideBalance` (use `partialize`).
    - _Requirements: AC10.2_

  - [x] 8.5 Tambah toggle "Sembunyikan saldo" di Settings
    - Edit `src/app/(app)/settings/page.tsx`:
      - Tambah section "Privasi" antara Tampilan dan Logout.
      - Render switch / toggle: "Sembunyikan saldo otomatis" → bind ke `hideBalance` Zustand.
    - _Requirements: AC10.2_

  - [x] 8.6 Apply hideBalance ke `SummaryCards`
    - Edit `src/components/dashboard/SummaryCards.tsx`:
      - Replace local `useState showBalance` dengan Zustand `hideBalance` (negation).
      - Sync eye toggle button: `onClick = setHideBalance(!hideBalance)`.
      - Hero card: kalau hideBalance, render `••••••••`.
      - Breakdown sheet: amounts juga hide (account balance, owner total, total balance) — replace formatCurrency results dengan bullets kalau hide.
    - _Requirements: AC10.3_

  - [x] 8.7 Tambah About section di Settings
    - Edit `src/app/(app)/settings/page.tsx`:
      - Section "Tentang" sebelum version footer:
        - App name "Arthafiloka".
        - Version: import dari `package.json` (pakai `import pkg from "../../../package.json"` atau `process.env.NEXT_PUBLIC_APP_VERSION` — pick the import approach).
        - Note: "Aplikasi pribadi untuk Arul & Fifi 💕".
    - _Requirements: AC10.5_

  - [x] 8.8 Resolve `zodResolver as any` casts
    - Audit: `rg "zodResolver.*as any" src/`.
    - Files affected (minimum): `TransactionSheet.tsx`, `TransferSheet.tsx`, `AccountForm.tsx`, `CategoryForm.tsx`, `WishlistItemForm.tsx`, `WishlistCategoryForm.tsx`.
    - Strategy:
      1. Coba update `@hookform/resolvers` ke versi terbaru: `npm install @hookform/resolvers@latest`. Run `npm run build` — kalau pass tanpa cast, hapus semua `as any`.
      2. Kalau masih error, fallback: downgrade zod ke `^3.x` — `npm install zod@^3`. Update Zod schemas yang pakai zod 4 syntax (kemungkinan semua tetap valid karena pattern simple).
    - Test: `npm run build` pass tanpa cast.
    - _Requirements: AC11.6_

- [ ] 9. Sprint 9 — Testing, Accessibility, Final Polish
  - [x] 9.1 Extract pure helpers `computeBalanceDelta` & `computeTransferDeltas`
    - Buat `src/lib/firestore/helpers.ts`:
      - Export `computeBalanceDelta(type: "expense" | "income", amount: number): number`.
      - Export `computeTransferDeltas(oldTransfer, newInput): { deltas: Map<string, number> }`.
    - Refactor `src/lib/firestore/transactions.ts` (`create`, `delete`, `update`) untuk pakai `computeBalanceDelta`.
    - Refactor `src/lib/firestore/transfers.ts` (`update`) untuk pakai `computeTransferDeltas`.
    - Behavior identical, hanya pure logic extracted.
    - _Requirements: AC12.3, AC12.4_

  - [x] 9.2 Unit tests untuk pure helpers di `lib/firestore`
    - Buat `src/lib/firestore/__tests__/helpers.test.ts`.
    - Tests:
      - `computeBalanceDelta`:
        - `expense + 1000 → -1000`
        - `income + 1000 → 1000`
        - `expense + 0 → 0` (edge case)
      - `computeTransferDeltas`:
        - Same accounts old & new (no-op transfer): all deltas zero (stripped).
        - Different from accounts: 4 deltas merged into 4 (or less if collisions).
        - Same fromAccount old & new, same amount: from delta = 0 (stripped).
    - Property test (fast-check):
      - For random transfers: sum of all deltas always = 0.
    - Test: `npm test` pass.
    - _Requirements: AC12.3, AC12.4_

  - [x] 9.3 Unit tests untuk `formatCurrency` & `formatDate`
    - Buat `src/lib/utils/__tests__/formatCurrency.test.ts`:
      - 0 → "Rp 0"
      - 1000 → "Rp 1.000"
      - 1234567 → "Rp 1.234.567"
      - -500 → "-Rp 500" (atau apapun convention existing — test current behaviour)
      - Very large: 999999999999 → format correctly
    - Buat `src/lib/utils/__tests__/formatDate.test.ts`:
      - Today → "Hari ini" (atau apapun convention)
      - Yesterday → "Kemarin"
      - 3 days ago → format relative atau absolute (test current behaviour)
      - 1 month ago → absolute date
    - Test: `npm test` pass.
    - _Requirements: AC12.1, AC12.2_

  - [x] 9.4 Unit tests untuk `shouldCancelLongPress`
    - Buat `src/hooks/__tests__/useLongPress.test.ts` (atau co-locate `helpers.test.ts`).
    - Tests untuk pure helper `shouldCancelLongPress`:
      - Same position (dx=0, dy=0) → false.
      - Position 5px away with threshold 10 → false.
      - Position 15px away with threshold 10 → true.
      - Diagonal: 8x + 8y (hypot ≈ 11.3) with threshold 10 → true.
    - Property test: random positions, verify hypotenuse logic.
    - _Requirements: AC12.5_

  - [x] 9.5 Tambah `aria-label` ke icon-only buttons
    - Audit: cari `<button>` atau `<Button>` yang hanya berisi icon (tanpa text child).
    - Files yang perlu update:
      - FAB di `src/components/layout/FAB.tsx` — already has aria-label.
      - Wishlist FAB di `wishlist/page.tsx` — already has aria-label.
      - Custom FAB di `categories/page.tsx` — verify ada aria-label.
      - Eye toggle di `SummaryCards.tsx` — already has role+aria-label.
      - Delete buttons / pencil buttons di Wishlist sections, AccountDetailSheet, dll.
    - Tambah `aria-label` pakai Bahasa Indonesia: "Edit", "Hapus", "Sembunyikan saldo", dll.
    - _Requirements: AC12.6_

  - [x] 9.6 Audit warna kontras WCAG AA pada theme dark + light
    - Test manual: buka app di kedua theme, periksa visual:
      - Income green (`#0F9B58`) di atas `bg-card` light + dark.
      - Expense red (`#E03E3E`) di atas `bg-card` light + dark.
      - Owner colors di SummaryCards owner accent.
    - Pakai online tool (mis. WebAIM Contrast Checker) — minimum AA = 4.5:1 untuk normal text, 3:1 untuk large text.
    - Kalau gagal: adjust shade — mis. dark mode income jadi `#10b981` (lebih terang).
    - Document hasil di `docs/UI_UX_CRITIQUE_V2_PLAN.md` section "V2 Manual QA Log".
    - _Requirements: AC12.7_

  - [ ] 9.7 Final smoke test full app
    - Manual test 30-minute walkthrough:
      - Login flow.
      - Add expense → submit → verify toast + balance update.
      - Add expense offline → submit → verify toast + queued.
      - Edit expense → submit → verify toast.
      - Long-press transaction → menu open → Hapus → confirm → verify toast.
      - Switch ke owner page → verify color indicator + data filtered.
      - Buka /together → tabs render correct akun.
      - Toggle hideBalance → verify all balances hidden.
      - Wishlist mark + catat expense → verify TransactionSheet pre-filled, save → verify wishlist item linked.
      - Settings: ganti default account → verify update.
    - Document hasil di `docs/UI_UX_CRITIQUE_V2_PLAN.md` section "V2 Manual QA Log".
    - _Requirements: All success metrics from requirements.md_

  - [ ] 9.8 Update `docs/UI_UX_CRITIQUE_V2_PLAN.md` mark V2 status
    - Append section "V2 Implementation Status" dengan checklist semua requirement sudah dicapai.
    - Note any deviations atau follow-up issues for V3.
    - _Requirements: General — closing the loop_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "2.1", "2.4", "3.1", "3.2", "3.6", "3.8", "5.1", "7.1", "8.1"]
    },
    {
      "id": 1,
      "tasks": ["1.2", "2.2", "3.3", "3.7", "4.1", "5.2", "8.2", "8.3", "8.8", "9.1"]
    },
    {
      "id": 2,
      "tasks": ["2.3", "3.4", "3.5", "4.2", "4.3", "5.3", "5.4", "5.5", "8.4", "9.2", "9.3", "9.4"]
    },
    {
      "id": 3,
      "tasks": ["4.4", "4.5", "4.6", "4.8", "8.5", "8.6", "8.7"]
    },
    {
      "id": 4,
      "tasks": ["4.7", "4.9", "6.1", "9.5"]
    },
    {
      "id": 5,
      "tasks": ["5.6", "6.2"]
    },
    {
      "id": 6,
      "tasks": ["6.3", "6.4", "7.2"]
    },
    {
      "id": 7,
      "tasks": ["6.5", "7.3", "7.5", "7.6"]
    },
    {
      "id": 8,
      "tasks": ["7.4", "9.6"]
    },
    {
      "id": 9,
      "tasks": ["9.7"]
    },
    {
      "id": 10,
      "tasks": ["9.8"]
    }
  ]
}
```

### Dependency Rationale (Wave Reasoning)

- **Wave 0** — Tasks tanpa dependency: bikin constants, hapus dead code, update docs/branding, bikin foundation reusable components (DeleteDialog, helpers extract), schema extensions (additive).
- **Wave 1** — Tasks yang depend Wave 0: replace owner labels (depends on 1.1), bikin SpendingDonutMini (independent tapi related to 2.1), TransactionSheet polymorphic (depends on 3.1+3.2 dialog), AccountForm refactor balance input (depends 3.6 AmountInput prefix), useLongPress (independent), AccountForm conditional fields (depends 5.1 schema), settings refactor (depends 8.1 service).
- **Wave 2** — Use new infrastructure: dynamic import donut (needs 2.2), replace sheets in AppShell (needs 3.3), refactor TransferSheet (needs 3.2 dialog), wire useLongPress di BottomNav (needs 4.1), bikin tab components (needs 5.1 schema), hideBalance state (independent), pure helper tests (needs 9.1).
- **Wave 3** — Components consuming new patterns: replace context menu di TransactionItem (needs 4.3 actions component), expand color palette (independent visual change), settings UI features (needs 8.4 store).
- **Wave 4** — Features building on owner system: manual mobile test (needs 4.4-4.6 done), bikin OwnerOverview (needs 4.1 long-press base completion), useTransactions pagination, aria-label audit.
- **Wave 5** — Owner page rewrite + UI consumers: pagination integration di TransactionList, replace together page dengan tabs (needs 5.3-5.5).
- **Wave 6** — Pagination wired + search filter + wishlist UI: needs hooks done.
- **Wave 7** — Wishlist integration + final search + linked-tx cleanup.
- **Wave 8** — Cross-feature wishlist→transaction (needs TransactionSheet from Wave 2 + WishlistItemCard menu from Wave 6 + Zustand prefill).
- **Wave 9** — Final smoke test (needs everything else done).
- **Wave 10** — Document final status.

## Notes

- Spec ini bukan greenfield — semua perubahan di-apply ke kode yang udah jalan. Pastikan setiap task tidak break existing flow.
- Setelah Wave 2 (TransactionSheet replacement), harus build & manual smoke test "add expense" sebelum lanjut, karena ini critical path.
- Setelah Wave 4 (long-press menu), harus manual test mobile (real device atau emulation) sebelum sign-off Sprint 4.
- Property tests pakai `fast-check` (sudah terinstall di devDependencies).
- Toast pakai `sonner` (sudah terinstall, hanya perlu `import { toast } from "sonner"`).
- Brand decision sudah locked: **Arthafiloka**. Jangan revert ke "Arthaloka" di file baru.
- Shared label sudah locked: **Bareng**. Jangan revert ke "Berdua"/"Together"/"Bersama" di display text baru.
- Semua schema additions optional — no Firestore migration needed.
- Subagent yang execute task harus baca `requirements.md` dan `design.md` di spec dir untuk konteks penuh.
