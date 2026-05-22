---
inclusion: fileMatch
fileMatchPattern: "src/components/**"
---

# Component Patterns — Arthafiloka

## Component Template
Setiap component harus mengikuti struktur ini:

```tsx
"use client";

import { ComponentProps } from "./types"; // or inline
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
Semua form (expense, income, transfer, account, category) menggunakan bottom sheet:

```tsx
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppStore } from "@/store/useAppStore";

export const ExpenseSheet = () => {
  const { activeSheet, closeSheet } = useAppStore();
  const form = useForm({ resolver: zodResolver(schema), defaultValues });

  const onSubmit = async (data) => {
    try {
      await transactionsService.create(data);
      toast.success("Pengeluaran tersimpan");
      closeSheet();
    } catch (error) {
      toast.error("Gagal menyimpan. Coba lagi.");
    }
  };

  return (
    <Sheet open={activeSheet === "expense"} onOpenChange={closeSheet}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Tambah Pengeluaran</SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* form fields */}
        </form>
      </SheetContent>
    </Sheet>
  );
};
```

## List Item Pattern (Swipeable)
Transaction items harus swipeable untuk delete:

```tsx
export const TransactionItem = ({ transaction, onEdit, onDelete }) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-hover active:bg-tertiary">
      <div className="w-9 h-9 rounded-full bg-tertiary flex items-center justify-center text-lg">
        {transaction.categoryIcon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{transaction.name}</p>
        <p className="text-xs text-secondary">{transaction.categoryName}</p>
      </div>
      <p className={cn(
        "text-sm font-mono font-medium",
        transaction.type === "expense" ? "text-expense" : "text-income"
      )}>
        {transaction.type === "expense" ? "-" : "+"}
        {formatCurrency(transaction.amount)}
      </p>
    </div>
  );
};
```

## Card Pattern
```tsx
export const SummaryCard = ({ title, amount, type }) => {
  return (
    <div className="bg-secondary border border-default rounded-xl p-4 min-w-[140px]">
      <p className="text-xs text-muted uppercase tracking-wide">{title}</p>
      <p className={cn(
        "text-lg font-mono font-semibold mt-1",
        type === "income" && "text-income",
        type === "expense" && "text-expense",
      )}>
        {formatCurrency(amount)}
      </p>
    </div>
  );
};
```
