"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils/cn";

const scopeTabs: { value: BudgetScope | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "arul", label: "Arul" },
  { value: "fifi", label: "Fifi" },
  { value: "shared", label: "Together" },
];

export default function CategoriesPage() {
  const { categories, isLoading } = useCategories();
  const { selectedMonth, setSelectedMonth } = useAppStore();
  const { budgets } = useBudgetStatus(selectedMonth);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeScope, setActiveScope] = useState<BudgetScope | "all">("all");

  // Build a map of categoryId -> spent amount
  const spendingMap: Record<string, number> = {};
  budgets.forEach((b) => {
    spendingMap[b.categoryId] = b.spent;
  });

  // Filter categories by scope
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
      <Header title="Kategori">
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </Header>
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Scope Tabs */}
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
            title={
              activeScope === "all"
                ? "Belum ada kategori"
                : `Belum ada kategori untuk ${scopeTabs.find((t) => t.value === activeScope)?.label}`
            }
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
            showScope={activeScope === "all"}
          />
        )}
      </div>
      <Button
        size="sm"
        className="fixed bottom-24 right-4 rounded-full shadow-lg"
        onClick={() => setFormOpen(true)}
      >
        <Plus className="h-4 w-4 mr-1" />
        Tambah
      </Button>
      <CategoryForm
        open={formOpen}
        onClose={handleClose}
        editingCategory={editingCategory}
      />
    </>
  );
}
