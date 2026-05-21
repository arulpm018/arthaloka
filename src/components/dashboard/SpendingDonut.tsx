"use client";

import { formatCurrency } from "@/lib/utils/formatCurrency";

interface SpendingDonutProps {
  data: { categoryName: string; amount: number; color: string }[];
}

const COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
];

export const SpendingDonut = ({ data }: SpendingDonutProps) => {
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const sorted = [...data]
    .map((d, i) => ({
      ...d,
      color: d.color !== "#607D8B" ? d.color : COLORS[i % COLORS.length],
    }))
    .sort((a, b) => b.amount - a.amount);

  const maxAmount = sorted[0]?.amount || 1;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Pengeluaran per Kategori</h3>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {formatCurrency(total)}
        </span>
      </div>

      <div className="space-y-3">
        {sorted.map((item) => {
          const percentage = Math.round((item.amount / total) * 100);
          const barWidth = Math.round((item.amount / maxAmount) * 100);

          return (
            <div key={item.categoryName} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium truncate max-w-[50%]">
                  {item.categoryName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono tabular-nums text-muted-foreground">
                    {percentage}%
                  </span>
                  <span className="text-xs font-mono font-medium tabular-nums">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
