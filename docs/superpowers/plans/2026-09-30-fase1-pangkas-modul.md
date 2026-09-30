# Fase 1 — Pangkas Modul Non-Keuangan & Navigasi Baru — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buang modul produktivitas, wishlist, meme, foto couple, launcher, dan halaman per-pemilik; pasang navigasi baru (Beranda · Transaksi · + · Budget · Rekening) sehingga app tinggal keuangan saja.

**Architecture:** Murni penghapusan kode + penyederhanaan layout. Data Firestore tidak disentuh. Setiap task berakhir dengan `lint + test + build` hijau sehingga bisa di-deploy kapan saja.

**Tech Stack:** Next.js 14 App Router, React 18, Zustand, Tailwind + shadcn/ui, lucide-react v1, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-household-finance-redesign-design.md` (bagian "Fase 1")

## Global Constraints

- Jangan ubah/hapus data Firestore; jangan ubah `firestore.rules`.
- Jangan baca/ubah file `.env*` (sensitif).
- Bahasa UI: Indonesia. Label pemilik tetap dari `OWNER_LABELS`.
- Setelah tiap task: `npm run lint && npm test && npm run build` harus hijau.
- Commit message gaya repo (huruf kecil, Indonesia), diakhiri baris `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch kerja: `redesign-household`.

## Review Focus

1. Route lama yang mungkin masih ter-bookmark / terbuka di PWA (`/`, `/productivity/*`, `/arul`, `/fifi`, `/together`, `/more`, `/wishlist`) → harus redirect ke `/dashboard`, bukan 404. Dipin di Task 1, 2, 3 (entri `redirects()`), dicek manual di Step verifikasi.
2. Import yatim ke file yang dihapus → build gagal. Dipin dengan `npm run build` + grep di tiap task.
3. Tombol "+" di navigasi bawah harus membuka form pengeluaran dari halaman mana pun (termasuk `/settings`, `/recap`) — dicek manual Task 2.
4. User yang `preferences.showMemes`/`relationship` masih ada di Firestore → field ekstra diabaikan tanpa error (tipe dihapus, data dibiarkan). Dicek Task 4 lewat build + buka Settings.
5. Header mobile di halaman dengan aksi kanan (Rekening "Tambah", Transaksi/Rekap MonthPicker) tetap muat di lebar 320px — dicek manual Task 2.

---

### Task 1: Hapus modul produktivitas & launcher

**Files:**
- Delete: `src/app/productivity/` (semua), `src/components/productivity/` (semua), `src/hooks/useTasks.ts`, `src/hooks/useEvents.ts`, `src/hooks/useHabits.ts`, `src/lib/firestore/tasks.ts`, `src/lib/firestore/events.ts`, `src/lib/firestore/habits.ts`, `src/lib/utils/productivity.ts`, `src/lib/utils/habitIcons.ts`, `src/lib/validations/task.schema.ts`, `src/lib/validations/event.schema.ts`, `src/lib/validations/habit.schema.ts`, `src/types/productivity.ts`, `src/lib/utils/__tests__/productivity.test.ts`, `src/components/shared/AppSwitcher.tsx`
- Modify: `src/types/index.ts`, `src/app/page.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/DesktopTopbar.tsx`, `src/components/layout/CollapsibleSidebar.tsx`, `src/components/layout/SidebarUserCard.tsx`, `src/app/(app)/more/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/onboarding/page.tsx`, `src/app/manifest.ts`, `next.config.mjs`

**Interfaces:**
- Consumes: —
- Produces: `Header` tanpa slot AppSwitcher (Task 2 menambah `HeaderQuickActions`); `next.config.mjs` punya fungsi `redirects()` yang di-extend Task 2 & 3.

- [ ] **Step 1: Hapus file**

```bash
git rm -r -q src/app/productivity src/components/productivity \
  src/hooks/useTasks.ts src/hooks/useEvents.ts src/hooks/useHabits.ts \
  src/lib/firestore/tasks.ts src/lib/firestore/events.ts src/lib/firestore/habits.ts \
  src/lib/utils/productivity.ts src/lib/utils/habitIcons.ts \
  src/lib/validations/task.schema.ts src/lib/validations/event.schema.ts src/lib/validations/habit.schema.ts \
  src/types/productivity.ts src/lib/utils/__tests__/productivity.test.ts \
  src/components/shared/AppSwitcher.tsx
```

- [ ] **Step 2: `src/types/index.ts`** — hapus baris `export * from "./productivity";`.

- [ ] **Step 3: Ganti isi `src/app/page.tsx` seluruhnya**

```tsx
import { redirect } from "next/navigation";

/** Launcher modul sudah tidak ada — app langsung ke Beranda. */
export default function RootPage() {
  redirect("/dashboard");
}
```

- [ ] **Step 4: `src/components/layout/Header.tsx`**
  - Hapus `import { AppSwitcher } from "@/components/shared/AppSwitcher";`.
  - Ganti blok slot kanan (komentar "Switcher modul …" sampai penutup `</div>` luar) menjadi:

