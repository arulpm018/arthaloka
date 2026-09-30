"use client";

import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/useAppStore";

type EntryType = "expense" | "income" | "transfer";

const OPTIONS: { value: EntryType; label: string }[] = [
  { value: "expense", label: "Keluar" },
  { value: "income", label: "Masuk" },
  { value: "transfer", label: "Transfer" },
];

/** Segmented Keluar · Masuk · Transfer di atas form catat. */
export const EntryTypeTabs = ({ value }: { value: EntryType }) => {
  const openSheet = useAppStore((s) => s.openSheet);

  return (
    <div role="tablist" aria-label="Jenis catatan" className="grid grid-cols-3 rounded-full bg-muted p-1">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => !active && openSheet(opt.value)}
            className={cn(
              "rounded-full py-1.5 text-sm font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
