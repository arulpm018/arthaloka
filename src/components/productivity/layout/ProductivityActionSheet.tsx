"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Bot, CalendarDays, Flame, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ProductivityActionType = "task" | "event" | "habit" | "ai";

interface ProductivityActionSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ProductivityActionType) => void;
}

/**
 * Padanan ActionSheet finance untuk FAB modul produktivitas — dipakai di
 * halaman "Hari Ini" yang tidak punya sheet tambah sendiri. Pilihan
 * menavigasi ke halaman terkait dengan ?add=1 yang auto-open formnya.
 */
const actions = [
  {
    type: "task" as const,
    label: "Tugas",
    description: "Catat tugas baru",
    icon: ListTodo,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    type: "event" as const,
    label: "Jadwal",
    description: "Tambah acara",
    icon: CalendarDays,
    color: "text-capybara",
    bg: "bg-capybara/10",
  },
  {
    type: "habit" as const,
    label: "Habit",
    description: "Buat habit baru",
    icon: Flame,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    type: "ai" as const,
    label: "Asisten AI",
    description: "Bilang saja, langsung dibuatkan",
    icon: Bot,
    color: "text-capybara",
    bg: "bg-capybara/10",
  },
];

export const ProductivityActionSheet = ({
  open,
  onClose,
  onSelect,
}: ProductivityActionSheetProps) => {
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
