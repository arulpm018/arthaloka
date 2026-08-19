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
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils/cn";
import { Task, Owner } from "@/types";
import { taskSchema } from "@/lib/validations/task.schema";
import { useAppStore } from "@/store/useAppStore";
import { OWNER_LABELS } from "@/lib/constants/labels";

interface TaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Task yang diedit — null = tambah baru */
  task: Task | null;
  onSubmit: (values: {
    title: string;
    notes: string | null;
    dueDate: string | null;
    owner: Owner;
  }) => Promise<void>;
  onDelete?: (task: Task) => Promise<void>;
}

export const TaskSheet = ({
  open,
  onOpenChange,
  task,
  onSubmit,
  onDelete,
}: TaskSheetProps) => {
  const role = useAppStore((s) => s.currentUser?.role);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [owner, setOwner] = useState<Owner>("shared");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEditing = !!task;

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setNotes(task?.notes ?? "");
      setDueDate(task?.dueDate ?? "");
      setOwner(task?.owner ?? role ?? "shared");
      setError(null);
      setConfirmDelete(false);
    }
  }, [open, task, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = taskSchema.safeParse({
      title,
      notes: notes || null,
      dueDate: dueDate || null,
      owner,
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
      console.error("Failed to save task:", err);
      toast.error("Gagal menyimpan tugas. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    try {
      await onDelete(task);
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to delete task:", err);
      toast.error("Gagal menghapus tugas. Coba lagi.");
    }
  };

  const ownerOptions: { value: Owner; label: string }[] = [
    { value: role ?? "shared", label: role ? OWNER_LABELS[role] : "Saya" },
    { value: "shared", label: "Berdua" },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[90vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>{isEditing ? "Edit Tugas" : "Tugas Baru"}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="task-title" className="text-sm font-medium">
                Judul
              </label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Beli kopi"
                autoFocus={!isEditing}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-notes" className="text-sm font-medium">
                Catatan <span className="text-muted-foreground">(opsional)</span>
              </label>
              <Textarea
                id="task-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detail tugas…"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-due" className="text-sm font-medium">
                Tenggat <span className="text-muted-foreground">(opsional)</span>
              </label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                min="2000-01-01"
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Milik</label>
              <div className="grid grid-cols-2 gap-2">
                {ownerOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOwner(opt.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      owner === opt.value
                        ? "border-foreground bg-accent font-medium"
                        : "border-border text-muted-foreground hover:bg-accent/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
        title="Hapus tugas ini?"
        description={`"${task?.title ?? ""}" akan dihapus permanen.`}
      />
    </>
  );
};