```tsx
      <div className="flex items-center gap-2">
        {children}
      </div>
```

- [ ] **Step 5: `src/components/layout/DesktopTopbar.tsx`** — hapus import `AppSwitcher` dan baris `<AppSwitcher className="h-8 w-8" />`.

- [ ] **Step 6: `src/components/layout/CollapsibleSidebar.tsx`**
  - Dua `href="/"` → `href="/dashboard"`.
  - Dua `aria-label="Kembali ke pemilihan modul"` → `aria-label="Ke Beranda"`.
  - Komentar `{/* Brand — klik logo kembali ke pemilihan modul */}` → `{/* Brand — klik logo ke Beranda */}`.

- [ ] **Step 7: `src/components/layout/SidebarUserCard.tsx`**
  - Import lucide jadi `import { ChevronUp, LogOut, Settings } from "lucide-react";`.
  - Hapus item menu "Ganti Modul" (blok `<DropdownMenuItem asChild><Link href="/">…Ganti Modul…</Link></DropdownMenuItem>`).
  - Komentar JSDoc "(Pengaturan / Ganti Modul / Keluar)" → "(Pengaturan / Keluar)".

- [ ] **Step 8: `src/app/(app)/more/page.tsx`** (dihapus total di Task 2; di sini cukup supaya build hijau)
  - Import lucide jadi `import { Wallet, Tag, Settings, CalendarRange, ChevronRight } from "lucide-react";`.
  - Hapus konstanta `moduleItems`.
  - `{[...moduleItems, ...menuItems].map(` → `{menuItems.map(`.

- [ ] **Step 9: Redirect setelah login/onboarding** — di `src/app/(auth)/login/page.tsx` dan `src/app/(auth)/onboarding/page.tsx`, ganti `router.push("/");` → `router.push("/dashboard");`.

- [ ] **Step 10: `src/app/manifest.ts`** — `start_url: "/",` → `start_url: "/dashboard",`.

- [ ] **Step 11: `next.config.mjs`** — tambahkan fungsi `redirects` di dalam `nextConfig` (setelah blok `images`):

```js
  // Route modul/halaman yang sudah dihapus — arahkan ke Beranda supaya
  // bookmark / tab PWA lama tidak 404.
  async redirects() {
    return [
      { source: "/productivity/:path*", destination: "/dashboard", permanent: false },
    ];
  },
```

- [ ] **Step 12: Grep sisa referensi**

Run: `grep -rnE "productivity|AppSwitcher|useTasks|useEvents|useHabits|habitIcons|ProductivityShell" src`
Expected: hanya satu baris — `src/components/settings/SettingsScreen.tsx: export type SettingsModule = "finance" | "productivity";` (dirapikan di Task 4).

- [ ] **Step 13: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: lint bersih, semua test PASS (jumlah turun karena test produktivitas dihapus), build sukses.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "hapus modul produktivitas & launcher: / langsung ke /dashboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Navigasi baru & hapus halaman per-pemilik

**Files:**
- Delete: `src/app/(app)/arul/`, `src/app/(app)/fifi/`, `src/app/(app)/together/`, `src/app/(app)/more/`, `src/components/dashboard/OwnerOverview.tsx`, `src/components/layout/OwnerSwitcherTitle.tsx`, `src/components/layout/GlobalFAB.tsx`, `src/components/layout/FAB.tsx`, `src/components/layout/ActionSheet.tsx`, `src/components/layout/QuickAddDropdown.tsx`
- Create: `src/components/layout/HeaderQuickActions.tsx`
- Replace: `src/components/layout/BottomNav.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/AppShell.tsx`
- Modify: `src/components/layout/Header.tsx`, `src/components/layout/DesktopTopbar.tsx`, `src/app/(app)/accounts/page.tsx`, `next.config.mjs`

**Interfaces:**
- Consumes: `useAppStore().openSheet(type)`, `useAppStore().openAiAssistant()`, `PrometheusMascot`.
- Produces: `HeaderQuickActions` (mobile: tombol Prometheus + avatar → `/settings`). Item nav "Budget" menunjuk `/categories` (Fase 2 mengganti ke `/budget`). `AppShell` masih me-mount `<TransactionSheet mode="expense" />`, `<TransactionSheet mode="income" />`, `<TransferSheet />`.

- [ ] **Step 1: Hapus file**

```bash
git rm -r -q "src/app/(app)/arul" "src/app/(app)/fifi" "src/app/(app)/together" "src/app/(app)/more" \
  src/components/dashboard/OwnerOverview.tsx src/components/layout/OwnerSwitcherTitle.tsx \
  src/components/layout/GlobalFAB.tsx src/components/layout/FAB.tsx \
  src/components/layout/ActionSheet.tsx src/components/layout/QuickAddDropdown.tsx
```

- [ ] **Step 2: Buat `src/components/layout/HeaderQuickActions.tsx`**

