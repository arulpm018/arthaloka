"use client";

import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { Transaction } from "@/types";
import { CategoryIcon } from "@/components/shared/CategoryIcon";

interface TransactionItemProps {
  transaction: Transaction;
  onTap: () => void;
  onDelete?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const TransactionItem = ({ transaction, onTap, onDelete }: TransactionItemProps) => {
  return (
    <button
      onClick={onTap}
      className="flex w-full items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-accent active:bg-accent"
    >
      <CategoryIcon icon={transaction.categoryIcon} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{transaction.name}</p>
        <p className="text-xs text-muted-foreground">
          {transaction.categoryName}
        </p>
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
  );
};
