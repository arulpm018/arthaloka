"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { CategoryList } from "@/components/categories/CategoryList";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { BudgetProgressBar } from "@/components/categories/BudgetProgressBar";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCategories } from "@/hooks/useCategories";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { Category } from "@/types";

/** Budget bersama: limit per kategori (berlaku tiap bulan) + progres bulan terpilih. */
export default function BudgetPage() {
  const router = useRouter();
  const { categories, isLoading } = useCategories();
  const { selectedMonth, setSelectedMonth } = useAppStore();
  const { summary, spendingByCategory } = useBudgetStatus(selectedMonth);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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
        {summary.totalBudget > 0 && (
          <div className="space-y-1 rounded-xl border border-border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">Terpakai</p>
              <p className="font-mono text-sm tabular-nums">
                {formatCurrency(summary.totalSpent)} / {formatCurrency(summary.totalBudget)}
              </p>
            </div>
            <BudgetProgressBar spent={summary.totalSpent} budget={summary.totalBudget} compact />
          </div>
        )}

        {isLoading ? (
          <LoadingState variant="list" count={8} />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Belum ada kategori"
            description="Tambahkan kategori lalu isi limit per bulan"
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Tambah
              </Button>
            }
          />
        ) : (
          <CategoryList
            categories={categories}
            spendingMap={spendingByCategory}
            onCategoryTap={(c) => {
              setEditingCategory(c);
              setFormOpen(true);
            }}
            onViewTransactions={(c) => router.push(`/transactions?categoryId=${c.categoryId}`)}
          />
        )}
      </div>

      <Button
        size="sm"
        className="fixed bottom-24 right-4 rounded-full shadow-lg md:bottom-6"
        onClick={() => setFormOpen(true)}
      >
        <Plus className="mr-1 h-4 w-4" />
        Kategori
      </Button>

      <CategoryForm open={formOpen} onClose={handleClose} editingCategory={editingCategory} />
    </>
  );
}