```tsx
"use client";

import Link from "next/link";
import { PrometheusMascot } from "@/components/ai/PrometheusMascot";
import { useAppStore } from "@/store/useAppStore";

/**
 * Aksi cepat di header mobile: buka Prometheus (AI) & avatar → Pengaturan.
 * Di desktop padanannya ada di DesktopTopbar / kartu user sidebar.
 */
export const HeaderQuickActions = () => {
  const openAiAssistant = useAppStore((s) => s.openAiAssistant);
  const currentUser = useAppStore((s) => s.currentUser);

  const name = currentUser?.displayName ?? "Pengguna";
  const avatarUrl =
    currentUser?.preferences?.customAvatarUrl ?? currentUser?.photoURL ?? null;

  return (
    <>
      <button
        type="button"
        onClick={openAiAssistant}
        aria-label="Tanya Prometheus"
        className="rounded-lg transition-transform active:scale-95"
      >
        <PrometheusMascot className="h-8 w-8 rounded-lg" />
      </button>
      <Link href="/settings" aria-label="Pengaturan" className="rounded-full">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </Link>
    </>
  );
};
```

- [ ] **Step 3: `src/components/layout/Header.tsx`** — tambah import `import { HeaderQuickActions } from "./HeaderQuickActions";` lalu slot kanan menjadi:

```tsx
      <div className="flex items-center gap-2">
        {children}
        {/* Aksi global mobile — di desktop ada di DesktopTopbar */}
        <div className="flex items-center gap-1.5 md:hidden">
          <HeaderQuickActions />
        </div>
      </div>
```

- [ ] **Step 4: Ganti isi `src/components/layout/BottomNav.tsx` seluruhnya**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, PieChart, Wallet, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/useAppStore";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const LEFT_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: Home },
  { href: "/transactions", label: "Transaksi", icon: Receipt },
];

const RIGHT_ITEMS: NavItem[] = [
  { href: "/categories", label: "Budget", icon: PieChart },
  { href: "/accounts", label: "Rekening", icon: Wallet },
];

/**
 * Navigasi bawah (mobile): 4 tujuan + tombol "+" di tengah yang langsung
 * membuka form catat pengeluaran — supaya mencatat cukup 3 tap.
 */
export const BottomNav = () => {
  const pathname = usePathname();
  const openSheet = useAppStore((s) => s.openSheet);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-safe-bottom md:hidden">
      <div className="grid h-nav-height grid-cols-5 items-center">
        {LEFT_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname.startsWith(item.href)} />
        ))}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => openSheet("expense")}
            aria-label="Catat transaksi"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
        {RIGHT_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname.startsWith(item.href)} />
        ))}
      </div>
    </nav>
  );
};

const NavLink = ({ item, isActive }: { item: NavItem; isActive: boolean }) => (
  <Link
    href={item.href}
    aria-current={isActive ? "page" : undefined}
    className={cn(
      "flex flex-col items-center justify-center gap-0.5 py-2",
      isActive ? "font-semibold text-foreground" : "text-muted-foreground"
    )}
  >
    <item.icon className="h-5 w-5" />
    <span className="text-[10px]">{item.label}</span>
  </Link>
);
```

- [ ] **Step 4b: `src/components/layout/DesktopTopbar.tsx`** — komentar prop `/** Slot aksi kanan (QuickAddDropdown, ThemeToggle, dsb.) */` → `/** Slot aksi kanan (tombol Catat, Prometheus, ThemeToggle) */`.

- [ ] **Step 5: Ganti isi `src/components/layout/Sidebar.tsx` seluruhnya**

```tsx
"use client";

import { Home, Receipt, PieChart, Wallet, CalendarRange, Settings } from "lucide-react";
import {
  CollapsibleSidebar,
  type SidebarGroup,
  type SidebarNavItem,
} from "./CollapsibleSidebar";

const groups: SidebarGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Beranda", icon: Home },
      { href: "/transactions", label: "Transaksi", icon: Receipt },
      { href: "/categories", label: "Budget", icon: PieChart },
      { href: "/accounts", label: "Rekening", icon: Wallet },
      { href: "/recap", label: "Rekap Bulanan", icon: CalendarRange },
    ] satisfies SidebarNavItem[],
  },
];

const footerItems: SidebarNavItem[] = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => (
  <CollapsibleSidebar
    collapsed={collapsed}
    onToggle={onToggle}
    moduleLabel="Keuangan"
    moduleLabelClassName="text-primary"
    groups={groups}
    footerItems={footerItems}
  />
);
```

- [ ] **Step 6: Ganti isi `src/components/layout/AppShell.tsx` seluruhnya**

```tsx
"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { DesktopTopbar, type Crumb } from "./DesktopTopbar";
import { PrometheusMascot } from "@/components/ai/PrometheusMascot";
import { AiAssistantSheet } from "@/components/ai/AiAssistantSheet";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { OfflineBadge } from "@/components/shared/OfflineBadge";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { TransferSheet } from "@/components/transactions/TransferSheet";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = "arthafiloka.sidebarCollapsed.finance";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Beranda",
  "/transactions": "Transaksi",
  "/categories": "Budget",
  "/accounts": "Rekening",
  "/recap": "Rekap Bulanan",
  "/settings": "Pengaturan",
};

