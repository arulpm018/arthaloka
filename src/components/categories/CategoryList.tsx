"use client";

import { Category } from "@/types";
import { BudgetProgressBar } from "./BudgetProgressBar";
import { CategoryIcon } from "@/components/shared/CategoryIcon";

interface CategoryListProps {
  categories: Category[];
  onCategoryTap?: (category: Category) => void;
}

export const CategoryList = ({
  categories,
  onCategoryTap,
}: CategoryListProps) => {
  return (
    <div className="space-y-2">
      {categories.map((cat) => (
        <button
          key={cat.categoryId}
          onClick={() => onCategoryTap?.(cat)}
          className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent active:bg-accent"
        >
          <CategoryIcon icon={cat.icon} color={cat.color} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{cat.name}</p>
            {cat.budgetAmount > 0 && (
              <BudgetProgressBar spent={0} budget={cat.budgetAmount} compact />
            )}
          </div>
          <span className="text-xs text-muted-foreground capitalize">
            {cat.type}
          </span>
        </button>
      ))}
    </div>
  );
};
