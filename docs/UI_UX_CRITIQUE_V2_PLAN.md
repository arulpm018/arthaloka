# 🔍 Arthafiloka — UI/UX Critique & V2 Improvement Plan

> Dokumen kritik mendalam dan rencana perbaikan untuk Arthafiloka v2.
> Disusun: Mei 2026 · Status: Living document
> Ruang lingkup: UI, UX, fitur, arsitektur komponen, dan tech debt.

---

## 0. Executive Summary

Arthafiloka v1 sudah berjalan dan core flow-nya solid: auth Google whitelist, atomic batch write untuk balance integrity, realtime sync via `onSnapshot`, offline persistence, plus fitur tambahan unik seperti Wishlist dan OwnerSwitcher long-press di BottomNav. Wireframe Notion-inspired sudah konsisten di permukaan, tapi di balik itu ada **inkonsistensi naming, duplikasi komponen besar, deviasi dari spec, dan beberapa UX trap**, terutama di delete flow mobile dan submit feedback.

**Tiga masalah paling berdampak yang harus diselesaikan di v2**:

1. **Duplikasi besar** — `ExpenseSheet`, `IncomeSheet`, `TransferSheet` punya ~95% kode identik. Tiga halaman owner (`/arul`, `/fifi`, `/together`) struktural copy-paste. Setiap perubahan kecil harus diaplikasi di 3 tempat. Ini sumber bug yang paling subtle.
2. **Submit UX yang silent-failing** — `ExpenseSheet` dan `IncomeSheet` memanggil `closeSheet()` *sebelum* `await transactionsService.create()` selesai. Kalau write gagal (offline, permission denied, validation error pada Firestore), user tidak dapat feedback apa-apa. Sheet hanya tertutup dan user mengira berhasil.
3. **Mobile delete pattern broken** — Spec & component-patterns.md tegas bilang "swipe-left to delete". Implementasi `TransactionItem` pakai `onContextMenu` (right-click). Di mobile native, long-press tidak terhubung ke handler ini. User mobile praktis hanya bisa delete via tap → edit sheet → scroll → tombol Hapus (5+ taps).

Selain itu ada gap fungsional dari spec (Berdua tabs, donut chart, budget alerts di dashboard), dead code (`SpendingDonut.tsx`, `BudgetAlerts.tsx`, `OwnerBadge.tsx`, `PageTransition.tsx`), dan inkonsistensi naming yang akan jadi friction makin lama makin berat (Arthaloka vs Arthafiloka, Berdua vs Together vs shared, folder kosong `(app)/berdua/`).

V2 difokuskan ke: **konsolidasi komponen, fix UX feedback loop, surfacing fitur yang sudah ter-build tapi tidak dipasang, plus integrasi cross-feature** (wishlist ↔ transactions). Tidak ada penambahan fitur besar di v2 — fokusnya polish, refactor, dan fill gap dari spec v1.

**Estimasi effort total**: 7–9 sprint (1 sprint ≈ 1 minggu, 1 dev part-time).

---

## 1. Inventaris State Aplikasi Saat Ini

### 1.1 Tech Stack (yang aktual dipakai)

| Layer | Library | Versi | Catatan |
|---|---|---|---|
| Framework | Next.js | 14.2.35 | App Router, dev port 1806 |
| UI | React | 18 | Client components dominan |
| Styling | Tailwind CSS | 3.4.1 | + `tailwindcss-animate` |
| Component lib | shadcn/ui | new-york style | Base color: zinc |
| Icons | lucide-react | 1.16.0 | Versi pinned ke major lama, versi terbaru lucide-react sudah 0.x → kemungkinan ini typo / wrong package |
| Forms | react-hook-form + zod | 7.76 + 4.4 | zodResolver type mismatch → cast `as any` |
| State | Zustand | 5.0.13 | UI state only |
| Date | date-fns | 4.2.1 | locale `id` |
| Charts | recharts | 3.8.1 | **Terinstall, hampir tidak dipakai** |
| Animation | framer-motion | 12.39 | **Underused** |
| Toast | sonner | 1.7.4 | Dipakai di Wishlist, belum konsisten di transactions |
| Theme | next-themes | 0.4.6 | Light/dark/system |
| Auth & DB | firebase | 12.13 | Auth + Firestore + offline persistence |
| Test | vitest + fast-check | 4.1.7 + 4.8 | Property-based, hanya 1 test untuk wishlist util |

**Catatan tech stack**:
- `recharts` 3.8.1 dan `framer-motion` 12.39 menambah bundle tapi tidak banyak dipakai. Worth mempertimbangkan drop atau dipakai serius.
- `lucide-react@^1.16.0` → versi lucide-react sebenarnya pakai semver 0.x. Kemungkinan ini typo `^0.16` atau install dari registry mirror. Perlu dicek `package-lock.json` untuk pastikan.

### 1.2 Struktur Halaman & Route

```
src/app/
├── (auth)/                          ← public, no chrome
│   ├── login/                       ← Google sign-in + email whitelist
│   └── onboarding/                  ← Set displayName + role + inviteCode
│
└── (app)/                           ← protected, AuthGuard + AppShell
    ├── dashboard/                   ← Overview + summary + recent
    ├── arul/                        ← Personal finance Arul
    ├── fifi/                        ← Personal finance Fifi
    ├── together/                    ← Shared finance
    ├── berdua/                      ← ⚠️ FOLDER KOSONG (legacy)
    ├── transactions/                ← Full list + filter
    ├── accounts/                    ← Manage akun
    ├── categories/                  ← Manage kategori + budget
    ├── wishlist/                    ← Wishlist barang
    ├── more/                        ← Mobile only — link ke Akun/Kategori/Settings
    └── settings/                    ← Profile + theme + logout
```

### 1.3 Domain Data Model (snapshot)

| Collection | Field penting | Soft delete? | Denorm? |
|---|---|---|---|
| `users` | uid, displayName, role, partnerUid, inviteCode, preferences | — | — |
| `accounts` | balance, owner, type, color, icon, isActive, order | ✅ | — |
| `transactions` | amount, type, owner, accountId, categoryId, accountName, categoryName, categoryIcon, date | ❌ (hard delete) | accountName, categoryName, categoryIcon |
| `transfers` | amount, fromAccountId, toAccountId, fromAccountName, toAccountName, fromAccountOwner?, toAccountOwner? | ❌ | account names + owner fields |
| `categories` | name, icon, color, type, budgetAmount, budgetScope, isActive | ✅ | — |
| `wishlistItems` | nama, harga, lokasi, categoryId, owner, isPurchased, purchasedAt | ❌ | — |
| `wishlistCategories` | name, icon, owner, isActive | ✅ | — |

Atomic balance updates pakai `writeBatch + increment()`. Bagus secara invariant, tapi tidak semua mutation route ke service (settings page panggil `updateDoc` langsung).

### 1.4 Status Fitur (vs Spec)

| Fitur | Status | Catatan |
|---|---|---|
| Auth Google + whitelist | ✅ Selesai | Tidak implement email/password (spec menyebut, scope diturunkan) |
| Partner linking via inviteCode | ⚠️ Backend siap, UI absent | `useAuth.linkPartner` ada, tidak ada form untuk input code |
| Accounts CRUD | ✅ Selesai | Reorder field ada, drag UI tidak diimplementasi |
| Categories + Budget | ✅ Selesai | Color picker tidak ada di form (hidden, default `#64748b`) |
| Add Expense/Income | ✅ Selesai | Submit UX broken (lihat 0.2) |
| Transfer | ✅ Selesai | Edit logic merge deltas per accountId — solid |
| Transactions list + filter | ✅ Selesai | Hardcoded `limit(20)` tanpa loadMore |
| Dashboard summary | ✅ Selesai | Hero card + breakdown sheet polished |
| Dashboard donut chart | ❌ Not wired | `SpendingDonut.tsx` ada di codebase, tidak diimport |
| Dashboard budget alerts | ❌ Not wired | `BudgetAlerts.tsx` ada, tidak diimport |
| Owner pages (Arul/Fifi) | ✅ Selesai | Duplikasi besar antar 3 halaman |
| Berdua tabs (Pacaran/Tabungan/Investasi) | ❌ Not implemented | Spec task 14 ditandai done tapi implementasi tidak ada — `/together` cuma generic owner page |
| Wishlist | ✅ Selesai | Polished, optimistic update, progress per category |
| Settings | ✅ Selesai | Profile, default account, theme, logout |
| Loading skeletons | ✅ Selesai | 4 variant + WishlistSkeleton |
| Empty states | ✅ Selesai | `EmptyState` reusable |
| OfflineBadge | ✅ Selesai | Top fixed |
| Pull-to-refresh | ❌ Not found | Spec ditandai done, tidak ditemukan |
| Page transitions | ❌ Not used | `PageTransition.tsx` ada tapi tidak di-mount |
| Swipe-to-delete | ❌ Broken | Pakai `onContextMenu`, mobile tidak fungsi |
| Recurring tx | ❌ Not implemented | Future feature |
| Saving goals | ❌ Not implemented | Future feature |
| Net worth tracker | ❌ Not implemented | Future feature |
| Export CSV | ❌ Not implemented | Future feature |
| PWA manifest | ❌ Not implemented | Future feature |
| Search transactions | ❌ Not implemented | Schema punya `search` field di TxFilters tapi tidak di-wire |

---

## 2. Kritik UI

Bagian ini menyoroti masalah visual, layout, dan konsistensi antar layar. Setiap kritik dipasangkan dengan rekomendasi konkret.

### 2.1 Inkonsistensi Naming & Branding

**Masalah**:
- Tiga nama beredar: **Arthaloka** (di `plan.md` & `docs/ANDROID_SYSTEM_DESIGN.md`), **Arthafiloka** (di `package.json`, `app/layout.tsx`, login UI), **Berdua** vs **Together** vs **shared** (di owner labels). Folder `(app)/berdua/` ada tapi route aktual `/together`. `coding-standards.md` menulis "Arthafiloka", `arthaloka-context.md` di steering juga "Arthafiloka", tapi spec dir-nya `.kiro/specs/arthaloka/`.
- BottomNav owner switcher pakai label "Together" → CategoriesPage tab pakai "Together" → Wishlist filter pakai "Berdua" → Wishlist owner option pakai "Berdua" → Transfer page select "Bersama". Lima nama berbeda untuk satu konsep.
- README.md masih boilerplate Next.js default.

**Dampak UX**:
- User binggung: kalau di salah satu tempat klik "Berdua" dan di tempat lain "Together", apakah itu sama?
- Cognitive load tambahan untuk pasangan yang baru pakai app.

