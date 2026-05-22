"use client";

import { Progress } from "@/components/ui/progress";
import { formatHarga } from "@/lib/utils/wishlist";
import { CheckCircle2, Circle } from "lucide-react";

interface WishlistProgressSummaryProps {
  purchasedCount: number;
  totalCount: number;
  purchasedAmount: number;
  totalAmount: number;
}

export const WishlistProgressSummary = ({
  purchasedCount,
  totalCount,
  purchasedAmount,
  totalAmount,
}: WishlistProgressSummaryProps) => {
  const percentage =
    totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 p-5 space-y-4">
      {/* Top row: icon + counts */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          {percentage === 100 ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold tabular-nums">
            {purchasedCount}
            <span className="text-sm font-normal text-muted-foreground">
              /{totalCount} item
            </span>
          </p>
          <p className="text-xs text-muted-foreground">sudah terbeli</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold font-mono tabular-nums">
            {formatHarga(purchasedAmount)}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            dari {formatHarga(totalAmount)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress value={percentage} className="h-2" />
        <p className="text-[11px] text-muted-foreground text-right">
          {percentage}% selesai
        </p>
      </div>
    </div>
  );
};
