# Requirements Document

> Spec: Arthafiloka V2 — Refactor & Polish

## Introduction

Arthafiloka V2 adalah refactor + polish iteration dari V1 yang sudah jalan. Fokusnya bukan menambah fitur besar, tapi:

1. Konsolidasi komponen yang duplikat (sheets, owner pages).
2. Fix UX pain points (silent submit failure, mobile delete broken).
3. Surfacing fitur yang sudah dibuild tapi tidak dipasang (BudgetAlerts, donut chart).
4. Fill gap dari spec V1 yang ditandai done tapi tidak diimplementasi (Berdua tabs).
5. Bersihkan inkonsistensi naming, dead code, dan tech debt.
6. Tambah test coverage di critical path (balance integrity).

Reference document: `docs/UI_UX_CRITIQUE_V2_PLAN.md` — kritik detail dari V1 yang jadi basis V2.

---

## Glossary

- **V1**: Arthafiloka versi yang saat ini deployed (baseline before V2 refactor).
- **V2**: Iteration ini — refactor + polish, no major new features.
- **Owner**: Salah satu dari `"arul" | "fifi" | "shared"`. Stored as-is di Firestore; display label sebagai **Bareng** untuk `"shared"` di UI.
- **Bareng**: Display label baru untuk owner=`shared`, replace V1 mix "Berdua"/"Together"/"Bersama".
- **AppShell**: Top-level layout wrapper di `(app)` route group yang mount global sheets.
- **TransactionSheet polymorphic**: New shared component pakai `mode` prop untuk replace duplikasi ExpenseSheet+IncomeSheet.
- **OwnerOverview**: New shared dashboard component yang replace 3 page duplikat (`arul`/`fifi`/`together`).
- **Long-press menu**: Mobile-friendly delete pattern via 400ms hold gesture, replacing V1 right-click `onContextMenu` (broken di mobile).
- **Linked transaction**: Wishlist item yang punya `linkedTransactionId` setelah user mark purchased + catat expense.
- **Cursor pagination**: Firestore `startAfter` based pagination (vs hardcoded limit di V1).

---

## Requirements

Untuk menghindari ambiguity saat eksekusi, V2 commit ke pilihan berikut:

| Decision | Pilihan |
|---|---|
| Brand name | **Arthafiloka** (single source) |
| Shared owner label | **Bareng** (replace "Berdua"/"Together"/"Bersama" di UI) |
| Mobile delete pattern | **Long-press menu** (reuse OwnerSwitcher pattern) |
| Spending visualization | **Hybrid** (donut mini di top + linear bar list di bawah) |
| Wishlist → Transaction integration | **Opt-in dropdown** ("Tandai beli saja" / "Tandai beli + catat expense") |
| Auth methods | **Google-only** (no email/password fallback) |
| Berdua tabs categorization | **By `account.type`** (no schema migration) |
| Pagination strategy | **Cursor-based** (Firestore `startAfter`) |
| Onboarding tour | **Deferred** ke V3 (out of scope V2) |
| Type label "shared" di database | **Tetap `"shared"`** (tidak churn data, hanya ubah display label) |

---

## Requirement 1: Brand & Naming Consistency

**User Story:** Sebagai user, saya ingin melihat nama aplikasi yang konsisten di semua surface (login, layout, settings, docs) supaya tidak bingung.

### Acceptance Criteria

- AC1.1: Aplikasi pakai satu nama brand: **Arthafiloka**. Semua kemunculan "Arthaloka" di codebase, UI text, metadata, README, dan steering docs di-update.
- AC1.2: Owner label `"shared"` di database tidak diubah. Tampilan UI di semua tempat pakai label **"Bareng"** (replace semua "Berdua", "Together", "Bersama" di display text).
- AC1.3: Folder kosong `src/app/(app)/berdua/` dihapus. Route aktual tetap `/together`.
- AC1.4: Constants terpusat di `src/lib/constants/labels.ts` exporting `OWNER_LABELS` map. Komponen import dari constants, tidak hardcode.
- AC1.5: README.md replace boilerplate Next.js dengan project description (tagline, setup, scripts, tech stack, link ke plan.md & critique doc).
- AC1.6: Steering docs di-rename: `arthaloka-context.md` → `arthafiloka-context.md`, content sync dengan reality.
- AC1.7: Spec dir `.kiro/specs/arthaloka/` tidak di-rename (preserve git history); tapi content `tasks.md`/`design.md` di-update kalau referensi salah brand.