**Rekomendasi v2**:
- **Pilih satu nama brand**: rekomendasi `Arthafiloka` (sudah dipakai di package.json, layout, login). Update semua dokumen, spec dir rename ke `.kiro/specs/arthafiloka/`, plan.md, ANDROID_SYSTEM_DESIGN.md, dst.
- **Pilih satu label "shared"**: rekomendasi `Bareng` (Indonesian, lebih relax dibanding "Bersama" yang formal, dan lebih native dibanding "Together"). Atau tetap `Together` kalau preference English. Yang penting: **pakai konsisten di semua tempat**. Type tetap `"shared"` (don't churn database).
- Constant terpusat: `src/lib/constants/labels.ts` exporting `OWNER_LABELS = { arul: "Arul", fifi: "Fifi", shared: "Bareng" }`. Semua component import dari sini.
- Hapus folder `(app)/berdua/` yang kosong.
- Update README dengan project description sebenarnya.

### 2.2 Owner Pages — Identical Copy-Paste

**Masalah**:
`src/app/(app)/arul/page.tsx`, `fifi/page.tsx`, dan `together/page.tsx` adalah file ~130 baris yang **berbeda hanya pada 4 string**: header title, default owner string di `setDefaultOwner`, dan filter owner di `useAccounts`/`useSummary`/`useTransactions`/`useTransfers`. Sisanya identical.

**Dampak**:
- Setiap perbaikan layout, summary card, atau add-button harus diaplikasi 3×. Dijamin lupa salah satu suatu hari.
- File diff 3 file mengaburkan true intent dari perubahan.

**Rekomendasi v2**:
**Opsi A (preferred)**: Dynamic route `[owner]`.
```
src/app/(app)/[owner]/page.tsx  ← validates owner ∈ ['arul','fifi','together']
```
File-spesifik route hanya redirect to dynamic version. Atau route group `(owners)/[owner]/page.tsx` dengan static params.

**Opsi B**: Extract komponen `<OwnerOverview owner={owner} />` di `src/components/dashboard/OwnerOverview.tsx`. Tiga halaman tipis hanya import + pass prop. Lebih simple, less Next.js magic.

Saya rekomendasi **Opsi B** untuk simplicity (1 hari kerja, no routing risk).

### 2.3 Transactions Sheet — Triplikasi (Expense, Income, Transfer)

**Masalah**:
- `ExpenseSheet.tsx` (~330 baris) dan `IncomeSheet.tsx` (~330 baris) **95% identik**: same hooks, same form structure, same delete dialog inline. Beda di: title text, button color (`bg-income` vs default), filter category type (`expense|both` vs `income|both`), label "Akun" vs "Ke Akun".
- Delete confirmation `<Dialog>` di-copy 3× (Expense, Income, Transfer sheets) dengan struktur identical.
- Semua tiga sheet baca `activeSheet`/`closeSheet`/`editingTransaction`/`editingTransfer` dari Zustand secara separate.

**Dampak**:
- Bug yang ditemukan di Expense (mis. owner filter behaviour) harus difix di Income juga, dan kemungkinan terlewat.
- Code review susah — diff besar untuk perubahan kecil.
- Error patterns: di Expense `submitError`/`submitSuccess` state ada tapi tidak ditampilkan karena sheet close duluan. Same issue di Income. Trio duplikat juga.

**Rekomendasi v2**:
Refactor jadi **`TransactionSheet` polymorphic**:
```typescript
// src/components/transactions/TransactionSheet.tsx
type Mode = "expense" | "income" | "transfer";
export const TransactionSheet = ({ mode }: { mode: Mode }) => {
  // shared form scaffolding
  // conditional fields:
  //   - expense/income: amount, name, category, owner, account, date, note
  //   - transfer: amount, name, fromAccount, toAccount, owner, date, note
  // delete dialog: shared via `<DeleteTransactionDialog />`
}
```
- Mounted at `AppShell` once per mode (or once with internal switch on `activeSheet`).
- Schema dipilih runtime: `mode === "transfer" ? transferSchema : transactionSchema`.
- Delete dialog → komponen terpisah `DeleteTransactionDialog` reusable.
- Estimate: 2 hari refactor + 1 hari QA, hilangkan ~600 baris duplikat.

### 2.4 Submit UX Trap (Critical)

**Masalah**:
```typescript
// ExpenseSheet.tsx & IncomeSheet.tsx
const onSubmit = async (data) => {
  try {
    setSubmitError(null);
    closeSheet();   // ← UI close BEFORE await
    if (isEditing) {
      await transactionsService.update(...);
    } else {
      await transactionsService.create(...);
    }
  } catch (error) {
    console.error("Failed to save expense:", error);
    // Comment in code: "Re-open won't work after close, so just log"
  }
};
```

Comment di kode tegas mengakui: kalau gagal, tidak ada feedback ke user. Ini melanggar `coding-standards.md` ("Jangan silent fail — selalu inform user") dan `component-patterns.md` (pattern menyiratkan `toast.error("Gagal menyimpan...")`).

`TransferSheet` lebih baik (await dulu, baru close + show success), tapi success message hanya muncul 800ms dengan setTimeout — fragile.

**Dampak UX**:
- User offline → tap save → sheet close → user assume sukses. Saldo tetap muncul di UI (Firestore offline cache memang return success), tapi kalau ada permission error dari rules, write rejected silently.
- User edit transaction → save → kalau gagal, sheet close dan transaction unchanged. User tidak tahu kenapa.

**Rekomendasi v2**:
1. **Await write dulu, close kemudian** — pattern standar:
   ```typescript
   const onSubmit = async (data) => {
     try {
       await transactionsService.create(data);
       toast.success(isEditing ? "Perubahan tersimpan" : "Pengeluaran tersimpan");
       closeSheet();
     } catch (error) {
       toast.error("Gagal menyimpan. Coba lagi.");
       // Sheet stays open with form data preserved
     }
   };
   ```
2. **Button shows loading state** — sudah ada `isSubmitting` dari RHF, tinggal jangan close duluan.
3. **Optimistic UI di list view** — kalau tetap mau "snappy UX", caranya bukan close-before-await, tapi: render local optimistic state di list dulu, rollback kalau write fail. Ini pattern Wishlist sudah pakai (`useWishlistItems.create` punya optimistic + rollback). Adopt pattern serupa untuk transactions kalau memang butuh perceived perf.

Untuk v2, **rekomendasi pakai pattern #1 (sederhana, robust)**. Optimistic UI bisa jadi follow-up kalau benchmark menunjukkan latency keluhan.

### 2.5 Mobile Delete Pattern Broken

**Masalah**:
```typescript
// TransactionItem.tsx
<button
  onClick={onTap}
  onContextMenu={(e) => {        // ← right-click di desktop
    if (onDelete) {
      e.preventDefault();
      setShowActions(!showActions);
    }
  }}
>
```

`onContextMenu` di mobile tidak terpicu konsisten. iOS Safari memicu setelah long-press text selection menu. Android Chrome tidak fire native long-press. User mobile praktis **tidak punya cara delete** dari list — harus tap → Edit sheet → tombol Delete (5+ taps).

Spec dan `component-patterns.md` jelas minta pattern swipe-left.

**Dampak**:
- Mobile-first app gagal di flow paling sering: hapus transaksi salah catat.
- Inkonsistensi: `TransferItem` punya `onDelete` lengkap dengan icon + button visible, tapi `TransactionItem` butuh long-press tersembunyi.

**Rekomendasi v2 (Mobile delete)**:
Tiga opsi, pilih salah satu:

**Opsi A — Swipe gesture**: Pakai library `react-swipeable` atau implement manual `pointermove` delta. Reveal delete button kanan kalau swipe-left > 60px. Threshold + spring back. Pattern paling familiar untuk user mobile (Gojek, Instagram).

**Opsi B — Long-press menu**: Implementasi proper long-press detection (sudah ada di `BottomNav.OwnerSwitcher` — bisa di-extract jadi hook `useLongPress`). Long-press → reveal context menu (Edit/Delete) di overlay.

**Opsi C — Always-visible action button**: Tampilkan icon ⋯ kebab di kanan setiap item, tap → small menu (Edit/Delete). Less hidden, tapi memakan ruang.

Saya rekomendasi **Opsi B** untuk konsistensi dengan OwnerSwitcher pattern yang sudah polished di app, plus extract `useLongPress` hook untuk reuse. Tapi kalau ingin paling mobile-native feel, **Opsi A** lebih disarankan.

Detail design Opsi B:
```
Long-press transaction item (400ms) → haptic vibrate →
overlay menu di bawah jari:
  ✏ Edit
  🗑 Hapus
  ❌ Batal
```

### 2.6 Dashboard Misses Spec — Donut & Budget Alerts

**Masalah**:
- File `SpendingDonut.tsx` dibuat tapi tidak diimport dimanapun. Dashboard pakai `SpendingByCategory.tsx` (linear bar).
- File `BudgetAlerts.tsx` dibuat lengkap (warning/over coloring) tapi tidak diimport di dashboard.

**Dampak**:
- Spec promise visual donut chart untuk spending distribution — user expect, tapi dapat list bar.
- Budget alert (kuning >75%, merah >100%) — fitur yang menjual untuk couple finance — tidak surfaced.
- Dead code menambah maintenance burden.

**Rekomendasi v2**:
- Tentukan: keep donut atau go linear bar? Linear bar memang lebih mudah baca angka, tapi donut lebih "glanceable" untuk distribution.
- **Saran kompromi**: hybrid. Top section dashboard: small donut (60% width, height 200px) showing top 5 categories by amount, dengan legend list di kanan. Below: existing `SpendingByCategory` bar list untuk detail.
- Mount `BudgetAlerts` di dashboard antara Summary dan Spending sections. Hanya render kalau ada `warning` or `over` budget — quiet kalau semua under budget.
- Hapus `SpendingDonut.tsx` lama atau refactor jadi `<SpendingDonutMini />`.

### 2.7 Berdua/Together — Tabs Hilang

**Masalah**:
Spec section 9.6 secara eksplisit minta tabs **Pacaran | Tabungan | Investasi** di halaman shared finance, dengan saving goal progress dan total investasi separation. Tasks.md task 14 ditandai done. Implementasi `/together/page.tsx` adalah generic owner overview tanpa tabs sama sekali — sama persis layoutnya dengan `/arul`/`/fifi`.

**Dampak**:
- Fitur unggulan untuk pasangan (saving goals, investment overview) hilang.
- Akun Investasi Tanah/Saham flat list dengan akun bank — semantically beda banget, secara UI sama.

**Rekomendasi v2**:
Bangun tabs dengan logika berbasis `account.type`:
- **Pacaran**: filter `account.type ∈ ["bank", "cash", "e-wallet"]` AND owner=shared.
- **Tabungan**: filter `account.type === "savings"` AND owner=shared. Tampilkan progress bar ke saving target (need new field `savingTarget` di Account schema).
- **Investasi**: filter `account.type === "investment"` AND owner=shared. Tampilkan total nilai + breakdown per akun.
- Add field optional `Account.savingTarget?: number` untuk tabungan progress.

Pakai shadcn `Tabs` component (sudah ada di project, tapi belum dipakai).

### 2.8 OwnerSwitcher Innovation tapi Hanya Mobile

**Masalah**:
`BottomNav.OwnerSwitcher` adalah komponen paling canggih: long-press 400ms → coach mark sekali pakai → progress ring → haptic vibrate → dropdown Radix. Sangat bagus. Tapi `Sidebar` desktop tidak punya equivalent — desktop user lihat 3 link flat (Arul/Together/Fifi) tanpa sense of unified "currently viewing" context.

**Rekomendasi v2**:
- Untuk desktop sidebar: collapse 3 owner links jadi 1 entry dengan icon dropdown (ChevronDown). Click reveal submenu inline. Lebih konsisten secara mental model.
- Atau: gabung Arul/Together/Fifi jadi expandable section di sidebar dengan visual current owner indicator.

### 2.9 Color Picker Akun Limited

**Masalah**:
`AccountForm` color picker hardcoded 10 warna: blue/purple-ish dominan (`#64748b`, `#475569`, `#6366f1`, `#4f46e5`, `#0f766e`, `#0d9488`, `#1d4ed8`, `#2563eb`, `#7c3aed`, `#9333ea`). Tidak ada warna pink (untuk Fifi-themed accounts), kuning, oranye, atau merah. Padahal Fifi color theme di app adalah `#E255A1` pink.

**Rekomendasi v2**:
- Expand palette ke 16-20 warna mengikuti Tailwind palette steps (slate-500, blue-500, indigo-500, purple-500, pink-500, rose-500, red-500, orange-500, amber-500, yellow-500, green-500, emerald-500, teal-500, cyan-500, sky-500).
- Atau: smart defaults berdasarkan `owner` field. Owner=arul → blue tones default, fifi → pink tones, shared → purple tones.
- Bonus: tambahkan icon picker untuk akun (sudah ada lucide setup di kategori, reuse).

### 2.10 AmountInput vs BalanceInput — Komponen Kembar

**Masalah**:
`src/components/shared/AmountInput.tsx` adalah formatted IDR input dengan thousand separators dan `Rp` prefix. `AccountForm` membuat *inline* `BalanceInput` 30 baris yang ulangi logic serupa tanpa `Rp` prefix.

**Rekomendasi v2**:
- Extend `AmountInput` dengan prop `prefix?: string` (default "Rp", bisa empty).
- Hapus inline `BalanceInput` di AccountForm, gunakan `<AmountInput prefix="" />`.

### 2.11 Custom CSS Variables Redundan

**Masalah**:
`globals.css` mendefinisikan 2 set CSS variable:
1. shadcn standard (`--background`, `--foreground`, `--primary` dst dalam HSL)
2. Custom Arthafiloka (`--bg-primary`, `--text-secondary`, `--color-income` dst sebagai hex direct)

Komponen-komponen pakai shadcn vars + Tailwind semantic colors (`bg-card`, `text-muted-foreground`). Custom Arthafiloka vars **tidak dipakai dimanapun**. Steering doc `component-patterns.md` masih reference `bg-secondary`, `text-secondary` yang sebenarnya merujuk ke variable yang tidak ter-wire ke Tailwind config.

**Rekomendasi v2**:
- Hapus custom Arthafiloka vars yang tidak dipakai dari `globals.css`. Keep yang masih relevan: `--color-income`, `--color-expense` kalau memang dipakai di Tailwind config.
- Update `component-patterns.md` agar reference shadcn standard token: `bg-card`, `text-muted-foreground`, `border-border`. 
- Jangan duplikasi token di dua sistem.

### 2.12 Empty Tab Pattern Implementation Triple

**Masalah**:
Tiga page punya tab UI custom dengan implementasi berbeda-beda:
- `transactions/page.tsx`: pakai `<button>` dengan inline className conditional
- `categories/page.tsx`: pakai `<button>` dengan inline conditional dan additional scope chips
- Wishlist filter (`WishlistFilterBar`): pakai komponen sendiri

shadcn `Tabs` sudah terinstall (`@radix-ui/react-tabs`) tapi belum dipakai.

**Rekomendasi v2**:
- Migrasi tab UI ke shadcn `Tabs` component. Konsisten, accessible, less code.
- Ekstrak `OwnerScopeFilter` komponen reusable untuk arul/fifi/shared/all chip filter (dipakai di Categories dan Wishlist).

### 2.13 Date Input — Visual Inconsistency

**Masalah**:
Form pakai native `<input type="date">`. Mobile UX bagus (numpad picker), tapi visual jelek di desktop dan tidak match style shadcn.

**Rekomendasi v2**:
- Buat komponen `<DatePicker>` based on shadcn Popover + Calendar (shadcn punya Calendar component, perlu install).
- Behaviour: di mobile tetap fallback ke native input (untuk speed); di desktop pakai popover.
- Atau: pakai `vaul` + `react-day-picker` (already common pattern with shadcn).

### 2.14 Header Tidak Punya Owner Visual Indicator

**Masalah**:
Halaman `/arul`, `/fifi`, `/together` semua pakai `<Header title="Arul">` text-only. Visual owner color tidak muncul di header — user mata cepat tidak langsung tahu konteks aktif.

**Rekomendasi v2**:
- Header pada owner pages tampilkan colored dot kecil di samping title, mengikuti owner color (arul=blue, fifi=pink, shared=purple).
- Optional: subtle border-bottom-color di header sesuai owner.
- Effect kecil tapi menambah orientation cue tanpa noise.

### 2.15 MonthPicker Terlalu Minimal

**Masalah**:
Hanya 2 chevron prev/next + label. User mau jump ke "this month" atau pick bulan jauh harus klik berkali-kali.

**Rekomendasi v2**:
- Tap label → popover dengan grid bulan (shadcn Popover + Calendar month-only mode).
- Tambah "Bulan ini" quick action.
- Tampilkan "● Bulan ini" indicator kalau lagi di current month.

### 2.16 Dashboard "Balance Hidden" Hanya Setengah

**Masalah**:
Eye toggle di hero card hide angka, tapi sheet breakdown kalau dibuka tetap tampilkan total per akun. Privacy feature tidak konsisten.

**Rekomendasi v2**:
- Persist `showBalance` ke `useAppStore` dan localStorage.
- Apply hide ke semua tempat: hero, sheet breakdown, account cards di owner pages.
- Tambah quick toggle di Settings.

### 2.17 OfflineBadge — Visibilitas Sudah Bagus, Konteks Hilang

**Masalah**:
Saat ini `OfflineBadge` muncul, tapi tidak ada indikasi "ada N pending writes yang belum sync". User offline kerja, write dimuat di cache, tapi tidak tahu apakah ada queue.

**Rekomendasi v2**:
- Listen Firestore SDK pending writes count (via `onSnapshot` metadata).
- Badge tampilkan "Offline · 3 unsynced" kalau ada queue.
- Setelah back online, tampilkan toast "Berhasil sync 3 transaksi".

---

## 3. Kritik UX (Flow Per-Flow)

### 3.1 Onboarding Flow

**State sekarang**:
1. Login Google → whitelist check → kalau email tidak whitelist, sign-out + error.
2. Whitelist OK → fetch user doc → kalau belum ada → `/onboarding`.
3. Onboarding: input nama, pilih emoji "👨 Arul" atau "👩 Fifi", auto generate inviteCode, simpan.
4. Redirect ke `/dashboard`.

**Pain points**:
- **Self-claim role tanpa partner verification**: kalau Arul accidentally pilih "Fifi" saat onboard, gak ada way untuk fix selain edit Firestore manual.
- **inviteCode digenerate tapi tidak ditampilkan ke user**: useless. Tidak ada UI untuk show code, tidak ada UI untuk input partner code.
- **Role emoji-based pilihan**: 2 button ⩭ Tinder swipe — playful tapi terasa main-main untuk app finance serius (subjective, optional fix).
- **Tidak ada step "ini gambaran apa yang akan kamu lihat"**: user fresh tidak tahu Arthafiloka itu apa setelah login.

**Rekomendasi v2**:
1. **Detect email-to-role mapping**: kalau email `arulpm010@gmail.com` → otomatis role "arul"; `fifi.work27@gmail.com` → "fifi". Onboarding hanya ask untuk konfirmasi nama display dan kasi quick tour.
2. **Partner linking step actual UI**:
   - Step 1: nama + role (auto-detect via email).
   - Step 2: "Hubungkan dengan pasangan" — show inviteCode user, dengan copy button. Kalau partner sudah di-link, skip step ini.
   - Step 3: alternatively, input partner's inviteCode untuk link-back.
   - Step 4: 3-screen quick tour: "Catat pengeluaran cepat" / "Lihat keuangan bersama" / "Track wishlist".
3. **Skip onboarding kalau sudah pernah onboard di device lain** (pakai data Firestore user doc).

### 3.2 Add Expense — < 5 Tap Goal

**State sekarang**:
Bukaan FAB → ActionSheet → tap "Pengeluaran" → ExpenseSheet open. Form: amount (auto focus, numpad), name, category quick pick (6 items + see all), owner, account, date, note. **Total clicks/taps untuk happy path**: 1 (FAB) + 1 (action sheet) + ~3 input (amount, name, category) + 1 (Save) = ~6.

**Pain points**:
- ActionSheet 1 step extra kalau user tahu mau expense (most common). Spec target < 5 tap, jadi this is a problem.
- Smart defaults bagus untuk owner (current user) dan account (preferences), tapi kalau user lagi di `/fifi` page dan `setDefaultOwner("fifi")`, expense default ke fifi — user benar. Tapi dari dashboard, default user role saja, jadi kalau Arul mau record Fifi expense, harus extra dropdown.
- Kategori filter `c.budgetScope === selectedOwner` strict. Kalau kategori "Food" dibuat untuk arul, Fifi tidak bisa pilih sama sekali — harus duplicate kategori. Real life: kategori sering shared (Food category dipakai keduanya).
- Tidak ada "use last category" memory.
- Date input default today, bagus. Tidak ada "yesterday" quick chip.

**Rekomendasi v2**:
1. **FAB long-press shortcut**: tap FAB → ActionSheet (existing). Long-press FAB → langsung open Expense sheet (most common). 5 taps → 4 taps.
2. **Refactor category scoping**: alih-alih `budgetScope` strict filter, treat scope as **budget assignment**, bukan visibility. Kategori "Food" tetap visible untuk semua owner; budgetScope hanya menentukan *budget mana yang affected*. Add field `Category.scope: "personal" | "shared"` yang menentukan visibility.
3. **Last-used category per owner per type** persist di `useAppStore` (UI state). Pre-select saat sheet open.
4. **Date quick chips**: "Hari ini · Kemarin · Lainnya". Tap chip = set date instant.
5. **Predictive name suggestions**: kalau user ketik "ma..." dropdown suggest "Makan siang", "Makan warteg" dari history (last 30 days). Optional, but huge UX win.

### 3.3 Edit Transaction Flow

**State sekarang**:
Tap row di list → ExpenseSheet/IncomeSheet/TransferSheet open pre-filled. Edit fields, Save → batch write reverse-old-apply-new.

**Pain points**:
- Edit owner field, tapi owner determines accounts/categories visible. Kalau user ubah owner, accounts dropdown jadi kosong sampai user pilih ulang. Confusing.
- Edit account dari arul ke fifi: account list refresh, tapi value di `accountId` masih lama → form invalid silent.
- Tidak ada "history" / audit untuk edit.

**Rekomendasi v2**:
1. **Reset accountId saat owner changed**: pakai `useEffect` di sheet:
   ```typescript
   useEffect(() => {
     // Saat owner berubah, kalau account current tidak match owner, reset
     const current = accounts.find(a => a.accountId === watch("accountId"));
     if (current && current.owner !== selectedOwner) {
       setValue("accountId", "");
       setValue("accountName", "");
     }
   }, [selectedOwner]);
   ```
2. **Show dirty indicator**: kalau user start edit but tutup tanpa save, alert "Perubahan tidak tersimpan, yakin tutup?".
3. **Optional: edit history** di Firestore subcollection (low priority).

### 3.4 Delete Transaction

Sudah dibahas di §2.5. Recap:
- Mobile: tap → edit sheet → scroll → tombol Hapus → konfirmasi (5+ taps).
- Desktop: right-click → reveal small Delete button → click (3 taps), tapi tidak intuitive.

**v2 fix**: long-press menu (preferred) atau swipe.

### 3.5 Wishlist Flow

**State sekarang (sudah baik)**:
- Filter owner (Arul/Fifi/Berdua/Semua).
- Group by category collapsible.
- Mark purchased toggle dengan optimistic update.
- URL detection di lokasi field (jadi clickable link).
- Progress bar per category + overall summary.

**Pain points**:
- **Mark purchased ≠ catat expense**: user beli iPhone 1jt → toggle wishlist purchased → tapi saldo akun belum berkurang. User harus secara manual catat expense lagi → duplicasi effort + risk lupa.
- **No price tracking history**: kalau harga berubah (sale), user edit `harga` field, history hilang.
- **Empty wishlist categories untuk user baru**: tidak ada seed kategori default (`Elektronik`, `Fashion`, dst). User harus bikin kategori dari nol → friction.
- **Owner field di wishlist pakai label "Berdua"**: inconsistent dengan tab "Together" di kategori page.

**Rekomendasi v2**:
1. **Mark purchased dengan opsi "Catat sebagai expense"**: toggle button dropdown:
   - "Tandai sudah beli (tanpa catat expense)"
   - "Tandai sudah beli + catat expense" → buka ExpenseSheet pre-filled (nama=item, amount=harga, category=mapping kategori wishlist→category transaksi, default account, date=today).
2. **Seed default wishlist kategori** untuk user baru: Elektronik, Fashion, Hobi, Rumah Tangga, Hadiah, Lainnya.
3. **Track purchase history**: saat purchasedAt di-set, snapshot harga + accountId + transactionId di subcollection `wishlistItems/{id}/purchases`. Kalau di-unmark, history tetap.
4. **Konsistensi label**: pakai "Bareng" / "Together" dimana saja.

### 3.6 Categories & Budget Page

**State sekarang**:
Tab Transaksi/Wishlist × scope filter All/Arul/Fifi/Together. Categories: tap untuk edit. Wishlist categories: tap untuk edit, ada delete button.

**Pain points**:
- **2-level navigation confusing**: 2 tabs + 4 scope chips = 8 view states. User butuh waktu orient.
- **Header MonthPicker hanya muncul di tab Transaksi** → pemicu re-layout. UI shift tidak smooth.
- Empty state tab Wishlist+Together: "Belum ada kategori untuk Together" — but Wishlist owner field actually saves "shared", display label "Bareng", filter says "Together". Naming chaos.
- **Tidak ada bulk operations**: Kalau ada 30 kategori dan user mau bulk update budget, harus tap 1-1.
- **Budget total per scope tidak ditampilkan** sebagai summary.
- **Category page tidak ada way to see "transaksi di kategori ini"**: user mau audit which transactions counted toward Food category, harus go to transactions page filter.

**Rekomendasi v2**:
1. **Restructure**: Pisahkan jadi 2 page terpisah:
   - `/categories` → kategori transaksi only.
   - `/wishlist/categories` → kategori wishlist only (atau di Wishlist page itu sendiri).
   Hapus tab Transaksi/Wishlist di `/categories`.
2. **Scope filter** tetap, tapi pakai `<Tabs>` shadcn untuk konsistensi.
3. **Total budget summary**: di atas list, tampilkan card "Total budget pengeluaran: Rp X.XXX.XXX · Spent: Rp Y.YYY.YYY (Z%)".
4. **Category detail sheet**: tap kategori → bottom sheet dengan info budget + list transaksi this month + "Edit" + "Hapus" buttons.

### 3.7 Settings Page

**State sekarang**:
Profile display + default account selector + theme toggle + logout. Functional, tapi minimal.

**Pain points**:
- **Default account selector menampilkan SEMUA akun** (Arul + Fifi + Shared) → tidak make sense kalau user adalah Arul, default account mereka tidak akan akun Fifi.
- **Tidak ada toggle hide balance global**.
- **Tidak ada quick categories editor** (spec mention `quickCategories[]` di User preferences, tapi UI tidak ada).
- **Tidak ada info partner connection status** (spec mention).
- **Tidak ada quick action "pull-to-refresh"** atau force-resync.
- **Theme toggle 3 buttons sederhana, fine**.
- **Tidak ada "About" section** dengan version + GitHub link + privacy info.

**Rekomendasi v2**:
1. Filter default account ke `account.owner === currentUser.role`.
2. Add: Privacy section dengan toggle "Sembunyikan saldo otomatis di hero card".
3. Add: Quick Categories editor — pilih 6 kategori favorite untuk grid quick-pick di expense form. Drag-to-reorder.
4. Add: Partner info section — tampilkan partner name, status link, inviteCode user (untuk dishare).
5. Add: Data section — total transactions, oldest date, "Export CSV" button (future).
6. Add: About section — version dari package.json, link ke source/issue tracker, privacy note.

### 3.8 Login Flow

**State sekarang**:
Single button "Login dengan Google", whitelist check post-login.

**Pain points**:
- Whitelist enforcement runs after login. Brief moment user authenticated lalu sign-out. Risiko: kalau Firestore Auth kick-out fail, user terlanjur authenticated.
- Tidak ada "remember email" untuk faster re-login.
- Error message "Akses ditolak. Akun ini tidak terdaftar." → fine.

**Rekomendasi v2**:
1. Move whitelist check ke Firestore rules (sudah). Client-side hanya display "Akses ditolak" kalau Firestore initial fetch fail dengan permission-denied.
2. Add subtle copy: "Aplikasi ini private untuk Arul & Fifi. Kalau kamu kebetulan menemukannya, mohon jangan lapor ke ITSec :)".

### 3.9 Bottom Nav Navigation

**State sekarang (sudah inovatif)**:
5 tabs: Home / OwnerSwitcher / Wishlist / Transaksi / More. OwnerSwitcher long-press untuk ganti owner.

**Pain points**:
- "Wishlist" sebagai 1 tab utama is odd — feature paralel tapi tidak sentral. Kompetitor app finance jarang punya wishlist sebagai bottom nav primary.
- "Transaksi" tab dan "Home" overlap fungsi (home has recent transactions, transactions has full list).
- "More" tab mobile hanya 3 link → user untuk akses Akun butuh 2 tap.

**Rekomendasi v2 (alternative nav)**:

Opsi A — Keep 5 tabs but reshuffle: **Home / OwnerSwitcher / Transaksi / Wishlist / More**. Same content, just reorder by usage frequency.

Opsi B — Reduce to 4 tabs + bigger FAB: **Home / OwnerSwitcher / Transaksi / More**. Move Wishlist to More. FAB occupies center slot visually (like Twitter or Notion mobile).

Opsi C — Tetap (no change). Current is fine if user habit established.

Saya rekomendasi **Opsi A** — minimal disruption, bandit shuffle improve flow.

### 3.10 Header & Page Hierarchy

**State sekarang**:
Each page has sticky `<Header>` h-14 dengan title + optional MonthPicker/actions. Konsisten.

**Pain points**:
- Title tidak punya hint tentang scope/filter. "Transaksi" — but kalau owner=arul filtered, title masih "Transaksi" generic.
- Page title `Arthafiloka` di dashboard → boring di mobile, hilang opportunity show summary glance.

**Rekomendasi v2**:
- Dashboard header: replace title "Arthafiloka" dengan greeting + trend: "Halo Arul · Hemat 12% bulan ini" or similar. Kontekstualis lebih engaging.
- Owner pages: title format "Arul · Mei 2026" — explicit context.

---

## 4. Tech Debt & Code Quality

### 4.1 Dead Code

| File | Status |
|---|---|
| `src/components/dashboard/SpendingDonut.tsx` | Tidak diimport |
| `src/components/dashboard/BudgetAlerts.tsx` | Tidak diimport (ada di file tree) |
| `src/components/shared/OwnerBadge.tsx` | Tidak dipakai |
| `src/components/shared/PageTransition.tsx` | Tidak dipakai |
| `src/app/(app)/berdua/` | Folder kosong |

**Action v2**: Decide — wire up, delete, atau parking di folder `_archived/`. Kebijakan jelas.

### 4.2 Type Safety Compromised

```typescript
resolver: zodResolver(transactionSchema) as any,
```

Cast `as any` muncul di setiap form (Expense, Income, Transfer, Account, Category, Wishlist). Workaround untuk type mismatch zod v4 ↔ @hookform/resolvers ↔ react-hook-form.

**Root cause**: Zod 4 punya breaking change di TypeScript inference, @hookform/resolvers belum fully compat saat install.

**Rekomendasi v2**:
1. Cek versi @hookform/resolvers terbaru (v3.x+). Update jika ada compat untuk zod 4.
2. Atau: downgrade zod ke 3.x stable (massive ecosystem support).
3. Hilangkan all `as any`.

### 4.3 Multiple Listeners untuk Query yang Sama

Dashboard memanggil `useTransactions(filters)`, `useSummary(month)`, `useBudgetStatus(month)` — semuanya listen `transactions` collection dengan overlap range. 3 listener identik aktif simultan untuk data yang sama.

**Dampak**:
- Lebih banyak Firestore reads (perlu ditest, tapi each listener punya local cache jadi network read terjadi sekali).
- Memory overhead.

**Rekomendasi v2**:
1. Centralize: `useMonthlyTransactions(month, filters)` jadi single source of truth. Other hooks compute dari result-nya:
   ```typescript
   const { transactions } = useMonthlyTransactions(month);
   const summary = useMemo(() => computeSummary(transactions), [transactions]);
   const budgetStatus = useMemo(() => computeBudgetStatus(transactions, categories), [transactions, categories]);
   ```
2. Optionally: Zustand store cache last result, hooks read dari store.

### 4.4 Hardcoded Pagination Limit

`useTransactions` punya `limit(20)` di query, tapi tidak expose `loadMore`. User dengan >20 transaksi/bulan invisible.

**Rekomendasi v2**:
- Add cursor-based pagination dengan `startAfter()` Firestore.
- Hook return `{ transactions, isLoading, hasMore, loadMore }`.
- TransactionList: implement infinite scroll (IntersectionObserver) atau "Load more" button.

### 4.5 Direct Firestore Access in Settings Page

```typescript
// src/app/(app)/settings/page.tsx
await updateDoc(doc(db, "users", firebaseUser.uid), {
  "preferences.defaultAccountId": accountId,
});
```

`coding-standards.md` jelas: "Firestore operations HARUS melalui service functions di `src/lib/firestore/`". Settings page violates ini.

**Rekomendasi v2**:
- Buat `src/lib/firestore/users.ts` dengan `updatePreferences()`, `linkPartner()` dst.
- Refactor settings page pakai service.

### 4.6 No Test Coverage

Hanya 1 test file: `src/__tests__/wishlist.property.test.ts` (property-based via fast-check) + `src/lib/utils/__tests__/wishlist.unit.test.ts`. Service layer (transactions/transfers/accounts) yang justru paling rentan bug — tidak ada test.

**Rekomendasi v2**:
- Mocking Firestore via `firebase-mock` atau emulator.
- Tests untuk:
  - `transactionsService.create/update/delete` balance integrity (positive + negative case).
  - `transfersService.update` deltas merging logic (krusial, current logic merge per accountId).
  - `formatCurrency`, `formatDate` utility.
  - Zod schemas validation positive + negative.
- Target coverage: 70% untuk `lib/firestore/` dan `lib/utils/`.

### 4.7 TypeScript Strictness

`tsconfig.json` belum diperiksa. Worth audit untuk:
- `strict: true` (ensure)
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`

Sertakan di v2 audit.

### 4.8 Accessibility

- Banyak `<button>` tanpa `aria-label` (eye toggle, kebab menus, FAB di Wishlist).
- `OwnerSwitcher` punya `aria-haspopup` & `aria-expanded` — bagus, tapi keyboard navigation di-rolled own (not via Radix). Focus trap + arrow key cycling missing.
- Color contrast: belum diverify, terutama income green pada light mode (#0F9B58 on white pass AA, tapi pada `bg-card` yang lighter perlu test).
- `<input type="date">` native: accessibility OK, tapi custom DatePicker (rekomendasi §2.13) need aria-roles.

**Rekomendasi v2**:
- Audit accessibility dengan axe-core atau Lighthouse.
- Add `aria-label` ke semua icon-only buttons.
- Add focus visible styles ke custom buttons (yang sekarang pakai inline className conditional).

### 4.9 Bundle Size

Tidak ada dynamic import. Recharts (~90KB), framer-motion (~50KB), date-fns (~30KB), firebase (~50KB) semua di main bundle. Worth audit dengan `next-bundle-analyzer`.

**Rekomendasi v2**:
- Dynamic import semua sheets (`ExpenseSheet`, `IncomeSheet`, `TransferSheet`, `AccountForm`, dll). Mereka jarang dibutuhkan di first paint.
- Dynamic import donut chart (kalau di-wire kembali).
- Code-split per route (Next.js handles by default, tapi shared chunks bisa dioptim).

### 4.10 Steering Doc Drift

`component-patterns.md` dan `coding-standards.md` reference token `bg-secondary`, `text-secondary`, `bg-tertiary`, `text-muted` yang bukan official Tailwind/shadcn class — itu reference Arthafiloka custom CSS variable (yang juga tidak di-wire ke Tailwind extend). Kalau dev baru ikuti steering, code mereka tidak akan compile dengan token tersebut.

**Rekomendasi v2**:
- Update steering docs ke shadcn standard tokens.
- Sync `component-patterns.md` dengan implementasi sebenarnya (yang pakai `bg-card`, `text-muted-foreground`, `border-border`).

---

## 5. Roadmap V2 — Sprint Plan

Setiap sprint ≈ 1 minggu (1 dev part-time). Tasks dikelompokkan per epik. Setiap task punya: estimate (S/M/L), risiko, dan deliverable.

**Legend**:
- **S** = Small (≤ 4 jam)
- **M** = Medium (1–2 hari)
- **L** = Large (3–5 hari)

### Sprint 1 — Foundation Cleanup (Quick Wins)

**Goal**: Bersihkan inkonsistensi kosmetik, dead code, dan naming chaos. Semua perubahan low-risk, tidak menyentuh data layer.

| # | Task | Size | Risk | Notes |
|---|---|---|---|---|
| 1.1 | Pilih nama brand final (Arthafiloka). Update `package.json`, `metadata`, login UI, README, semua steering & spec docs. | M | Low | Konsensus user dulu sebelum eksekusi. |
| 1.2 | Pilih label "shared" final (rekomendasi: `Bareng`). Buat `src/lib/constants/labels.ts`. Replace semua hardcoded "Berdua"/"Together"/"Bersama" → import dari constants. | M | Low | grep audit + replace. |
| 1.3 | Hapus folder `(app)/berdua/` kosong. | S | Low | git rm. |
| 1.4 | Hapus dead components: `OwnerBadge.tsx`, `PageTransition.tsx`. (`SpendingDonut.tsx` & `BudgetAlerts.tsx` simpan dulu, akan dipakai sprint 2.) | S | Low | Verify no import via grep. |
| 1.5 | Hapus custom CSS variables redundan di `globals.css` (`--bg-primary`, `--text-secondary`, dst yang tidak dipakai Tailwind). | S | Med | Test light/dark mode manual. |
| 1.6 | Update README.md dari boilerplate ke project description. | S | Low | Include: setup, scripts, tech stack, link to plan.md. |
| 1.7 | Update `component-patterns.md` agar reference shadcn standard tokens (`bg-card`, `text-muted-foreground`), bukan ghost tokens. | S | Low | |
| 1.8 | Update `arthaloka-context.md` → `arthafiloka-context.md` rename + content sync. | S | Low | |
| 1.9 | Audit `tsconfig.json` → enable `noUnusedLocals`, `noUnusedParameters`. Fix resulting errors. | M | Low | Mungkin reveal dead code lain. |

**Deliverable Sprint 1**: Codebase dengan 1 nama brand, 1 label "shared", no dead code, steering docs accurate.

---

### Sprint 2 — Dashboard Completeness

**Goal**: Surfacing fitur dashboard yang sudah dibuild tapi tidak dipasang. Wujudkan spec dashboard 100%.

| # | Task | Size | Risk | Notes |
|---|---|---|---|---|
| 2.1 | Mount `BudgetAlerts` di `dashboard/page.tsx` antara SummaryCards dan SpendingByCategory. | S | Low | Render only if alerts.length > 0. |
| 2.2 | Bangun `<SpendingDonutMini />` di `src/components/dashboard/`. Recharts donut, top 5 categories, legend di kanan. Mount di dashboard. | M | Med | Recharts SSR concern → dynamic import. |
| 2.3 | Dynamic import untuk donut chart. Loading state (skeleton circle). | S | Low | |
| 2.4 | Owner color visual indicator di `<Header>` for owner pages. Subtle dot + colored bottom border. | S | Low | |
| 2.5 | Dashboard greeting kontekstual (replace title "Arthafiloka" dengan "Halo {name} · {trend}"). Trend computed dari delta vs prev month. | M | Low | Nice-to-have, bisa di-defer. |
| 2.6 | `MonthPicker` tap label → popover dengan month grid + "Bulan ini" quick action. | M | Med | shadcn Popover + custom grid. |

**Deliverable Sprint 2**: Dashboard 100% sesuai spec, plus polish header dan month picker.

---

### Sprint 3 — Refactor Sheets (Critical Refactor)

**Goal**: DRY massive duplication di Expense/Income/Transfer sheets. Fix submit UX trap.

| # | Task | Size | Risk | Notes |
|---|---|---|---|---|
| 3.1 | Extract `<DeleteTransactionDialog />` dan `<DeleteTransferDialog />` reusable. Replace inline dialogs di 3 sheets. | M | Low | |
| 3.2 | Refactor `ExpenseSheet` + `IncomeSheet` jadi shared `<TransactionSheet mode="expense"|"income" />`. Conditional fields (label, button color, category filter). | L | Med | Test edit + create flow keduanya. |
| 3.3 | **FIX SUBMIT TRAP**: await write dulu, baru `closeSheet()`. Toast.success on succes, toast.error on fail. Sheet tetap open kalau error. | M | High | High visibility bug. Test offline scenarios. |
| 3.4 | `TransferSheet` adopt same submit pattern + toast. Hapus `setTimeout(closeSheet, 800)` hack. | S | Low | |
| 3.5 | Reset `accountId` saat owner berubah (kalau current account.owner ≠ selectedOwner). | S | Med | Prevent silent invalid state. |
| 3.6 | Add "dirty form" guard: kalau user edit then close tanpa save, AlertDialog "Perubahan tidak tersimpan, yakin tutup?". | M | Low | |
| 3.7 | Replace inline `BalanceInput` di AccountForm dengan `<AmountInput prefix="" />`. | S | Low | |
| 3.8 | AccountForm: extend color picker palette ke 16 warna (Tailwind 500 palette). Optional icon picker. | M | Low | |

**Deliverable Sprint 3**: ~600 baris kode dihilangkan. No more silent submit failures. UX feedback consistent.

---

### Sprint 4 — Mobile Delete & Owner Pages

**Goal**: Fix mobile delete pattern, DRY owner pages.

| # | Task | Size | Risk | Notes |
|---|---|---|---|---|
| 4.1 | Extract `useLongPress` hook dari `BottomNav.OwnerSwitcher` ke `src/hooks/useLongPress.ts`. | M | Med | Generic API: `useLongPress({ onLongPress, durationMs, onMove? })`. |
| 4.2 | Build `<TransactionItemActions />` overlay menu component. Long-press to reveal Edit / Hapus / Batal. | M | Med | Pakai shadcn Popover atau Drawer. |
| 4.3 | Replace `onContextMenu` di `TransactionItem` dengan `useLongPress` + new menu. Test iOS Safari + Android Chrome. | M | High | Manual test on actual devices critical. |
| 4.4 | Same pattern di `TransferItem`. | S | Low | |
| 4.5 | Same pattern di `WishlistItemCard`. | S | Low | |
| 4.6 | **Refactor owner pages**: Extract `<OwnerOverview owner={owner} />` di `src/components/dashboard/OwnerOverview.tsx`. Tiga page (`arul/`, `fifi/`, `together/`) jadi 5-baris wrapper. | M | Med | Verify `setDefaultOwner` cleanup tetap work. |

**Deliverable Sprint 4**: Mobile delete works native. Owner pages ~80% smaller code.

---

### Sprint 5 — Berdua Tabs & Cross-Feature Integration

**Goal**: Implement spec section 9.6 (Berdua tabs) + integrasi Wishlist↔Transactions.

| # | Task | Size | Risk | Notes |
|---|---|---|---|---|
| 5.1 | Extend Account schema: tambah field optional `savingTarget?: number` dan `targetDate?: Timestamp`. Migration aman (optional fields). Update `account.schema.ts`. | M | Low | Existing accounts tidak butuh update. |
| 5.2 | `/together` page rebuild dengan shadcn `<Tabs>`: Pacaran / Tabungan / Investasi. Filter by account.type. | L | Med | Progress bar untuk savings target. |
| 5.3 | Tab Investasi: total nilai + breakdown per akun + simple "performa" placeholder (future: actual return calc). | M | Low | |
| 5.4 | AccountForm: kalau type=`savings`, show optional fields `savingTarget` + `targetDate`. | M | Low | |
| 5.5 | Wishlist mark purchased → opsi "Catat sebagai expense". UI: dropdown atau toggle pop-up. Pre-fill ExpenseSheet (linkage). | L | Med | Add field `WishlistItem.linkedTransactionId?: string`. |
| 5.6 | Wishlist seed default categories untuk first-time user (Elektronik, Fashion, Hobi, Hadiah, Lainnya). Jalankan saat onboarding done. | M | Low | Add ke onboarding flow. |
| 5.7 | Naming consistency check final: pastikan semua label "Bareng" konsisten setelah Sprint 1.2. | S | Low | Re-grep audit. |

**Deliverable Sprint 5**: Berdua page sesuai spec. Wishlist terhubung ke transaction tracking real.

---

### Sprint 6 — Pagination, Search, Performance

**Goal**: Fix scaling issues yang akan muncul setelah 1+ tahun pakai.

| # | Task | Size | Risk | Notes |
|---|---|---|---|---|
| 6.1 | `useTransactions` add cursor-based pagination. Hook return `{ transactions, isLoading, hasMore, loadMore }`. | M | Med | Test boundary conditions (empty, exactly N, N+1). |
| 6.2 | TransactionList: implement IntersectionObserver-based infinite scroll. Fallback: "Load more" button. | M | Low | |
| 6.3 | Search transactions by name. Add input di TransactionFilters. Client-side filter (since data already loaded by month). | M | Low | Or Firestore-side dengan denormalized lowercase name. |
| 6.4 | Centralize monthly transactions: `useMonthlyTransactions` single source, `useSummary` & `useBudgetStatus` derive from it via memo. | L | Med | Big refactor, might touch 5+ files. |
| 6.5 | Dynamic import semua sheets: `ExpenseSheet`, `IncomeSheet`, `TransferSheet`, `AccountForm`, `CategoryForm`, `WishlistItemForm`, `WishlistCategoryForm`. | M | Med | Test loading state during sheet open. |
| 6.6 | Bundle size audit dengan `@next/bundle-analyzer`. Document baseline + post-optim numbers. | M | Low | Add npm script `npm run analyze`. |

**Deliverable Sprint 6**: App handles 1000+ transactions per month tanpa degradasi. Bundle size reduced.

---

### Sprint 7 — Onboarding & Settings Polish

**Goal**: Improve user-facing flows yang stagnant sejak v1.

| # | Task | Size | Risk | Notes |
|---|---|---|---|---|
| 7.1 | Onboarding auto-detect role from email. Skip role-pick step kalau email match whitelist mapping. | S | Low | |
| 7.2 | Onboarding step "Hubungkan dengan pasangan": show inviteCode user dengan copy button. Show input field untuk partner code. | M | Med | Backend ready (`linkPartner`), tinggal UI. |
| 7.3 | Onboarding 3-screen tour (Catat cepat / Lihat bersama / Track wishlist). Skippable. | M | Low | Pakai Framer Motion. |
| 7.4 | Settings: Privacy section dengan toggle global "Hide balance". Persist Zustand + localStorage. | M | Low | |
| 7.5 | Settings: filter default account selector ke `account.owner === currentUser.role`. | S | Low | |
| 7.6 | Settings: Quick Categories editor (drag-to-reorder 6 favorit untuk grid). | L | Med | Need drag library (@dnd-kit). Or simple up/down arrows. |
| 7.7 | Settings: Partner info section (display partner name, status, kode invite). | M | Low | |
| 7.8 | Settings: About section (version dari package.json, source link, privacy note). | S | Low | |
| 7.9 | Move direct Firestore access di settings ke `lib/firestore/users.ts` service. | M | Low | |

**Deliverable Sprint 7**: Onboarding feels like a complete intro. Settings is feature-rich.

---

### Sprint 8 — Quality, Testing, Accessibility

**Goal**: Lock down quality before considering v2 "done".

| # | Task | Size | Risk | Notes |
|---|---|---|---|---|
| 8.1 | Resolve `zodResolver as any` casts. Update @hookform/resolvers atau downgrade Zod. | M | Med | Test all forms post-fix. |
| 8.2 | Service layer tests dengan Firebase emulator: transactions create/update/delete balance integrity. | L | Med | Set up emulator in CI. |
| 8.3 | Service layer tests: transfers update merge deltas logic. | M | Med | |
| 8.4 | Util tests: formatCurrency edge cases (0, negative, very large), formatDate (today/yesterday/older). | M | Low | |
| 8.5 | Zod schema tests positive + negative cases. | M | Low | |
| 8.6 | Accessibility audit dengan axe-core. Fix top 10 violations. | M | Low | aria-labels, focus visible, color contrast. |
| 8.7 | OwnerSwitcher: add proper keyboard support (Arrow up/down to cycle options) plus Radix proper integration. | M | Med | |
| 8.8 | Lighthouse audit. Target: Performance ≥ 90, Accessibility ≥ 95. | M | Low | |

**Deliverable Sprint 8**: 70% test coverage di critical paths. Accessibility passes axe + manual audit.

---

### Sprint 9 (Optional) — PWA & Future Features Foundation

**Goal**: Set up untuk fitur besar masa depan.

| # | Task | Size | Risk | Notes |
|---|---|---|---|---|
| 9.1 | PWA manifest + service worker (next-pwa). Install prompt di mobile. | M | Med | Test install flow Android & iOS. |
| 9.2 | OfflineBadge upgrade: tampilkan pending writes count. | M | Low | Use Firestore SDK metadata. |
| 9.3 | Foundation untuk recurring transactions: schema dan UI placeholder ("Coming soon"). | M | Low | Not full impl. |
| 9.4 | Foundation untuk export CSV: simple "Export" button di Settings yang generate + download. | M | Low | |
| 9.5 | Pull-to-refresh real implementation (browser-based via TouchEvent). Mobile only. | L | Med | |

**Deliverable Sprint 9**: App installable as PWA. Foundation untuk fitur masa depan.

---

## 6. Quick Wins (≤ 4 jam each, bisa dikerjakan opportunistically)

Kalau ada waktu sela atau lagi mood polish, ambil dari sini:

1. Hapus folder `(app)/berdua/` kosong (1 menit).
2. Hapus dead components `OwnerBadge.tsx`, `PageTransition.tsx` (5 menit).
3. Update README dari boilerplate (30 menit).
4. Mount `BudgetAlerts` di dashboard (15 menit).
5. Filter default account selector di settings ke owner=current user (10 menit).
6. Tambah aria-label ke FAB, eye toggle, kebab buttons (1 jam).
7. Replace inline BalanceInput di AccountForm dengan AmountInput (30 menit).
8. Fix `submitError`/`submitSuccess` state yang dead di Expense/Income sheets — hapus, atau tampilkan sebelum closeSheet (30 menit *kalau sheet flow di-fix*).
9. Tambah "Hari ini" / "Kemarin" quick chips di date input transaction (1 jam).
10. Owner color dot di Header owner pages (45 menit).

---

## 7. Risk & Mitigation

| Risiko | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Refactor sheets breaks edit flow | Medium | High | Manual test matrix: create + edit untuk expense/income/transfer × edit existing + new × valid + invalid. Stage di feature branch. |
| Naming change "Berdua"→"Bareng" misses tempat | Medium | Low | Centralize di constants, grep audit semua file. |
| Wishlist→Transaction integration menambah complexity ke schema | Medium | Med | Optional field `linkedTransactionId`, backward compat. Don't break existing data. |
| Mobile delete refactor regresi di desktop | Low | Med | Long-press juga work di desktop (mouse hold), test both. |
| Pagination breaks existing query indexes | Low | High | Cursor-based with same `orderBy` + `where` clauses. Existing indexes tetap berlaku. |
| Tests dengan emulator butuh CI setup | Medium | Low | Document setup script, run lokal dulu. CI optional di v2. |

---

## 8. Success Metrics V2

**Sebelum v2 considered done**:

- ✅ Single brand name across all surface (Arthafiloka).
- ✅ Single shared label across all UI (Bareng / Together / pilih one).
- ✅ Add Expense flow ≤ 5 taps (FAB long-press shortcut).
- ✅ Submit flow tidak silent fail (toast feedback always).
- ✅ Mobile delete works via long-press (verified iOS Safari + Android Chrome).
- ✅ Berdua tabs implemented (Pacaran/Tabungan/Investasi).
- ✅ Dashboard donut + budget alerts visible.
- ✅ Owner pages refactored (no copy-paste).
- ✅ Sheets refactored (TransactionSheet polymorphic).
- ✅ 70% test coverage on `lib/firestore/` & `lib/utils/`.
- ✅ Bundle size baseline + post-optim documented (target: -20%).
- ✅ Lighthouse: Perf ≥ 90, A11y ≥ 95.
- ✅ axe-core: 0 critical violations.

**Continuous metrics post-v2**:

- LCP < 2s mobile 4G
- Firestore reads/day < 1000 per user
- Time-to-add-expense < 10 detik (manual measure)
- Realtime sync latency < 2s antar device

---

## 9. What's NOT in V2 (Explicit Non-Goals)

Untuk fokus, hal berikut **bukan v2**:

- Multi-currency (still IDR-only).
- More than 2 users (still hardcoded whitelist).
- Server-side rendering optimization (still client-side SPA).
- Push notifications (need Firebase Cloud Messaging setup, scope creep).
- Recurring transactions full implementation (foundation only).
- Saving goals advanced (basic target field only).
- Net worth tracker timeline (current + investasi totals only).
- Export to PDF / advanced export (CSV foundation only).
- Multi-language (still Bahasa Indonesia + English mix per existing convention).
- Custom themes / branding per user.

Ini bisa jadi **v3 backlog**.

---

## 10. Open Questions (Need Decision Before Sprint Start)

Setiap pertanyaan butuh konfirmasi user/team sebelum implementasi:

1. **Brand name final**: Arthafiloka atau Arthaloka?
   - *Saya rekomendasi*: **Arthafiloka** (sudah dipakai di package.json + UI).
2. **Shared label**: Bareng / Together / Bersama / Berdua?
   - *Saya rekomendasi*: **Bareng** (relax, native, 6 huruf cocok untuk button).
3. **Mobile delete pattern**: long-press menu atau swipe gesture?
   - *Saya rekomendasi*: **long-press menu** (reuse existing OwnerSwitcher pattern).
4. **Donut chart di dashboard**: keep / replace dengan bar / hybrid?
   - *Saya rekomendasi*: **hybrid** (donut top + bar list bawah).
5. **Wishlist → Transaction integration**: opt-in toggle atau auto-create?
   - *Saya rekomendasi*: **opt-in dropdown** ("Tandai beli" / "Tandai beli + catat expense").
6. **Email/password auth**: tetap Google-only atau add fallback?
   - *Saya rekomendasi*: **Google-only** (kurangi auth surface, sudah cukup untuk 2 user).
7. **Onboarding tour**: bikin sekarang atau defer?
   - *Saya rekomendasi*: **defer ke Sprint 7** (low priority untuk 2-user app).
8. **Berdua tabs categorization**: by `account.type` atau add separate field?
   - *Saya rekomendasi*: **by account.type** (existing data, no migration).
9. **Pagination strategy**: cursor-based atau page-numbered?
   - *Saya rekomendasi*: **cursor-based** (Firestore native, scales better).
10. **Test framework split**: keep vitest / migrate to playwright untuk e2e?
    - *Saya rekomendasi*: **vitest unit + integration only di v2**, e2e di v3.

---

## 11. Appendix: File-by-File Action List

Quick reference untuk dev. Format: `path` — action.

### Hapus / Cleanup
- `src/app/(app)/berdua/` — hapus (kosong).
- `src/components/shared/OwnerBadge.tsx` — hapus (unused).
- `src/components/shared/PageTransition.tsx` — hapus (unused).
- `src/components/dashboard/SpendingDonut.tsx` — refactor ke `SpendingDonutMini` atau hapus.
- `globals.css` — hapus custom `--bg-primary`, `--text-secondary` group yang tidak dipakai.
- `README.md` — replace boilerplate dengan project description.

### Refactor / Konsolidasi
- `src/components/transactions/ExpenseSheet.tsx` + `IncomeSheet.tsx` → merge ke `TransactionSheet.tsx`.
- `src/components/transactions/TransferSheet.tsx` → adopt new submit pattern.
- `src/app/(app)/arul/page.tsx` + `fifi/page.tsx` + `together/page.tsx` → tipis, pakai `<OwnerOverview owner={owner} />`.
- `src/components/transactions/TransactionItem.tsx` → replace `onContextMenu` dengan `useLongPress`.
- `src/components/accounts/AccountForm.tsx` — extract `BalanceInput` inline → pakai `AmountInput`.
- `src/lib/firestore/users.ts` — buat baru, pindahkan direct `updateDoc` dari settings.
- `src/hooks/useLongPress.ts` — extract dari BottomNav.

### Buat Baru
- `src/lib/constants/labels.ts` — owner labels constants.
- `src/components/dashboard/OwnerOverview.tsx` — shared owner page.
- `src/components/dashboard/SpendingDonutMini.tsx` — small donut + legend.
- `src/components/transactions/DeleteTransactionDialog.tsx` — reusable.
- `src/components/transactions/TransactionSheet.tsx` — polymorphic.
- `src/components/transactions/TransactionItemActions.tsx` — long-press menu.
- `src/components/together/PacarTab.tsx` + `TabunganTab.tsx` + `InvestasiTab.tsx`.

### Add / Modify
- `src/components/layout/Header.tsx` — add owner color indicator prop.
- `src/components/dashboard/page.tsx` — mount BudgetAlerts + Donut.
- `src/components/dashboard/SummaryCards.tsx` — persist hide-balance state.
- `src/components/shared/MonthPicker.tsx` — popover with month grid.
- `src/components/shared/AmountInput.tsx` — accept `prefix` prop.
- `src/hooks/useTransactions.ts` — add cursor-based pagination.
- `src/hooks/useMonthlyTransactions.ts` — buat baru, central source.
- `src/types/account.ts` — tambah optional `savingTarget`, `targetDate`.
- `src/types/wishlist.ts` — tambah optional `linkedTransactionId`.
- `src/store/useAppStore.ts` — tambah `showBalance`, `lastUsedCategoryId`.
- `tsconfig.json` — `noUnusedLocals`, `noUnusedParameters`.

### Tests
- `src/lib/firestore/__tests__/transactions.test.ts` — balance integrity.
- `src/lib/firestore/__tests__/transfers.test.ts` — deltas merge.
- `src/lib/utils/__tests__/formatCurrency.test.ts` — edge cases.
- `src/lib/validations/__tests__/*.test.ts` — Zod schemas.

---

*Dokumen ini akan diupdate seiring sprint progress. Diskusi & feedback welcome.*
*Author: Tim Arthafiloka (analyzed by Kiro)*
*Last updated: Mei 2026*

---

## 12. V2 Manual QA Log

> Log untuk task **4.7** (Sprint 4 — Mobile Delete & Owner Pages Refactor).
> Tujuan: verifikasi long-press menu (delete/edit) bekerja konsisten di iOS Safari, Android Chrome, dan desktop browser, sesuai AC5.8.
>
> **Status checklist**: `[ ]` belum di-test · `[x]` lulus · `[!]` gagal (catat issue di "Catatan").
>
> Sebelum sign-off Sprint 4, semua baris di tabel di bawah **harus** punya status `[x]` atau `[!]` (bukan `[ ]`). Real-device testing wajib untuk iOS Safari + Android Chrome — DevTools mobile emulation hanya boleh dipakai sebagai fallback dengan catatan eksplisit di kolom "Catatan".

### 12.1 Expected Behavior (Reference dari code analysis)

Berikut perilaku yang harus diobservasi selama test, derived dari implementasi `src/hooks/useLongPress.ts` dan consumer (`TransactionItem`, `TransferItem`, `WishlistItemCard`):

| Gesture | Trigger condition | Side effect |
|---|---|---|
| **Tap** | Pointer down → up dalam < 400 ms tanpa pergerakan > 10 px | `onTap()` fire → buka edit sheet (Transaction/Transfer) atau no-op untuk WishlistItemCard yang non-interactive |
| **Long-press** | Pointer down dipertahankan ≥ 400 ms, total pergerakan ≤ 10 px | `navigator.vibrate(8)` (kalau API tersedia) + dropdown menu (`TransactionItemActions` / inline DropdownMenu di Wishlist) muncul |
| **Drag-cancel** | Pointer down lalu pergerakan > 10 px sebelum 400 ms tercapai | Timer di-clear, **tidak ada** menu, **tidak ada** tap |
| **Right-click (desktop)** | Mouse `contextmenu` event di trigger button | `onLongPress` fired langsung (bypass timer), menu muncul. `e.preventDefault()` mencegah native context menu browser |
| **Pointer cancel / leave** | Sistem cancel (mis. scroll mengambil alih) atau pointer keluar dari element | Timer di-clear, no fire |

**Catatan penting**:
- Threshold 10 px dihitung dengan Euclidean distance (`Math.hypot(dx, dy)`) dari posisi pointer down awal — bukan per-axis.
- Vibration hanya jalan di device yang support `navigator.vibrate` (iOS Safari **tidak** support; Android Chrome support). Absence of haptic di iOS bukan bug.
- Setelah long-press fire, pointer up berikutnya **tidak** memicu `onTap` (sudah di-guard via `longPressFiredRef`).

### 12.2 Test Matrix

#### A. `TransactionItem` (transactions list, dashboard recent)

| # | Platform | Test case | Expected | Status | Catatan |
|---|---|---|---|---|---|
| A1 | iOS Safari (real device) | Tap row | Edit sheet (`TransactionSheet mode=expense\|income`) terbuka pre-filled | `[ ]` |  |
| A2 | iOS Safari (real device) | Long-press 400 ms | DropdownMenu "Edit / Hapus" muncul (no haptic — iOS limitation) | `[ ]` |  |
| A3 | iOS Safari (real device) | Mulai long-press, drag jari > 10 px sebelum 400 ms | Menu **tidak** muncul, edit sheet juga tidak terbuka | `[ ]` |  |
| A4 | Android Chrome (real device) | Tap row | Edit sheet terbuka pre-filled | `[ ]` |  |
| A5 | Android Chrome (real device) | Long-press 400 ms | DropdownMenu muncul + haptic feedback (vibrate 8 ms) terasa | `[ ]` |  |
| A6 | Android Chrome (real device) | Mulai long-press, drag jari > 10 px | Menu **tidak** muncul | `[ ]` |  |
| A7 | Desktop Chrome / Firefox / Safari | Right-click row | DropdownMenu muncul (no native context menu) | `[ ]` |  |
| A8 | Desktop | Klik (left-click) | Edit sheet terbuka | `[ ]` |  |

#### B. `TransferItem` (transactions list, transfer rows)

| # | Platform | Test case | Expected | Status | Catatan |
|---|---|---|---|---|---|
| B1 | iOS Safari | Tap row | `TransferSheet` terbuka pre-filled | `[ ]` |  |
| B2 | iOS Safari | Long-press 400 ms | DropdownMenu muncul | `[ ]` |  |
| B3 | iOS Safari | Drag > 10 px | Menu **tidak** muncul | `[ ]` |  |
| B4 | Android Chrome | Tap row | `TransferSheet` terbuka | `[ ]` |  |
| B5 | Android Chrome | Long-press 400 ms | DropdownMenu + haptic | `[ ]` |  |
| B6 | Android Chrome | Drag > 10 px | Menu **tidak** muncul | `[ ]` |  |
| B7 | Desktop | Right-click | DropdownMenu muncul | `[ ]` |  |
| B8 | Desktop | Left-click | `TransferSheet` terbuka | `[ ]` |  |

#### C. `WishlistItemCard` (`/wishlist` page)

> Catatan: Wishlist card tap-nya tidak buka edit sheet langsung — tap pada body card adalah no-op (passing). Edit harus via long-press menu → "Edit". Checkbox tap untuk toggle purchased (terpisah dari long-press, di-stop-propagate di handler).

| # | Platform | Test case | Expected | Status | Catatan |
|---|---|---|---|---|---|
| C1 | iOS Safari | Tap checkbox bulat di kiri | Toggle `isPurchased`, item ber-strikethrough atau dipulihkan | `[ ]` |  |
| C2 | iOS Safari | Long-press body card 400 ms | DropdownMenu "Edit / Hapus" muncul | `[ ]` |  |
| C3 | iOS Safari | Drag > 10 px saat long-press | Menu **tidak** muncul | `[ ]` |  |
| C4 | Android Chrome | Tap checkbox | Toggle purchased | `[ ]` |  |
| C5 | Android Chrome | Long-press body card | DropdownMenu + haptic | `[ ]` |  |
| C6 | Android Chrome | Drag > 10 px | Menu **tidak** muncul | `[ ]` |  |
| C7 | Desktop | Right-click body card | DropdownMenu muncul | `[ ]` |  |
| C8 | Desktop | Klik link lokasi (kalau URL) | Buka tab baru, **tidak** buka menu | `[ ]` |  |

### 12.3 Fallback: Chrome DevTools Mobile Emulation

Kalau salah satu device tidak tersedia, gunakan Chrome DevTools mobile emulation (`Cmd+Shift+M` / `Ctrl+Shift+M`) sebagai fallback:

1. Pilih device preset (iPhone 12 Pro untuk iOS sim, Pixel 7 untuk Android sim).
2. **Enable** "Touch" simulation (icon hand di toolbar emulation).
3. Set throttling ke "No throttling" — kita test gesture, bukan network.

**Limitasi emulation yang harus di-disclose di kolom "Catatan"**:
- Emulation memakai `pointerType="touch"` tapi event timing tidak 100% sama dengan real device. Long-press 400 ms biasanya akurat, tapi haptic feedback **tidak** akan terasa (emulation tidak punya akses ke `navigator.vibrate` real).
- iOS Safari quirks (bouncing scroll, text selection menu di long-press) tidak ter-reproduce di Chromium emulation. Kalau menu Edit/Hapus terlihat OK di emulation tapi user laporan ada masalah di real device, **jangan** sign-off pakai emulation result saja.

Setiap baris di tabel 12.2 yang di-test via emulation harus ditandai dengan `(emul)` di kolom "Catatan". Real-device pass tetap target untuk sign-off final.

### 12.4 Sign-off

- [ ] Semua baris di tabel A (TransactionItem) sudah `[x]` atau `[!]` dengan resolusi tercatat.
- [ ] Semua baris di tabel B (TransferItem) sudah `[x]` atau `[!]` dengan resolusi tercatat.
- [ ] Semua baris di tabel C (WishlistItemCard) sudah `[x]` atau `[!]` dengan resolusi tercatat.
- [ ] Tester: ___________ · Tanggal: ___________ · Build commit: ___________

Setelah semua poin di atas tercentang, task 4.7 boleh ditandai `[x]` di `tasks.md`.


---

## 13. V2 Manual QA Log — WCAG Contrast Audit (Task 9.6)

> Log untuk task **9.6** (Sprint 9 — Polish & Audit Final). Validates **AC12.7** dari `requirements.md`.
> Audit dilakukan secara programatik via `scripts/wcag-audit.mjs` (Node.js murni, tanpa dependency) dengan formula relative-luminance + contrast ratio sesuai [WCAG 2.1 §1.4.3](https://www.w3.org/TR/WCAG21/#contrast-minimum). Manual visual inspection di browser tidak dilakukan di execution ini, jadi seluruh verdict di tabel berikut adalah hasil komputasi presisi (bukan estimasi mata).
>
> **Threshold**: AA = **4.5:1** untuk normal text, **3:1** untuk large text (≥18pt regular atau ≥14pt bold) dan untuk graphical objects (WCAG 1.4.11). AAA = 7:1 / 4.5:1.
>
> **Source nilai background `bg-card`** (resolved dari `src/app/globals.css`):
> - Light: `hsl(0 0% 100%)` → `#FFFFFF`
> - Dark:  `hsl(240 10% 3.9%)` → `#09090B`
>
> **Foreground tokens** dari `tailwind.config.ts` `colors` block dan `src/lib/constants/labels.ts`:
> - `income` = `#0F9B58`
> - `expense` = `#E03E3E`
> - `arul` / `OWNER_COLORS.arul` = `#2383E2`
> - `fifi` / `OWNER_COLORS.fifi` = `#E255A1`
> - `shared` / `OWNER_COLORS.shared` = `#9B59B6`

### 13.1 Hasil Audit

| Foreground | Background | Ratio | Kelas WCAG | Verdict |
|---|---|---:|---|---|
| `income` `#0F9B58` | Light `bg-card` `#FFFFFF` | **3.59** | < 4.5 | ⚠️ Pass large-only — **FAIL normal text** |
| `income` `#0F9B58` | Dark `bg-card` `#09090B`  | **5.54** | ≥ 4.5 | ✅ AA pass (normal & large) |
| `expense` `#E03E3E` | Light `bg-card` `#FFFFFF` | **4.26** | < 4.5 | ⚠️ Pass large-only — **FAIL normal text** |
| `expense` `#E03E3E` | Dark `bg-card` `#09090B`  | **4.67** | ≥ 4.5 | ✅ AA pass (normal & large) |
| `arul` `#2383E2`    | Light `bg-card` `#FFFFFF` | **3.88** | < 4.5 | ⚠️ Pass large-only — **FAIL normal text** |
| `arul` `#2383E2`    | Dark `bg-card` `#09090B`  | **5.13** | ≥ 4.5 | ✅ AA pass (normal & large) |
| `fifi` `#E255A1`    | Light `bg-card` `#FFFFFF` | **3.47** | < 4.5 | ⚠️ Pass large-only — **FAIL normal text** |
| `fifi` `#E255A1`    | Dark `bg-card` `#09090B`  | **5.73** | ≥ 4.5 | ✅ AA pass (normal & large) |
| `shared` `#9B59B6`  | Light `bg-card` `#FFFFFF` | **4.67** | ≥ 4.5 | ✅ AA pass (normal & large) |
| `shared` `#9B59B6`  | Dark `bg-card` `#09090B`  | **4.26** | < 4.5 | ⚠️ Pass large-only — **FAIL normal text** |

**SummaryCards owner accents** (verified terpisah karena `SummaryCards.tsx` pakai Tailwind palette dengan dark-mode variant, beda dari `OWNER_COLORS`):

| Token | On Light | On Dark |
|---|---:|---:|
| Dot `bg-blue-500 #3B82F6` (graphic, 3:1 needed) | 3.68 ✅ | 5.41 ✅ |
| Dot `bg-pink-500 #EC4899` (graphic, 3:1 needed) | 3.53 ✅ | 5.64 ✅ |
| Dot `bg-purple-500 #A855F7` (graphic, 3:1 needed) | 3.96 ✅ | 5.03 ✅ |
| Label `text-blue-600 #2563EB` / `text-blue-400 #60A5FA` | 5.17 ✅ | 7.83 ✅ |
| Label `text-pink-600 #DB2777` / `text-pink-400 #F472B6` | 4.60 ✅ | 7.51 ✅ |
| Label `text-purple-600 #9333EA` / `text-purple-400 #C084FC` | 5.38 ✅ | 7.53 ✅ |

`SummaryCards.tsx` aman — dark-mode variant sudah dipilih dengan tepat. **Tidak perlu perubahan.**

### 13.2 Locations yang Terdampak (audit dampak)

Hanya pair yang **fail AA normal text** yang butuh tindak lanjut. Body text dengan `text-income` / `text-expense` di codebase semuanya rendered pada `text-sm` (14 px regular) atau `text-base` (16 px regular) — **tidak qualify large text**. Maka semua usages di bawah ini harus pakai shade yang ≥ 4.5:1.

| Pair fail | File · usage |
|---|---|
| `text-income` on light `bg-card` (3.59) | `src/components/transactions/TransactionItem.tsx:48` (amount tx income), `src/components/dashboard/SummaryCards.tsx:189-195` (hero income), `src/components/dashboard/OwnerOverview.tsx:86` (owner summary), `src/components/together/PacarTab.tsx:86` (pacar tab summary), `src/components/accounts/AccountDetailSheet.tsx:153` (per-account summary) |
| `text-expense` on light `bg-card` (4.26) | Same files sebagai counterpart pengeluaran. Plus `src/components/dashboard/SpendingByCategory.tsx:57` (over-budget marker) dan `src/components/dashboard/BudgetAlerts.tsx:31`. |
| `text-arul` on light (3.88) | `src/components/accounts/AccountCard.tsx:51` (owner subtext, `text-xs` ≈ 12 px regular). |
| `text-fifi` on light (3.47) | `src/components/accounts/AccountCard.tsx:51` (same). |
| `text-shared` on dark (4.26) | `src/components/accounts/AccountCard.tsx:51` — fallback `text-foreground` di-used (lihat catatan), tapi `OWNER_COLORS.shared` masih ditampilkan sebagai dot di `Header.tsx:30` (h-2 w-2 = 8 px graphic). Header dot qualify graphical (≥ 3:1) jadi 4.26 oke untuk dot. **Catatan**: `AccountCard.tsx` `ownerColors` map cuma punya `arul`/`fifi`, owner=`shared` tidak masuk → fallback ke text default. Jadi dampak nyata hanya di Header dot, yang lulus sebagai graphic. |

Header `ownerColor` dot (`src/components/layout/Header.tsx`) qualify sebagai graphical object (8×8 px) — threshold 3:1 (WCAG 1.4.11). Semua tiga owner color memenuhi 3:1 baik di light maupun dark. **Header aman.**

### 13.3 Rekomendasi Adjustment

Karena `tailwind.config.ts` saat ini punya `income` / `expense` / `arul` / `fifi` / `shared` sebagai single-value hex (bukan CSS variable), shade-nya tidak theme-aware. Approach yang direkomendasikan: konversi ke CSS variable theme-aware seperti tokens shadcn (`hsl(var(--…))`).

**Locations yang harus di-update**:

1. `src/app/globals.css` — extend `:root` dan `.dark` block dengan dark-mode variant:
   ```css
   :root {
     /* tokens existing */
     --color-income:  #047857; /* emerald-700, ratio 5.48 on white — AA */
     --color-expense: #B91C1C; /* red-700,    ratio 6.47 on white — AA */
     --color-arul:    #1D4ED8; /* blue-700,   ratio 6.70 on white — AA */
     --color-fifi:    #BE185D; /* pink-700,   ratio 6.04 on white — AA */
     --color-shared:  #9B59B6; /* unchanged — already 4.67 on white */
   }
   .dark {
     --color-income:  #10B981; /* emerald-500, ratio 7.84 on dark — AAA */
     --color-expense: #EF4444; /* red-500,     ratio 5.29 on dark — AA */
     --color-arul:    #60A5FA; /* blue-400,    ratio 7.83 on dark — AAA */
     --color-fifi:    #F472B6; /* pink-400,    ratio 7.51 on dark — AAA */
     --color-shared:  #A78BFA; /* violet-400,  ratio 7.31 on dark — AAA (lift dari 4.26) */
   }
   ```
2. `tailwind.config.ts` — change semantic colors agar baca CSS variable, bukan literal hex:
   ```ts
   colors: {
     // ...
     income:   'var(--color-income)',
     expense:  'var(--color-expense)',
     transfer: 'var(--color-transfer)',  // already AA: arul-equivalent
     warning:  'var(--color-warning)',
     info:     'var(--color-info)',
     arul:     'var(--color-arul)',
     fifi:     'var(--color-fifi)',
     shared:   'var(--color-shared)',
   },
   ```
   Ini consistent dengan pattern shadcn yang sudah dipakai untuk `border`, `input`, dst.
3. `src/lib/constants/labels.ts` — `OWNER_COLORS` saat ini di-pass ke inline styles (`style={{ backgroundColor: OWNER_COLORS[owner] }}` di `Header.tsx`). Karena Header dot graphic-only dan lulus 3:1, **tidak perlu split per-theme** — biarkan single hex. (Tapi kalau mau konsisten, future improvement: bikin function `getOwnerColor(owner, theme)` yang baca `useTheme()` next-themes.)
4. `.kiro/steering/component-patterns.md` — kalau ada referensi ke `text-income`/`text-expense` sebagai "always green/red", update note bahwa shade akan otomatis ter-adjust per theme via CSS variable.

**Rationale shade pilihan**:
- Light mode pakai Tailwind step-700 (`emerald-700`, `red-700`, `blue-700`, `pink-700`) → semua AA (5.4 – 6.7).
- Dark mode pakai step-500/400 (`emerald-500`, `red-500`, `blue-400`, `pink-400`, `violet-400`) → semua ≥ 5:1, mostly AAA — lebih cerah, sesuai konvensi dark-mode UI yang kontras tinggi tanpa harsh.
- `shared` light tetap `#9B59B6` karena sudah pass (4.67). Lift ke `violet-400` di dark mode (7.31 vs original 4.26 — solid AAA).

