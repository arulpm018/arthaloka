"use client";

import { Category, BudgetScope } from "@/types";
import { BudgetProgressBar } from "./BudgetProgressBar";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

const scopeLabels: Record<BudgetScope, string> = {
  arul: OWNER_LABELS["arul"],
  fifi: OWNER_LABELS["fifi"],
  shared: OWNER_LABELS["shared"],
};

const scopeColors: Record<BudgetScope, string> = {
  arul: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  fifi: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  shared: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

interface CategoryListProps {
  categories: Category[];
  spendingMap?: Record<string, number>;
  onCategoryTap?: (category: Category) => void;
  showScope?: boolean;
}

export const CategoryList = ({
  categories,
  spendingMap = {},
  onCategoryTap,
  showScope = false,
}: CategoryListProps) => {
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");
  const bothCategories = categories.filter((c) => c.type === "both");

  return (
    <div className="space-y-6">
      {/* Pengeluaran */}
      {expenseCategories.length > 0 && (
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pengeluaran
            </h3>
            <span className="text-xs font-mono text-muted-foreground pr-2">
              {formatCurrency(
                expenseCategories.reduce((sum, c) => sum + (c.budgetAmount || 0), 0)
              )}
            </span>
          </div>
          <div className="space-y-1">
            {expenseCategories.map((cat) => (
              <CategoryItem
                key={cat.categoryId}
                category={cat}
                spent={spendingMap[cat.categoryId] || 0}
                onTap={onCategoryTap}
                showScope={showScope}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pemasukan */}
      {incomeCategories.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Pemasukan
          </h3>
          <div className="space-y-1">
            {incomeCategories.map((cat) => (
              <CategoryItem
                key={cat.categoryId}
                category={cat}
                spent={spendingMap[cat.categoryId] || 0}
                onTap={onCategoryTap}
                showScope={showScope}
              />
            ))}
          </div>
        </section>
      )}

      {/* Keduanya */}
      {bothCategories.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Keduanya
          </h3>
          <div className="space-y-1">
            {bothCategories.map((cat) => (
              <CategoryItem
                key={cat.categoryId}
                category={cat}
                spent={spendingMap[cat.categoryId] || 0}
                onTap={onCategoryTap}
                showScope={showScope}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const CategoryItem = ({
  category: cat,
  spent,
  onTap,
  showScope,
}: {
  category: Category;
  spent: number;
  onTap?: (category: Category) => void;
  showScope?: boolean;
}) => {
  return (
    <button
      onClick={() => onTap?.(cat)}
      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-accent active:bg-accent"
    >
      <CategoryIcon icon={cat.icon} color={cat.color} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium truncate">{cat.name}</p>
            {showScope && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  scopeColors[cat.budgetScope]
                )}
              >
                {scopeLabels[cat.budgetScope]}
              </span>
            )}
          </div>
          {cat.budgetAmount > 0 && (
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              {formatCurrency(cat.budgetAmount)}
            </span>
          )}
        </div>
        {cat.budgetAmount > 0 && (
          <BudgetProgressBar spent={spent} budget={cat.budgetAmount} compact />
        )}
      </div>
    </button>
  );
};