const crumbsFor = (pathname: string): Crumb[] => {
  const match = Object.keys(PAGE_TITLES).find((route) => pathname.startsWith(route));
  return match ? [{ label: PAGE_TITLES[match] }] : [];
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarState(SIDEBAR_STORAGE_KEY);
  const openAiAssistant = useAppStore((s) => s.openAiAssistant);
  const openSheet = useAppStore((s) => s.openSheet);

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <OfflineBadge />

      {/* Sidebar — desktop only, collapsible w-64 ⇄ rail */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 ease-in-out md:block",
          collapsed ? "md:w-[60px]" : "md:w-64"
        )}
      >
        <Sidebar collapsed={collapsed} onToggle={toggle} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DesktopTopbar onToggleSidebar={toggle} crumbs={crumbsFor(pathname)}>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={openAiAssistant}>
            <PrometheusMascot className="h-5 w-5 rounded-md" />
            Prometheus
          </Button>
          <Button size="sm" className="gap-1.5 rounded-lg" onClick={() => openSheet("expense")}>
            <Plus className="h-4 w-4" />
            Catat
          </Button>
          <ThemeToggle />
        </DesktopTopbar>

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-nav-height md:pb-0">{children}</div>
        </main>
      </div>

      {/* Bottom nav (mobile) — tombol "+" di tengah membuka form catat */}
      <BottomNav />

      <TransactionSheet mode="expense" />
      <TransactionSheet mode="income" />
      <TransferSheet />

      <AiAssistantSheet />
    </div>
  );
}
```

- [ ] **Step 7: `src/app/(app)/accounts/page.tsx`** — `<Header title="Akun">` → `<Header title="Rekening">`.

- [ ] **Step 8: `next.config.mjs`** — tambah entri ke array `redirects()`:

```js
      { source: "/arul", destination: "/dashboard", permanent: false },
      { source: "/fifi", destination: "/dashboard", permanent: false },
      { source: "/together", destination: "/dashboard", permanent: false },
      { source: "/more", destination: "/dashboard", permanent: false },
```

- [ ] **Step 9: Grep sisa referensi**

Run: `grep -rnE "OwnerOverview|OwnerSwitcherTitle|GlobalFAB|ActionSheet|QuickAddDropdown|layout/FAB|\"/more\"|\"/arul\"|\"/fifi\"|\"/together\"" src`
Expected: hanya komentar di `src/components/wishlist/WishlistProgressSummary.tsx` dan `src/lib/utils/memeMood.ts` (dihapus di Task 3 & 4).

- [ ] **Step 10: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

Manual (`npm run dev`, buka http://localhost:1806, viewport 375px & 320px):
- Navigasi bawah menampilkan Beranda · Transaksi · (+) · Budget · Rekening; tombol + membuka "Tambah Pengeluaran" dari `/dashboard`, `/recap`, `/settings`.
- Header mobile: ikon Prometheus membuka chat; avatar membuka `/settings`; halaman Rekening tombol "Tambah" masih muat di 320px.
- Buka `/arul` dan `/more` → diarahkan ke `/dashboard`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "navigasi baru satu rumah tangga: bottom nav beranda/transaksi/+/budget/rekening, hapus halaman arul/fifi/bareng/more & FAB menu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Hapus wishlist

**Files:**
- Delete: `src/app/(app)/wishlist/`, `src/components/wishlist/`, `src/components/categories/WishlistCategoryList.tsx`, `src/hooks/useWishlistItems.ts`, `src/hooks/useWishlistCategories.ts`, `src/hooks/useWishlistProgress.ts`, `src/lib/firestore/wishlistItems.ts`, `src/lib/firestore/wishlistCategories.ts`, `src/lib/utils/wishlist.ts`, `src/lib/validations/wishlistItem.schema.ts`, `src/lib/validations/wishlistCategory.schema.ts`, `src/types/wishlist.ts`, `src/__tests__/wishlist.property.test.ts`, `src/lib/utils/__tests__/wishlist.unit.test.ts`, `.kiro/specs/wishlist/`
- Replace: `src/store/useAppStore.ts`, `src/app/(app)/categories/page.tsx`
- Modify: `src/types/index.ts`, `src/components/transactions/TransactionSheet.tsx`, `src/components/ai/AiAssistantSheet.tsx`, `next.config.mjs`

**Interfaces:**
- Consumes: —
- Produces: store tanpa `prefillData`, `prefillSource`, `openSheetWithPrefill`, `wishlistAddRequest`, `requestWishlistAdd`, `PrefillSource`. `defaultOwner`/`setDefaultOwner` MASIH ada (dihapus Fase 2).

- [ ] **Step 1: Hapus file**

```bash
git rm -r -q "src/app/(app)/wishlist" src/components/wishlist src/components/categories/WishlistCategoryList.tsx \
  src/hooks/useWishlistItems.ts src/hooks/useWishlistCategories.ts src/hooks/useWishlistProgress.ts \
  src/lib/firestore/wishlistItems.ts src/lib/firestore/wishlistCategories.ts src/lib/utils/wishlist.ts \
  src/lib/validations/wishlistItem.schema.ts src/lib/validations/wishlistCategory.schema.ts \
  src/types/wishlist.ts src/__tests__/wishlist.property.test.ts src/lib/utils/__tests__/wishlist.unit.test.ts \
  .kiro/specs/wishlist