### 13.4 Status & Action Items

| Pair | Action |
|---|---|
| `text-income` light 3.59 → adjust ke `#047857` (5.48) | **Required** — body text. |
| `text-expense` light 4.26 → adjust ke `#B91C1C` (6.47) | **Required** — body text. |
| `text-arul` light 3.88 → adjust ke `#1D4ED8` (6.70) | **Required** — body text (AccountCard owner subtext). |
| `text-fifi` light 3.47 → adjust ke `#BE185D` (6.04) | **Required** — body text. |
| `text-shared` dark 4.26 → adjust ke `#A78BFA` (7.31) | **Required** — applied via CSS var dark variant. |
| Header `ownerColor` dot | No change. Graphical object, semua ≥ 3.5:1 di kedua theme. |
| `SummaryCards.tsx` owner accents | No change. Sudah ada dark-mode variant yang lulus AA/AAA. |

**Audit verdict**: AC12.7 **partially met** — light theme `bg-card` butuh shade adjustment di 4 token (`income`, `expense`, `arul`, `fifi`) dan dark theme butuh adjustment di 1 token (`shared`) supaya lulus WCAG AA untuk normal text. Implementasi adjustment di-defer (out of scope task 9.6 — task ini hanya audit + dokumentasi). Tindak lanjut: bikin task baru di tasks.md atau Sprint 10 backlog dengan title "Apply WCAG AA contrast fix per audit 9.6".

**Reproduce audit**: `node scripts/wcag-audit.mjs` (Node 18+, tidak butuh install). Script di-commit ke repo untuk re-run kalau warna palette diubah di masa depan.

**Auditor**: Kiro · **Tanggal**: 2026-05 · **Methodology**: programmatic (WCAG 2.1 §1.4.3 formula via `scripts/wcag-audit.mjs`). Manual visual verification di real browser belum dilakukan dan disarankan dilakukan post-fix sebelum sign-off.