---

## Requirement 2: Dashboard Completeness

**User Story:** Sebagai user, saya ingin lihat dashboard yang menampilkan budget alert dan spending donut sesuai janji spec V1, supaya bisa quick glance kondisi keuangan.

### Acceptance Criteria

- AC2.1: `BudgetAlerts` component di-mount di `dashboard/page.tsx` antara `SummaryCards` dan `SpendingByCategory`. Render hanya kalau ada budget dengan status `warning` atau `over`.
- AC2.2: `SpendingDonutMini` component baru dibikin di `src/components/dashboard/SpendingDonutMini.tsx` pakai Recharts donut, top 5 kategori by amount, sisanya digabung jadi "Lainnya". Legend di kanan (desktop) atau di bawah (mobile).
- AC2.3: Donut chart di-import via `next/dynamic` dengan `ssr: false` untuk hindari SSR Recharts issue. Loading state: skeleton circle.
- AC2.4: Donut + linear bar (`SpendingByCategory`) tampil keduanya di dashboard, bukan replace. Donut untuk distribution at-a-glance, bar list untuk detail.
- AC2.5: Header pada owner pages (`/arul`, `/fifi`, `/together`) menampilkan colored dot kecil di samping title sesuai owner color (arul=blue, fifi=pink, shared=purple). Border-bottom Header juga di-tint subtle.
- AC2.6: Title di dashboard tetap "Arthafiloka" (kontekstual greeting dideprioritaskan, future feature).

---

## Requirement 3: Submit UX Trap Fix

**User Story:** Sebagai user, saya ingin mendapat feedback yang jelas saat menyimpan transaksi, supaya tahu apakah save berhasil atau gagal.

### Acceptance Criteria

- AC3.1: Saat submit transaction (expense/income/transfer/account/category), service call di-`await` SEBELUM `closeSheet()`. Sheet stay open kalau write fail.
- AC3.2: Saat sukses, tampilkan `toast.success(...)` dengan message Indonesian (mis. "Pengeluaran tersimpan", "Transfer berhasil"). Tutup sheet baru setelah toast.
- AC3.3: Saat error, tampilkan `toast.error("Gagal menyimpan. Coba lagi.")` dan sheet tetap open dengan form data preserved (user bisa retry).
- AC3.4: Hapus `setTimeout(() => closeSheet(), 800)` di TransferSheet — replace dengan immediate close after success toast.
- AC3.5: Hapus state `submitError` & `submitSuccess` lokal di sheets (replaced dengan toast). Simplify form code.
- AC3.6: Button submit pakai `isSubmitting` dari RHF untuk disable + loading text ("Menyimpan...").

---

## Requirement 4: Sheet Refactor (DRY Triplikasi)

**User Story:** Sebagai developer, saya ingin satu shared `TransactionSheet` polymorphic supaya perubahan kecil tidak harus diaplikasi 3x.

### Acceptance Criteria

- AC4.1: Bikin `<DeleteTransactionDialog />` reusable di `src/components/transactions/DeleteTransactionDialog.tsx`. Props: `open`, `onClose`, `onConfirm`, `transactionName`, `isLoading`. Menggantikan inline Dialog di Expense/Income/Transfer sheets.
- AC4.2: `<DeleteTransferDialog />` similar pattern (description berbeda — "Saldo kedua akun akan dikembalikan").
- AC4.3: Refactor `ExpenseSheet` + `IncomeSheet` jadi shared `<TransactionSheet mode="expense" | "income" />` di `src/components/transactions/TransactionSheet.tsx`. Conditional fields:
  - Mode `expense`: button default style, label "Akun", filter `c.type === "expense" || c.type === "both"`, title "Tambah/Edit Pengeluaran".
  - Mode `income`: button `bg-income`, label "Ke Akun", filter `c.type === "income" || c.type === "both"`, title "Tambah/Edit Pemasukan".
- AC4.4: Old `ExpenseSheet.tsx` dan `IncomeSheet.tsx` dihapus. `AppShell.tsx` import `TransactionSheet` dengan dua instance (`mode="expense"` dan `mode="income"`).
- AC4.5: `TransferSheet` pakai `DeleteTransferDialog` shared — submit pattern align dengan AC3.
- AC4.6: Reset `accountId` saat owner berubah di sheet (kalau current account.owner ≠ selectedOwner, clear). Prevent silent invalid state.
- AC4.7: Inline `BalanceInput` di `AccountForm.tsx` dihapus. Pakai `<AmountInput prefix="" />` setelah AmountInput di-extend dengan prop `prefix?: string` (default "Rp").
- AC4.8: Color picker di `AccountForm` di-expand ke 16 warna mengikuti Tailwind 500 palette: slate, blue, indigo, purple, pink, rose, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky.