```

- [ ] **Step 2: `src/types/index.ts`** — hapus baris `export * from "./wishlist";`.

- [ ] **Step 3: Ganti isi `src/store/useAppStore.ts` seluruhnya**

```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, Transaction, Transfer } from "@/types";

interface AppStore {
  // Auth State
  currentUser: User | null;
  partner: User | null;
  isLoading: boolean;
  setCurrentUser: (user: User | null) => void;
  setPartner: (user: User | null) => void;
  setIsLoading: (loading: boolean) => void;

  // UI State
  activeSheet: "expense" | "income" | "transfer" | null;
  editingTransaction: Transaction | null;
  editingTransfer: Transfer | null;
  selectedMonth: Date;
  defaultOwner: "arul" | "fifi" | "shared" | null;

  // Privacy State (persisted)
  hideBalance: boolean;

  // Asisten AI sheet — dibuka dari header mobile / topbar desktop.
  aiAssistantOpen: boolean;
  openAiAssistant: () => void;
  closeAiAssistant: () => void;

  // Actions
  openSheet: (
    type: "expense" | "income" | "transfer",
    item?: Transaction | Transfer | null
  ) => void;
  closeSheet: () => void;
  setSelectedMonth: (date: Date) => void;
  setDefaultOwner: (owner: "arul" | "fifi" | "shared" | null) => void;
  setHideBalance: (hide: boolean) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Auth State
      currentUser: null,
      partner: null,
      isLoading: true,
      setCurrentUser: (user) => set({ currentUser: user }),
      setPartner: (partner) => set({ partner }),
      setIsLoading: (isLoading) => set({ isLoading }),

      // UI State
      activeSheet: null,
      editingTransaction: null,
      editingTransfer: null,
      selectedMonth: new Date(),
      defaultOwner: null,

      // Privacy State
      hideBalance: false,

      // Asisten AI
      aiAssistantOpen: false,
      openAiAssistant: () => set({ aiAssistantOpen: true }),
      closeAiAssistant: () => set({ aiAssistantOpen: false }),

      // Actions
      openSheet: (type, item) =>
        set({
          activeSheet: type,
          editingTransaction:
            type !== "transfer" ? ((item as Transaction | null) ?? null) : null,
          editingTransfer:
            type === "transfer" ? ((item as Transfer | null) ?? null) : null,
        }),
      closeSheet: () =>
        set({
          activeSheet: null,
          editingTransaction: null,
          editingTransfer: null,
        }),
      setSelectedMonth: (date) => set({ selectedMonth: date }),
      setDefaultOwner: (owner) => set({ defaultOwner: owner }),
      setHideBalance: (hide) => set({ hideBalance: hide }),
    }),
    {
      name: "arthafiloka-app-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ hideBalance: state.hideBalance }),
    }
  )
);
```

- [ ] **Step 4: `src/components/transactions/TransactionSheet.tsx`** (ditulis ulang total di Fase 2; di sini hanya lepas wishlist)
  - `import { Timestamp, serverTimestamp } from "firebase/firestore";` → `import { Timestamp } from "firebase/firestore";`
  - Hapus `import { wishlistItemsService } from "@/lib/firestore/wishlistItems";`
  - Di destructure `useAppStore()` hapus `prefillData,` dan `prefillSource,`.
  - Di cabang `else` effect reset, ganti blok komentar + `ownerDefault` + komentar akun + `reset({...})` menjadi:

```tsx
      const ownerDefault = defaultOwner ?? currentUser?.role ?? "arul";
      const defaultAccount =
        accounts.find(
          (a) => a.accountId === currentUser?.preferences?.defaultAccountId
        ) || accounts.find((a) => a.owner === ownerDefault) || accounts[0];
      reset({
        type: mode,
        name: "",
        amount: 0,
        accountId: defaultAccount?.accountId || "",
        accountName: defaultAccount?.name || "",
        categoryId: "",
        categoryName: "",
        categoryIcon: "",
        owner: ownerDefault,
        ownerUid: currentUser?.uid || "",
        date: Timestamp.now(),
        note: "",
      });
```

  - Di dependency array effect itu hapus `prefillData,`.
  - Di `onSubmit` cabang create, ganti seluruh blok (dari `const newTxId = …` sampai sebelum `toast.success(config.successMessage.create);`) menjadi:

```tsx
        await transactionsService.create(
          data as unknown as CreateTransactionInput
        );
