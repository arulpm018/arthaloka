"use client";

import { ArrowRightLeft, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { Transfer } from "@/types";
import { useState } from "react";

interface TransferItemProps {
  transfer: Transfer;
  onTap: () => void;
  onDelete?: () => void;
}

export const TransferItem = ({ transfer, onTap, onDelete }: TransferItemProps) => {
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