---

## Requirement 5: Mobile Delete Pattern

**User Story:** Sebagai user mobile, saya ingin bisa delete transaksi dengan gesture native (long-press) dari list, bukan harus buka edit sheet.

### Acceptance Criteria

- AC5.1: Bikin hook `useLongPress` di `src/hooks/useLongPress.ts`. API: `useLongPress({ onLongPress, durationMs?, onMove?, moveThresholdPx? }) → handlers object` (returns `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, `onPointerLeave`, `onContextMenu`). Default `durationMs=400`, `moveThresholdPx=10`.
- AC5.2: Hook trigger haptic vibration (`navigator.vibrate(8)`) saat long-press fire. Handle pointer move untuk cancel kalau user gerak > threshold.
- AC5.3: Refactor `BottomNav.OwnerSwitcher` pakai `useLongPress` (replace inline implementation, keep behaviour identical).
- AC5.4: Bikin `<TransactionItemActions />` overlay component di `src/components/transactions/TransactionItemActions.tsx`. Triggered oleh long-press, render shadcn DropdownMenu / Popover dengan items: ✏ Edit / 🗑 Hapus / ❌ Batal.
- AC5.5: Replace `onContextMenu` di `TransactionItem.tsx` dengan `useLongPress` + `<TransactionItemActions />`. Long-press = open menu; tap = onTap (existing).
- AC5.6: Pattern sama diapply di `TransferItem.tsx`.
- AC5.7: Pattern sama diapply di `WishlistItemCard.tsx` — long-press buka menu Edit/Hapus.
- AC5.8: Manual test pass di iOS Safari + Android Chrome (real device atau Chrome DevTools mobile emulation). Test plan: tap = navigate ke edit sheet; long-press 400ms = menu muncul; pointer move > 10px = cancel.

---

## Requirement 6: Owner Pages Refactor

**User Story:** Sebagai developer, saya ingin tiga owner pages (`/arul`, `/fifi`, `/together`) tidak lagi copy-paste, supaya maintenance gampang.

### Acceptance Criteria

- AC6.1: Bikin `<OwnerOverview owner={owner} />` di `src/components/dashboard/OwnerOverview.tsx`. Props: `owner: Owner`. Encapsulate semua state, hooks, dan layout yang dulu duplicate.
- AC6.2: `arul/page.tsx`, `fifi/page.tsx`, `together/page.tsx` jadi 5-baris wrapper masing-masing: import `OwnerOverview` dan render `<OwnerOverview owner="..." />`.
- AC6.3: `setDefaultOwner` cleanup behaviour preserved (set on mount, clear on unmount).
- AC6.4: Header title pakai `OWNER_LABELS[owner]` dari constants.
- AC6.5: Total balance, summary income/expense, accounts list, recent transactions, FAB, ActionSheet, AccountForm sheet, AccountDetailSheet — semua tetap berfungsi sama persis.

---

## Requirement 7: Berdua/Together Tabs

**User Story:** Sebagai pasangan, kami ingin halaman shared finance punya tabs Pacaran / Tabungan / Investasi sesuai spec V1, supaya saving goals dan investasi terpisah dari akun pacaran.

### Acceptance Criteria

- AC7.1: `Account` schema di-extend dengan optional fields: `savingTarget?: number` (IDR target), `targetDate?: Timestamp`. Migration aman karena optional. Update `account.schema.ts` Zod accordingly.
- AC7.2: `AccountForm` show conditional fields `savingTarget` + `targetDate` kalau `type === "savings"`. Both optional.
- AC7.3: `together/page.tsx` (yang setelah AC6.2 hanya wrapper) di-replace dengan implementation tabbed pakai shadcn `<Tabs>` dengan 3 tabs:
  - **Pacaran**: filter `account.type ∈ ["bank", "cash", "e-wallet"]` AND `owner === "shared"`. Tampilkan list akun + recent transactions.
  - **Tabungan**: filter `account.type === "savings"` AND `owner === "shared"`. Tampilkan list akun dengan progress bar ke `savingTarget` (kalau ada).
  - **Investasi**: filter `account.type === "investment"` AND `owner === "shared"`. Tampilkan list akun + total nilai aggregated.
- AC7.4: 3 sub-component baru di `src/components/together/`: `PacarTab.tsx`, `TabunganTab.tsx`, `InvestasiTab.tsx`.
- AC7.5: Header tetap "Bareng" dengan colored dot purple (per AC2.5).
- AC7.6: Tetap ada FAB + ActionSheet untuk add transaksi shared.

---

## Requirement 8: Pagination & Search Transactions

**User Story:** Sebagai user dengan banyak transaksi per bulan, saya ingin bisa load more transaksi setelah 20 pertama, dan bisa search by name.

### Acceptance Criteria

- AC8.1: `useTransactions` di-extend dengan cursor pagination. Hook return `{ transactions, isLoading, hasMore, loadMore, remove }`. Internal: pakai `startAfter(lastDoc)` untuk next page. Page size 20.
- AC8.2: Listener tetap subscribe untuk realtime — saat page tambahan di-load, query baru append ke existing.
- AC8.3: `TransactionList` implement infinite scroll via `IntersectionObserver` pada element trigger di akhir list. Fallback button "Muat lebih banyak" untuk fallback / debug.
- AC8.4: Search transactions by name di `transactions/page.tsx`: tambah `<Input>` di TransactionFilters dengan debounce 300ms. Filter di client-side dari result yang sudah di-fetch (case-insensitive includes).
- AC8.5: Dark/edge case: kalau `hasMore=false`, hide trigger element. Kalau loading, show spinner.

---

## Requirement 9: Cross-Feature Integration & Wishlist Improvements

**User Story:** Sebagai user, saat saya mark wishlist item sebagai sudah dibeli, saya ingin opsi untuk langsung catat sebagai expense supaya tidak duplicate kerjaan.

### Acceptance Criteria

- AC9.1: `WishlistItem` schema di-extend dengan optional `linkedTransactionId?: string`. Update Zod schema dan service.
- AC9.2: Saat user toggle purchased dari `false` → `true` di `WishlistItemCard`, replace plain toggle dengan dropdown menu (shadcn DropdownMenu) atau dialog dengan 2 opsi:
  - "Tandai sudah dibeli" (toggle saja, no transaction).
  - "Tandai sudah dibeli + catat pengeluaran" → buka `TransactionSheet mode="expense"` pre-filled (`name=item.nama`, `amount=item.harga`, `owner=item.owner`, `date=today`, `accountId=defaultAccount`).
- AC9.3: Saat transaction tersave, store `transactionId` ke `linkedTransactionId` di wishlist item.
- AC9.4: Saat toggle dari `true` → `false` (un-purchase), juga reset `linkedTransactionId` (don't auto-delete linked transaction — user bisa hapus manual).
- AC9.5: Wishlist `WishlistItemForm` `owner` option label "Berdua" → **"Bareng"** (per AC1.2).

---

## Requirement 10: Settings Polish & Privacy

**User Story:** Sebagai user, saya ingin bisa hide saldo secara global (bukan hanya hero card), dan default account selector hanya tampilkan akun saya, supaya UX lebih relevant.

### Acceptance Criteria

- AC10.1: Filter default account selector di `settings/page.tsx` ke `account.owner === currentUser.role` (atau include shared kalau preference). Hide akun pasangan.
- AC10.2: Tambah toggle "Sembunyikan saldo" di Settings. Persist ke `useAppStore` + `localStorage` (key: `arthafiloka.hideBalance`).
- AC10.3: `SummaryCards.tsx` baca state `hideBalance` dari store. Kalau true, tampilkan `••••••••` di hero card AND di breakdown sheet (semua angka).
- AC10.4: Pindah direct `updateDoc` di `settings/page.tsx` ke service function `src/lib/firestore/users.ts` exporting `usersService.updatePreferences(uid, updates)`.
- AC10.5: Tambah About section di Settings: app version dari `package.json` (via `process.env.NEXT_PUBLIC_APP_VERSION` atau import langsung), small footer note.

---

## Requirement 11: Tech Debt & Code Quality

**User Story:** Sebagai developer, saya ingin codebase tanpa dead code, tanpa cast `as any` workaround, dan dengan steering docs yang akurat.

### Acceptance Criteria

- AC11.1: Hapus dead components: `src/components/shared/OwnerBadge.tsx`, `src/components/shared/PageTransition.tsx`. Verify no import via grep sebelum hapus.
- AC11.2: Hapus folder kosong `src/app/(app)/berdua/`.
- AC11.3: Refactor `SpendingDonut.tsx` jadi `SpendingDonutMini.tsx` (lihat AC2.2) atau hapus kalau tidak dipakai.
- AC11.4: Hapus custom CSS variables redundan di `globals.css` (`--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-hover`, `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`, `--border-default`, `--border-strong`, dst yang tidak di-wire ke Tailwind dan tidak dipakai). Keep: `--color-income`, `--color-expense`, `--color-transfer`, `--color-warning`, `--color-arul`, `--color-fifi`, `--color-shared` kalau dipakai.
- AC11.5: Update `tsconfig.json`: enable `noUnusedLocals: true`, `noUnusedParameters: true`. Fix resulting errors.
- AC11.6: Resolve `zodResolver as any` casts — option A: update `@hookform/resolvers` ke versi terbaru yang compat dengan zod 4; option B: downgrade zod ke `^3.x`. Pick A first; fallback to B kalau update tidak resolve.
- AC11.7: Update steering docs (`component-patterns.md`, `coding-standards.md`) — replace ghost token `bg-secondary`/`text-secondary` dengan shadcn standard `bg-card`/`text-muted-foreground`/`border-border`.

---

## Requirement 12: Testing & Accessibility

**User Story:** Sebagai developer, saya ingin coverage untuk balance integrity logic dan critical utilities, plus app accessible untuk keyboard + screen reader.

### Acceptance Criteria

- AC12.1: Unit tests untuk `formatCurrency` (edge cases: 0, negative, very large) di `src/lib/utils/__tests__/formatCurrency.test.ts`.
- AC12.2: Unit tests untuk `formatDate` (today, yesterday, this week, older) di `src/lib/utils/__tests__/formatDate.test.ts`.
- AC12.3: Pure function tests untuk delta merging logic di `transfersService.update` — extract pure function `computeTransferDeltas(oldTransfer, newInput) → Map<accountId, delta>`, test independently di `src/lib/firestore/__tests__/transferDeltas.test.ts`.
- AC12.4: Pure function tests untuk balance delta computation di `transactionsService.create/update/delete` — extract `computeBalanceDelta(type, amount, sign)` dan test.
- AC12.5: Property test untuk `useLongPress` cancel-on-move logic — extract pure helper `shouldCancelLongPress(startPos, currentPos, threshold) → boolean`, fast-check generates positions.
- AC12.6: Tambah `aria-label` ke icon-only buttons: FAB di Wishlist + custom positioned, eye toggle di SummaryCards, semua kebab/pencil buttons.
- AC12.7: Audit warna kontras pada theme dark + light untuk income green (`#0F9B58`) dan expense red (`#E03E3E`) di atas `bg-card`. Adjust kalau gagal WCAG AA.

---

## Out of Scope (V2 Non-Goals)

- ❌ Multi-currency support — tetap IDR only.
- ❌ More than 2 users — whitelist tetap hardcoded.
- ❌ Push notifications.
- ❌ Recurring transactions full implementation (foundation only kalau ada waktu).
- ❌ Saving goals advanced (basic target field saja per AC7.1).
- ❌ Net worth tracker timeline.
- ❌ Export PDF/CSV.
- ❌ PWA manifest + service worker.
- ❌ Pull-to-refresh real implementation.
- ❌ Onboarding 3-screen tour.
- ❌ Multi-language.
- ❌ Custom themes per user.
- ❌ E2E tests dengan Playwright.

---

## Success Metrics

V2 dianggap "done" kalau:

- ✅ Single brand "Arthafiloka" di semua surface.
- ✅ Single shared label "Bareng" di semua UI.
- ✅ Submit transaksi tidak silent fail (toast feedback selalu).
- ✅ Mobile delete works via long-press, verified iOS Safari + Android Chrome.
- ✅ Berdua tabs (Pacaran/Tabungan/Investasi) implemented.
- ✅ Dashboard donut + budget alerts visible.
- ✅ Owner pages 5-baris wrapper (no copy-paste).
- ✅ TransactionSheet polymorphic mode="expense"|"income" (Income+ExpenseSheet dihapus).
- ✅ Pagination & search di transactions page.
- ✅ Wishlist mark purchased opsi catat expense.
- ✅ Settings: hide balance global, default account filtered ke own role.
- ✅ Dead code dihapus.
- ✅ `as any` cast di forms hilang.
- ✅ Steering docs accurate.
- ✅ Test coverage untuk pure helpers di `lib/firestore/` & `lib/utils/`.