```

- [ ] **Step 5: Ganti isi `src/app/(app)/categories/page.tsx` seluruhnya** (versi antara; Fase 2 memindahkannya ke `/budget`)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { CategoryList } from "@/components/categories/CategoryList";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCategories } from "@/hooks/useCategories";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";
import { useAppStore } from "@/store/useAppStore";
import { Category, BudgetScope } from "@/types";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { cn } from "@/lib/utils/cn";

const scopeTabs: { value: BudgetScope | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "arul", label: OWNER_LABELS["arul"] },
  { value: "fifi", label: OWNER_LABELS["fifi"] },
  { value: "shared", label: OWNER_LABELS["shared"] },
];

export default function CategoriesPage() {
  const router = useRouter();
  const { categories, isLoading } = useCategories();
  const { selectedMonth, setSelectedMonth } = useAppStore();
  const { budgets } = useBudgetStatus(selectedMonth);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeScope, setActiveScope] = useState<BudgetScope | "all">("all");

  const spendingMap: Record<string, number> = {};
  budgets.forEach((b) => {
    spendingMap[b.categoryId] = b.spent;
  });

  const filteredCategories =
    activeScope === "all"
      ? categories
      : categories.filter((c) => c.budgetScope === activeScope);

  const handleCategoryTap = (category: Category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingCategory(null);
  };

  return (
    <>
      <Header title="Budget">
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </Header>
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:max-w-5xl md:p-6">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {scopeTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveScope(tab.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeScope === tab.value
                  ? "bg-foreground text-background"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingState variant="list" count={8} />
        ) : filteredCategories.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Belum ada kategori"
            description="Tambahkan kategori pengeluaran/pemasukan"
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Tambah
              </Button>
            }
          />
        ) : (
          <CategoryList
            categories={filteredCategories}
            spendingMap={spendingMap}
            onCategoryTap={handleCategoryTap}
            onViewTransactions={(c) => router.push(`/transactions?categoryId=${c.categoryId}`)}
            showScope={activeScope === "all"}
          />
        )}
      </div>

      <Button
        size="sm"
        className="fixed bottom-24 right-4 rounded-full shadow-lg md:bottom-6"
        onClick={() => setFormOpen(true)}
      >
        <Plus className="h-4 w-4 mr-1" />
        Tambah
      </Button>

      <CategoryForm open={formOpen} onClose={handleClose} editingCategory={editingCategory} />
    </>
  );
}
```

- [ ] **Step 6: `next.config.mjs`** — tambah ke `redirects()`:

```js
      { source: "/wishlist", destination: "/dashboard", permanent: false },
```

- [ ] **Step 6b: `src/components/ai/AiAssistantSheet.tsx`** (ditulis ulang di Fase 3; di sini hanya teks)
  - Di `SUGGESTIONS` hapus `"Tugas belanja mingguan",` dan `"Jadwal dinner jumat malam",`.
  - Paragraf empty state ("Transaksi, transfer, akun, kategori, tugas, jadwal, habit, sampai wishlist — …") ganti isinya menjadi `Transaksi, transfer, rekening, dan kategori — cukup tulis atau bilang saja, langsung kusimpan.`

- [ ] **Step 7: Grep sisa referensi**

Run: `grep -rniE "wishlist|prefillSource|openSheetWithPrefill|prefillData" src`
Expected: hanya baris dari `src/components/settings/MemeManagerSheet.tsx` dan `src/lib/constants/memes.ts` (keduanya dihapus di Task 4).

- [ ] **Step 8: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "hapus fitur wishlist beserta coupling di store, form transaksi & halaman kategori

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Hapus meme & foto couple, sederhanakan Settings

**Files:**
- Delete: `src/components/shared/MemeReaction.tsx`, `src/components/shared/CustomMemesProvider.tsx`, `src/components/shared/CouplePhotoProvider.tsx`, `src/components/shared/CoupleHero.tsx`, `src/components/shared/ImageUploader.tsx`, `src/components/settings/MemeManager.tsx`, `src/components/settings/MemeManagerSheet.tsx`, `src/components/settings/CouplePhotoSection.tsx`, `src/components/settings/CouplePhotoSheet.tsx`, `src/components/settings/AnniversaryRow.tsx`, `src/hooks/useCustomMemes.ts`, `src/hooks/useCouplePhoto.ts`, `src/lib/firestore/memes.ts`, `src/lib/firestore/couplePhoto.ts`, `src/lib/constants/memes.ts`, `src/lib/constants/memeThresholds.ts`, `src/lib/utils/memeMood.ts`, `src/lib/utils/dateInput.ts` (hanya dipakai AnniversaryRow), `src/types/meme.ts`, `public/memes/`
- Replace: `src/app/(app)/layout.tsx`, `src/components/settings/SettingsScreen.tsx`, `src/components/shared/EmptyState.tsx`
- Modify: `src/types/index.ts`, `src/types/user.ts`, `src/lib/firestore/users.ts`, `src/hooks/useAuth.ts`, `src/components/shared/OwnerAvatar.tsx`, `src/components/dashboard/SummaryCards.tsx`, `src/components/shared/WelcomeToast.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(app)/settings/page.tsx`, `next.config.mjs`

