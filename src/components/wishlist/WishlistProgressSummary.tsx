"use client";

import { Progress } from "@/components/ui/progress";
import { MemeReaction } from "@/components/shared/MemeReaction";
import { formatHarga } from "@/lib/utils/wishlist";
import type { MoodKey } from "@/lib/constants/memes";

interface WishlistProgressSummaryProps {
  purchasedCount: number;
  totalCount: number;
  purchasedAmount: number;
  totalAmount: number;
}

/**
 * Map persentase progress → mood reaction. Personalization Plan §3.10:
 *   0–25%: nabung kalem        → empty
 *   25–75%: kapibara semangat  → thinking
 *   75–99%: hampir nyampe      → chill
 *   100% tercapai              → celebrate
 */
const moodForProgress = (percentage: number): MoodKey => {
  if (percentage >= 100) return "celebrate";
  if (percentage >= 75) return "chill";
  if (percentage >= 25) return "thinking";
  return "empty";
};

export const WishlistProgressSummary = ({
  purchasedCount,
  totalCount,
  purchasedAmount,
  totalAmount,
}: WishlistProgressSummaryProps) => {
  const percentage =
    totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0;
  const mood = moodForProgress(percentage);

  return (
    <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
      {/* Hero row — count anchor di kiri, meme 96px di kanan, mirror OwnerOverview pattern */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Progress wishlist</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            {purchasedCount}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / {totalCount} item
            </span>
          </p>
        </div>
        <MemeReaction
          mood={mood}
          size="lg"
          seed={`wishlist-${mood}`}
          className="h-24 w-24 text-4xl shrink-0 ml-auto mr-6"
        />
      </div>

      {/* Progress bar + percentage label */}
      <div className="mt-4 space-y-1.5">
        <Progress value={percentage} className="h-2" />
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground tabular-nums">
          <span>{percentage}% selesai</span>
          <span>{totalCount - purchasedCount} tersisa</span>
        </div>
      </div>

      {/* Amount pills — terbeli vs total, sejajar dengan income/expense di OwnerOverview */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-primary/10 px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Terbeli
          </p>
          <p className="text-sm font-mono font-semibold tabular-nums text-primary">
            {formatHarga(purchasedAmount)}
          </p>
        </div>
        <div className="rounded-lg bg-muted px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Total
          </p>
          <p className="text-sm font-mono font-semibold tabular-nums">
            {formatHarga(totalAmount)}
          </p>
        </div>
      </div>
    </div>
  );
};
