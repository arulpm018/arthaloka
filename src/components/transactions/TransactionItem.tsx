"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { Transaction } from "@/types";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { useLongPress } from "@/hooks/useLongPress";
import { TransactionItemActions } from "./TransactionItemActions";

interface TransactionItemProps {
  transaction: Transaction;
  onTap: () => void;
  onDelete?: () => void;
}

export const TransactionItem = ({ transaction, onTap, onDelete }: TransactionItemProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const handlers = useLongPress({
    onLongPress: () => {
      if (onDelete) setMenuOpen(true);
    },
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
      }
    />
  );
};
