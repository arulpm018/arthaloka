"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Category, Transaction } from "@/types";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface RecapCategoryBreakdownProps {
  transactions: Transaction[];
  categories: Category[];
}

const MAX_ROWS = 6;
const FALLBACK_COLOR = "#64748b";

export const RecapCategoryBreakdown = ({
  transactions,
  categories,
}: RecapCategoryBreakdownProps) => {
  const router = useRouter();

  const grouped = new Map<
    string,
    { name: string; icon: string; color: string; spent: number; count: number }
  >();
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const cat = categories.find((c) => c.categoryId === t.categoryId);
      const entry = grouped.get(t.categoryId) ?? {
        name: cat?.name ?? t.categoryName ?? "Lainnya",
        icon: cat?.icon ?? "wallet",
        color: cat?.color ?? FALLBACK_COLOR,
        spent: 0,
        count: 0,
      };
      entry.spent += t.amount;
      entry.count += 1;
      grouped.set(t.categoryId, entry);
    });

  const sorted = Array.from(grouped.entries()).sort((a, b) => b[1].spent - a[1].spent);
  const visible = sorted.slice(0, MAX_ROWS);
  const rest = sorted.slice(MAX_ROWS);
  const restTotal = rest.reduce((sum, [, v]) => sum + v.spent, 0);
  const restCount = rest.reduce((sum, [, v]) => sum + v.count, 0);
  const total = sorted.reduce((sum, [, v]) => sum + v.spent, 0);

  if (total === 0) return null;

  const rows: {
    key: string;
    name: string;
    icon: string;
    color: string;
    spent: number;
    count: number;
    categoryId?: string;
  }[] = visible.map(([categoryId, v]) => ({ key: categoryId, categoryId, ...v }));
  if (rest.length > 0) {
    rows.push({
      key: "lainnya",
      name: `Lainnya (${rest.length} kategori)`,
      icon: "wallet",
      color: FALLBACK_COLOR,
      spent: restTotal,
      count: restCount,
    });
  }

  const maxAmount = sorted[0]?.[1].spent || 1;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Pengeluaran per Kategori</h3>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {formatCurrency(total)}
        </span>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <button
            key={row.key}
            onClick={
              row.categoryId
                ? () => router.push(`/transactions?categoryId=${row.categoryId}`)
                : undefined
            }
            className="w-full text-left space-y-1.5 rounded-lg -mx-1 px-1 py-1 transition-colors hover:bg-accent/50 active:bg-accent"
            aria-label={`Lihat transaksi kategori ${row.name}`}
          >
            <div className="flex items-center gap-2">
              <CategoryIcon icon={row.icon} color={row.color} size="sm" />
              <span className="text-sm font-medium flex-1 truncate">
                {row.name}
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {row.count}x
              </span>
              <span className="text-sm font-mono font-medium tabular-nums shrink-0">
                {formatCurrency(row.spent)}
              </span>
              {row.categoryId && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 pl-9">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((row.spent / maxAmount) * 100)}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
              <span className="text-[11px] font-mono tabular-nums text-muted-foreground w-9 text-right">
                {Math.round((row.spent / total) * 100)}%
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
