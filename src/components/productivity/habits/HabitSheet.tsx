"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils/cn";
import { Habit, HabitFrequency } from "@/types";
import { habitSchema } from "@/lib/validations/habit.schema";
import { DAY_LABELS_SHORT } from "@/lib/utils/productivity";
import { habitIconOptions } from "@/lib/utils/habitIcons";

// Urutan tampil Senin-awal; value mengikuti Date.getDay().
const DAY_OPTIONS = [
  { value: 1, label: "Sen" },
  { value: 2, label: "Sel" },
  { value: 3, label: "Rab" },
  { value: 4, label: "Kam" },
  { value: 5, label: "Jum" },
  { value: 6, label: "Sab" },
  { value: 0, label: "Min" },
];

interface HabitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Habit yang diedit — null = tambah baru */
  habit: Habit | null;
  onSubmit: (values: { name: string; icon: string; frequency: HabitFrequency }) => Promise<void>;
  onDelete?: (habit: Habit) => Promise<void>;
}

export const HabitSheet = ({
  open,
  onOpenChange,
  habit,
  onSubmit,
  onDelete,
}: HabitSheetProps) => {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("droplet");
  const [frequencyType, setFrequencyType] = useState<"daily" | "weekly">("daily");
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEditing = !!habit;

  useEffect(() => {
    if (open) {
      setName(habit?.name ?? "");
      setIcon(habit?.icon ?? "droplet");
      setFrequencyType(habit?.frequency.type ?? "daily");
      setDays(habit?.frequency.type === "weekly" ? habit.frequency.days : [1, 3, 5]);
      setError(null);
      setConfirmDelete(false);
    }
  }, [open, habit]);

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = habitSchema.safeParse({
      name,
      icon,
      frequency:
        frequencyType === "daily"
          ? { type: "daily" }
          : { type: "weekly", days },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Data tidak valid");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(parsed.data);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save habit:", err);
      toast.error("Gagal menyimpan habit. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!habit || !onDelete) return;
    try {
      await onDelete(habit);
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to delete habit:", err);
      toast.error("Gagal menghapus habit. Coba lagi.");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[90vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>{isEditing ? "Edit Habit" : "Habit Baru"}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="habit-name" className="text-sm font-medium">
                Nama
              </label>
              <Input
                id="habit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Minum 8 gelas air"
                autoFocus={!isEditing}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ikon</label>
              <div className="grid grid-cols-6 gap-1.5">
                {habitIconOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIcon(opt.id)}
                    title={opt.label}
                    aria-label={`Pilih ikon ${opt.label}`}
                    aria-pressed={icon === opt.id}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg border transition-colors",
                      icon === opt.id
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent/50"
                    )}
                  >
                    <opt.icon className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Jadwal</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFrequencyType("daily")}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    frequencyType === "daily"
                      ? "border-foreground bg-accent font-medium"
                      : "border-border text-muted-foreground hover:bg-accent/50"
                  )}
                >
                  Setiap hari
                </button>
                <button
                  type="button"
                  onClick={() => setFrequencyType("weekly")}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    frequencyType === "weekly"
                      ? "border-foreground bg-accent font-medium"
                      : "border-border text-muted-foreground hover:bg-accent/50"
                  )}
                >
                  Hari tertentu
                </button>
              </div>

              {frequencyType === "weekly" && (
                <div className="mt-2 flex gap-1.5">
                  {DAY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleDay(opt.value)}
                      aria-label={`Hari ${DAY_LABELS_SHORT[opt.value]}`}
                      aria-pressed={days.includes(opt.value)}
                      className={cn(
                        "h-10 flex-1 rounded-lg border text-xs transition-colors",
                        days.includes(opt.value)
                          ? "border-foreground bg-accent font-medium"
                          : "border-border text-muted-foreground hover:bg-accent/50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2 pt-1">
              {isEditing && onDelete && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  Hapus
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Hapus habit ini?"
        description={`"${habit?.name ?? ""}" beserta riwayat streak akan dihapus.`}
      />
    </>
  );
};
