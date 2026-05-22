"use client";

import { Progress } from "@/components/ui/progress";
import { formatHarga } from "@/lib/utils/wishlist";

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
  const percentage = totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Progress Wishlist</p>
        <span className="text-xs text-muted-foreground font-medium">
          {percentage}%
        </span>
      </div>

      <Progress value={percentage} className="h-2" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{purchasedCount}/{totalCount} items purchased</span>
        <span className="font-mono">
          {formatHarga(purchasedAmount)} / {formatHarga(totalAmount)}
        </span>
      </div>
    </div>
  );
};
