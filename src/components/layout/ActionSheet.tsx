"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ActionType = "expense" | "income" | "transfer" | "wishlist";

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ActionType) => void;
}

const actions = [
  {
    type: "expense" as const,
    label: "Pengeluaran",
    description: "Catat pengeluaran baru",
    icon: ArrowDownCircle,
    color: "text-expense",
    bg: "bg-expense/10",
  },
  {
    type: "income" as const,
    label: "Pemasukan",
    description: "Catat pemasukan baru",
    icon: ArrowUpCircle,
    color: "text-income",
    bg: "bg-income/10",
  },
  {
    type: "transfer" as const,
    label: "Transfer",
    description: "Pindah antar akun",
    icon: ArrowLeftRight,
    color: "text-transfer",
    bg: "bg-transfer/10",
  },
  {
    type: "wishlist" as const,
    label: "Wishlist",
    description: "Tambah barang inceran",
    icon: Sparkles,
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

export const ActionSheet = ({ open, onClose, onSelect }: ActionSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-sheet">
        <SheetHeader>
          <SheetTitle>Tambah</SheetTitle>
        </SheetHeader>
        <div className="grid gap-2 py-4">
          {actions.map((action) => (
            <button
              key={action.type}
              onClick={() => {
                onSelect(action.type);
                onClose();
              }}
              className="flex items-center gap-4 rounded-lg p-3 text-left transition-colors hover:bg-accent active:bg-accent"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  action.bg
                )}
              >
                <action.icon className={cn("h-5 w-5", action.color)} />
              </div>
              <div>
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
