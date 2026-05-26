"use client";

import { ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useLongPress } from "@/hooks/useLongPress";
import { TransactionItemActions } from "./TransactionItemActions";
import { Transfer } from "@/types";

interface TransferItemProps {
  transfer: Transfer;
  onTap: () => void;
  onDelete?: () => void;
}

export const TransferItem = ({ transfer, onTap, onDelete }: TransferItemProps) => {
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
          <div className="w-9 h-9 rounded-full bg-transfer/10 flex items-center justify-center">
            <ArrowRightLeft className="h-4 w-4 text-transfer" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{transfer.name}</p>
            <p className="text-xs text-muted-foreground">
              {transfer.fromAccountName} → {transfer.toAccountName}
            </p>
          </div>
          <p className="text-sm font-mono font-medium tabular-nums text-transfer">
            {formatCurrency(transfer.amount)}
          </p>
        </button>
      }
    />
  );
};
