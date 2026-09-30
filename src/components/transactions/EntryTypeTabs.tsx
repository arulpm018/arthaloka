"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/useAppStore";

type EntryType = "expense" | "income" | "transfer";

const OPTIONS: { value: EntryType; label: string }[] = [
  { value: "expense", label: "Keluar" },
  { value: "income", label: "Masuk" },
  { value: "transfer", label: "Transfer" },
];

const TAB_CLASS = "flex items-center justify-center gap-1 rounded-full py-1.5 text-sm font-medium transition-colors";

/**
 * Segmented Keluar · Masuk · Transfer · AI di atas form catat. Tab AI
 * menutup form dan membuka chat asisten AI (catat pakai kalimat bebas).
 */
export const EntryTypeTabs = ({ value }: { value: EntryType }) => {
  const openSheet = useAppStore((s) => s.openSheet);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const openAiAssistant = useAppStore((s) => s.openAiAssistant);

  return (
    <div role="tablist" aria-label="Jenis catatan" className="grid grid-cols-4 rounded-full bg-muted p-1">
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
              TAB_CLASS,
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
      <button
        type="button"
        role="tab"
        aria-selected={false}
        onClick={() => {
          closeSheet();
          openAiAssistant();
        }}
        className={cn(TAB_CLASS, "text-primary hover:text-primary/80")}
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI
      </button>
    </div>
  );
};
