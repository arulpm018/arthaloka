---
inclusion: fileMatch
fileMatchPattern: "src/components/**"
---

# Component Patterns — Arthafiloka

## Design Tokens
Pakai shadcn standard tokens (sudah ter-wire di `tailwind.config.ts` via CSS variables HSL). Jangan pakai custom ghost tokens (`bg-secondary`, `text-secondary`, `bg-tertiary`, `text-muted`, `bg-hover`, `border-default`) yang tidak terdaftar di Tailwind config.

| Use case | Class shadcn standard |
|---|---|
| Surface card / panel | `bg-card` |
| Border default | `border-border` |
| Muted text (label, secondary copy) | `text-muted-foreground` |
| Muted background (icon halo, chip) | `bg-muted` |
| Hover / active row | `hover:bg-accent active:bg-accent` |
| Brand color | `bg-primary` / `text-primary` |
| Income / expense / transfer | `text-income` / `text-expense` / `text-transfer` (custom semantic, sudah di-extend) |

Hex colors hanya boleh muncul di:
- Owner color constants (`OWNER_COLORS` di `src/lib/constants/labels.ts`).
- User-pickable values yang tersimpan di Firestore (e.g., `account.color`, `category.color`) — render via inline `style={{ backgroundColor: ... }}`.

## Component Template
Setiap component harus mengikuti struktur ini:

```tsx
"use client";

import { cn } from "@/lib/utils/cn";

interface MyComponentProps {
  // props here
}

export const MyComponent = ({ prop1, prop2 }: MyComponentProps) => {
  return (
    <div className={cn("base-classes")}>
      {/* content */}
    </div>
  );
};
```

## Bottom Sheet Pattern
Semua form (expense, income, transfer, account, category) menggunakan bottom sheet. Submit pattern: `await` write → toast → close. JANGAN close sheet sebelum await selesai (silent-fail trap).

```tsx
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";

export const TransactionSheet = ({ mode }: { mode: "expense" | "income" }) => {
  const { activeSheet, closeSheet, editingTransaction } = useAppStore();
  const isOpen = activeSheet === mode;
  const isEditing = !!editingTransaction;

  const form = useForm({ resolver: zodResolver(schema), defaultValues });

  const onSubmit = async (data: TransactionFormValues) => {
    try {
      if (isEditing) {
        await transactionsService.update(editingTransaction.transactionId, data);
        toast.success("Perubahan tersimpan");
      } else {
        await transactionsService.create(data);
        toast.success(mode === "expense" ? "Pengeluaran tersimpan" : "Pemasukan tersimpan");
      }
      closeSheet();
    } catch (error) {
      console.error("Failed to save transaction:", error);
      toast.error("Gagal menyimpan. Coba lagi.");
      // Sheet stays open dengan form data preserved
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeSheet}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit" : "Tambah"} {mode === "expense" ? "Pengeluaran" : "Pemasukan"}
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* form fields */}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
```

## List Item Pattern (Long-Press to Delete)
Transaction items pakai long-press menu untuk delete (mobile-friendly), bukan `onContextMenu` (broken di mobile native). Pakai `useLongPress` hook + `<TransactionItemActions />` overlay.

```tsx
"use client";

import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { useLongPress } from "@/hooks/useLongPress";
import { TransactionItemActions } from "./TransactionItemActions";
import { useState } from "react";
import { Transaction } from "@/types";

interface TransactionItemProps {
  transaction: Transaction;
  onTap: () => void;
  onDelete?: () => void;
}

export const TransactionItem = ({ transaction, onTap, onDelete }: TransactionItemProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const handlers = useLongPress({
    onLongPress: () => onDelete && setMenuOpen(true),
    onTap,
  });

  return (
    <TransactionItemActions
      open={menuOpen}
      onOpenChange={setMenuOpen}
      onEdit={onTap}
      onDelete={() => onDelete?.()}
      trigger={
        <button
          type="button"
          {...handlers}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent"
        >
          <CategoryIcon icon={transaction.categoryIcon} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{transaction.name}</p>
            <p className="text-xs text-muted-foreground">{transaction.categoryName}</p>
          </div>
          <p
            className={cn(
              "text-sm font-mono font-medium tabular-nums",
              transaction.type === "expense" ? "text-expense" : "text-income"
            )}
          >
            {transaction.type === "expense" ? "-" : "+"}
            {formatCurrency(transaction.amount)}
          </p>
        </button>
      }
    />
  );
};
```

Notes:
- Background row: `hover:bg-accent active:bg-accent` (bukan `bg-hover` / `bg-tertiary`).
- Secondary text: `text-muted-foreground` (bukan `text-secondary`).
- Icon halo: `<CategoryIcon />` shared component (bukan inline `bg-tertiary` div).

## Card Pattern
Surface card pakai `border-border bg-card` (shadcn standard). Untuk muted/label text pakai `text-muted-foreground`.

```tsx
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SummaryCardProps {
  title: string;
  amount: number;
  type: "income" | "expense";
}

export const SummaryCard = ({ title, amount, type }: SummaryCardProps) => {
  const Icon = type === "income" ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center",
            type === "income" ? "bg-income/10" : "bg-expense/10"
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", type === "income" ? "text-income" : "text-expense")} />
        </div>
        <p className="text-xs text-muted-foreground">{title}</p>
      </div>
      <p
        className={cn(
          "text-base font-mono font-semibold tabular-nums",
          type === "income" ? "text-income" : "text-expense"
        )}
      >
        {type === "income" ? "+" : "-"}
        {formatCurrency(amount)}
      </p>
    </div>
  );
};
```

## Hero / Gradient Card Pattern
Untuk hero card (e.g., total balance) pakai gradient subtle berbasis token primary:

```tsx
<button className="w-full text-left rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 transition-all active:scale-[0.98]">
  <p className="text-xs text-muted-foreground font-medium">Total Kekayaan</p>
  <p className="text-3xl font-mono font-bold tabular-nums tracking-tight">
    {formatCurrency(totalBalance)}
  </p>
</button>
```

## Owner Color Indicator
Untuk komponen yang butuh tinted accent per owner (Header, account card border, dst), import dari constants — jangan hardcode hex di tempat lain.

```tsx
import { OWNER_COLORS, OWNER_LABELS } from "@/lib/constants/labels";

<span
  className="h-2 w-2 rounded-full"
  style={{ backgroundColor: OWNER_COLORS[owner] }}
  aria-hidden
/>
<h1>{OWNER_LABELS[owner]}</h1>
```

## Empty / Loading States
- Empty state: pakai `<EmptyState>` shared component (icon + title + optional CTA).
- Loading: pakai `<LoadingState>` skeleton variants (`list`, `card`, `chart`, `wishlist`). Jangan bikin skeleton ad-hoc per komponen.