**Interfaces:**
- Consumes: —
- Produces: `SettingsScreen()` tanpa prop; masih punya grup "Preferensi → Akun default" (dihapus Fase 2 Task 3). `EmptyState` props: `{ icon?, title, description?, action?, className? }`.

- [ ] **Step 1: Pastikan `ImageUploader` & `dateInput` hanya dipakai fitur yang dihapus**

Run: `grep -rlnE "ImageUploader|utils/dateInput" src | grep -vE "ImageUploader.tsx|dateInput.ts|CouplePhoto|MemeManager|AnniversaryRow"`
Expected: tidak ada output. (Kalau ada output, JANGAN hapus file yang masih dipakai di Step 2 — keluarkan dari daftar.)

- [ ] **Step 2: Hapus file**

```bash
git rm -r -q src/components/shared/MemeReaction.tsx src/components/shared/CustomMemesProvider.tsx \
  src/components/shared/CouplePhotoProvider.tsx src/components/shared/CoupleHero.tsx src/components/shared/ImageUploader.tsx \
  src/components/settings/MemeManager.tsx src/components/settings/MemeManagerSheet.tsx \
  src/components/settings/CouplePhotoSection.tsx src/components/settings/CouplePhotoSheet.tsx src/components/settings/AnniversaryRow.tsx \
  src/hooks/useCustomMemes.ts src/hooks/useCouplePhoto.ts \
  src/lib/firestore/memes.ts src/lib/firestore/couplePhoto.ts \
  src/lib/constants/memes.ts src/lib/constants/memeThresholds.ts src/lib/utils/memeMood.ts \
  src/lib/utils/dateInput.ts src/types/meme.ts public/memes
```

- [ ] **Step 3: Tipe**
  - `src/types/index.ts`: hapus `export * from "./meme";`.
  - `src/types/user.ts`: hapus properti `showMemes?: boolean;` beserta JSDoc-nya di `preferences`, dan hapus properti `relationship?: {…}` beserta JSDoc-nya.
  - `src/hooks/useAuth.ts` baris komentar `// Subscribe ke user doc — realtime update saat preferences/relationship berubah.` → `// Subscribe ke user doc — realtime update saat preferences berubah.`

- [ ] **Step 4: `src/lib/firestore/users.ts`** — hapus method `updateRelationship` (beserta JSDoc). Lalu import di atas menjadi (hapus `Timestamp`, `deleteField` yang kini tak terpakai):

```ts
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
```

- [ ] **Step 5: Ganti isi `src/app/(app)/layout.tsx`**

```tsx
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { WelcomeToast } from "@/components/shared/WelcomeToast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
      <WelcomeToast />
    </AuthGuard>
  );
}
```

- [ ] **Step 6: `src/components/shared/OwnerAvatar.tsx`**
  - Hapus `import { useCouplePhotoContext } from "@/components/shared/CouplePhotoProvider";`.
  - Hapus blok `// Owner=shared → ambil foto couple …` beserta dua baris `const { photo: couplePhoto } = …` dan `const couplePhotoUrl = …`.
  - Hapus blok `if (couplePhotoUrl && couplePhotoUrl !== photoURL) { candidates.push(couplePhotoUrl); }`.
  - Komentar di `localPhotoFor` (3 baris "Foto couple ditangani …") ganti menjadi satu baris `// \`shared\` tidak punya foto — di-render sebagai chip "WE".`.

- [ ] **Step 7: Ganti isi `src/components/shared/EmptyState.tsx`**

```tsx
import { cn } from "@/lib/utils/cn";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-sm font-medium">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
```

- [ ] **Step 8: `src/components/dashboard/SummaryCards.tsx`** (dihapus di Fase 2; di sini lepas meme saja)
  - Hapus `import { MemeReaction } from "@/components/shared/MemeReaction";` dan `import { getMoodForBalance } from "@/lib/utils/memeMood";`.
  - Hapus blok komentar "Mood reaction — …" beserta `{showBalance && (<MemeReaction … />)}`.

- [ ] **Step 9: `src/components/shared/WelcomeToast.tsx`**
  - Hapus baris `if (currentUser.preferences?.showMemes === false) return;`.
  - JSDoc: hapus kalimat "Skip kalau `preferences.showMemes` di-off (toggle yang sama dipakai sebagai opt-out untuk semua flair)." sehingga tersisa "Trigger sekali per session (per browser tab) ketika user pertama kali masuk app."

- [ ] **Step 10: `src/app/(auth)/login/page.tsx`**
  - Hapus `import { getCachedCoupleDataUrl } from "@/hooks/useCouplePhoto";`.
  - Ganti blok JSDoc + konstanta `COUPLE_BG_FALLBACK` menjadi:

```tsx
/** Foto latar blur halaman login (file statis di public/). */
const LOGIN_BG = "/photos/couple/default.jpg";
```

  - Hapus state `bgAttempt`, `cachedUrl`, effect "Hydrate cache", dan variabel `candidates`/`bgSrc`/`bgErrored`; ganti dengan:

