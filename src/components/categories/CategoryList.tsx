"use client";

import { ReceiptText } from "lucide-react";
import { Category } from "@/types";
import { BudgetProgressBar } from "./BudgetProgressBar";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { formatCompactAmount, formatCurrency } from "@/lib/utils/formatCurrency";

interface CategoryListProps {
  categories: Category[];
  /** Pengeluaran bulan terpilih per categoryId */
  spendingMap?: Record<string, number>;
  onCategoryTap?: (category: Category) => void;
  onViewTransactions?: (category: Category) => void;
}

export const CategoryList = ({
  categories,
  spendingMap = {},
  onCategoryTap,
  onViewTransactions,
}: CategoryListProps) => {
  const sections = [
    { title: "Pengeluaran", items: categories.filter((c) => c.type === "expense"), showTotal: true },
    { title: "Keduanya", items: categories.filter((c) => c.type === "both"), showTotal: false },
    { title: "Pemasukan", items: categories.filter((c) => c.type === "income"), showTotal: false },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.title} className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h3>
            {section.showTotal && (
              <span className="pr-2 font-mono text-xs text-muted-foreground">
                {formatCurrency(section.items.reduce((sum, c) => sum + (c.budgetAmount || 0), 0))}
              </span>
            )}
          </div>
          <div className="space-y-1">
            {section.items.map((cat) => (
              <CategoryItem
                key={cat.categoryId}
                category={cat}
                spent={spendingMap[cat.categoryId] || 0}
                onTap={onCategoryTap}
                onViewTransactions={onViewTransactions}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

const CategoryItem = ({
  category: cat,
  spent,
  onTap,
  onViewTransactions,
}: {
  category: Category;
  spent: number;
  onTap?: (category: Category) => void;
  onViewTransactions?: (category: Category) => void;
}) => {
  const hasLimit = cat.budgetAmount > 0;

  return (
    <div className="flex items-center rounded-xl transition-colors hover:bg-accent active:bg-accent">
      <button onClick={() => onTap?.(cat)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
        <CategoryIcon icon={cat.icon} color={cat.color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{cat.name}</p>
            {hasLimit ? (
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatCompactAmount(spent)} / {formatCompactAmount(cat.budgetAmount)}
              </span>
            ) : cat.type !== "income" ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                Tanpa limit{spent > 0 ? ` · ${formatCompactAmount(spent)}` : ""}
              </span>
            ) : null}
          </div>
          {hasLimit && <BudgetProgressBar spent={spent} budget={cat.budgetAmount} compact />}
        </div>
      </button>
      {onViewTransactions && (
        <button
          onClick={() => onViewTransactions(cat)}
          className="mr-1 shrink-0 rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Lihat transaksi kategori ${cat.name}`}
        >
          <ReceiptText className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
