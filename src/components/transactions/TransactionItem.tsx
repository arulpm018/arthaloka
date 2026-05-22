"use client";

import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { Transaction } from "@/types";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface TransactionItemProps {
  transaction: Transaction;
  onTap: () => void;
  onDelete?: () => void;
}

export const TransactionItem = ({ transaction, onTap, onDelete }: TransactionItemProps) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onTap}
        onContextMenu={(e) => {
          if (onDelete) {
            e.preventDefault();
            setShowActions(!showActions);
          }
        }}
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
      {showActions && onDelete && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(false);
              onDelete();
            }}
            className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus
          </button>
        </div>
      )}
    </div>
  );
};