```tsx
  const [bgErrored, setBgErrored] = useState(false);
```

  - Blok `<img …>` latar menjadi:

```tsx
        {!bgErrored && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={LOGIN_BG}
            alt=""
            onError={() => setBgErrored(true)}
            className="h-full w-full object-cover scale-105 blur-md opacity-40 dark:opacity-25"
          />
        )}
```

  - Import React jadi `import { useState } from "react";` (hapus `useEffect` yang kini tak terpakai).

- [ ] **Step 11: Ganti isi `src/components/settings/SettingsScreen.tsx` seluruhnya**

```tsx
"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Eye, Image as ImageIcon, LogOut, Monitor, Moon, Sun, Wallet } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AvatarSection } from "@/components/settings/AvatarSection";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useAppStore } from "@/store/useAppStore";
import { usersService } from "@/lib/firestore/users";
import { cn } from "@/lib/utils/cn";
import pkg from "../../../package.json";

/** Layar Pengaturan: profil, preferensi, tema, privasi, tentang, logout. */
export function SettingsScreen() {
  const { logout, firebaseUser } = useAuth();
  const { currentUser, hideBalance, setHideBalance } = useAppStore();
  const { accounts } = useAccounts();
  const { theme, setTheme } = useTheme();

  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setLogoutConfirm(false);
    }
  };

  const handleDefaultAccount = async (accountId: string) => {
    if (!firebaseUser) return;
    await usersService.updatePreferences(firebaseUser.uid, {
      defaultAccountId: accountId,
    });
  };

  const defaultAccountId = currentUser?.preferences?.defaultAccountId ?? "";
  const eligibleAccounts = accounts.filter(
    (acc) => acc.owner === currentUser?.role || acc.owner === "shared"
  );

  return (
    <>
      <Header title="Pengaturan" />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 pb-20 md:max-w-3xl md:p-6">
        {currentUser ? (
          <AvatarSection user={currentUser} />
        ) : (
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
        )}

        <SettingsGroup title="Preferensi">
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">Akun default</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pre-fill di form transaksi</p>
              </div>
              <Select value={defaultAccountId} onValueChange={handleDefaultAccount}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleAccounts.map((acc) => (
                    <SelectItem key={acc.accountId} value={acc.accountId}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Tampilan">
          <div className="px-3 py-3">
            <p className="text-xs text-muted-foreground mb-2">Tema</p>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted p-1">
              <ThemeOption active={theme === "light"} onClick={() => setTheme("light")} icon={Sun} label="Light" />
              <ThemeOption active={theme === "dark"} onClick={() => setTheme("dark")} icon={Moon} label="Dark" />
              <ThemeOption active={theme === "system"} onClick={() => setTheme("system")} icon={Monitor} label="Auto" />
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Privasi">
          <SettingsRow
            icon={Eye}
            label="Sembunyikan saldo"
            description="Saldo ditampilkan sebagai bullet"
            htmlFor="hide-balance-toggle"
            trailing={
              <Switch
                id="hide-balance-toggle"
                checked={hideBalance}
                onCheckedChange={setHideBalance}
                aria-label="Sembunyikan saldo otomatis"
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="Tentang">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">Arthafiloka</p>
              <p className="text-xs text-muted-foreground mt-0.5">Keuangan rumah tangga Arul &amp; Fifi 💕</p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">v{pkg.version}</span>
          </div>
        </SettingsGroup>

        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setLogoutConfirm(true)}
        >
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>

      <ConfirmDialog
        open={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Logout?"
        description="Kamu akan keluar dari akun ini."
        confirmLabel="Logout"
        isLoading={isLoggingOut}
      />
    </>
  );
}

interface ThemeOptionProps {
  active: boolean;
  onClick: () => void;
  icon: typeof Sun;
  label: string;
}

const ThemeOption = ({ active, onClick, icon: Icon, label }: ThemeOptionProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-1 rounded-md py-2 text-xs font-medium transition-colors",
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    )}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);
```

- [ ] **Step 12: `src/app/(app)/settings/page.tsx`** — `return <SettingsScreen module="finance" />;` → `return <SettingsScreen />;`.

- [ ] **Step 13: `next.config.mjs`** — di `images.remotePatterns` hapus tiga entri `*.tenor.com`, dan ganti komentar di atasnya menjadi `// Google profile photo (currentUser.photoURL via Firebase Auth).` (hapus komentar entri Google yang lama agar tidak dobel).

- [ ] **Step 14: Grep sisa referensi**

Run: `grep -rnE "Meme|memes|MoodKey|CouplePhoto|CoupleHero|couplePhoto|anniversary|showMemes|relationship|ImageUploader" src`
Expected: tidak ada output.

- [ ] **Step 15: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

Manual: `npm run dev` → `/settings` tampil (Profil, Preferensi, Tampilan, Privasi, Tentang, Logout) tanpa error console; `/login` (logout dulu) tetap tampil dengan latar.

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "hapus meme & foto couple/anniversary; settings disederhanakan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
