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
import { Owner, ScheduleEvent } from "@/types";
import { OWNER_COLORS, OWNER_LABELS } from "@/lib/constants/labels";
import { cn } from "@/lib/utils/cn";
import { eventSchema } from "@/lib/validations/event.schema";

interface EventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Event yang diedit — null = tambah baru */
  event: ScheduleEvent | null;
  /** Tanggal default saat tambah baru */
  defaultDate: string;
  /** Pemilik default saat tambah baru — biasanya role user aktif */
  defaultOwner: Owner;
  onSubmit: (values: {
    title: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    notes: string | null;
    owner: Owner;
  }) => Promise<void>;
  onDelete?: (event: ScheduleEvent) => Promise<void>;
}

const OWNER_OPTIONS: Owner[] = ["arul", "fifi", "shared"];

export const EventSheet = ({
  open,
  onOpenChange,
  event,
  defaultDate,
  defaultOwner,
  onSubmit,
  onDelete,
}: EventSheetProps) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [owner, setOwner] = useState<Owner>(defaultOwner);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEditing = !!event;

  useEffect(() => {
    if (open) {
      setTitle(event?.title ?? "");
      setDate(event?.date ?? defaultDate);
      setStartTime(event?.startTime ?? "");
      setEndTime(event?.endTime ?? "");
      setLocation(event?.location ?? "");
      setNotes(event?.notes ?? "");
      setOwner(event?.owner ?? defaultOwner);
      setError(null);
      setConfirmDelete(false);
    }
  }, [open, event, defaultDate, defaultOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = eventSchema.safeParse({
      title,
      date,
      startTime: startTime || null,
      endTime: endTime || null,
      location: location || null,
      notes: notes || null,
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
      console.error("Failed to save event:", err);
      toast.error("Gagal menyimpan acara. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    try {
      await onDelete(event);
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to delete event:", err);
      toast.error("Gagal menghapus acara. Coba lagi.");
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
            <SheetTitle>{isEditing ? "Edit Acara" : "Acara Baru"}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="event-title" className="text-sm font-medium">
                Judul
              </label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Dinner anniversary"
                autoFocus={!isEditing}
              />
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Pemilik acara</legend>
              <div className="grid grid-cols-3 gap-2">
                {OWNER_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setOwner(option)}
                    aria-pressed={owner === option}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                      owner === option
                        ? "border-foreground/25 bg-accent text-accent-foreground"
                        : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: OWNER_COLORS[option] }}
                      aria-hidden="true"
                    />
                    {OWNER_LABELS[option]}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="event-date" className="text-sm font-medium">
                  Tanggal
                </label>
                <Input
                  id="event-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="event-start" className="text-sm font-medium">
                  Mulai <span className="text-muted-foreground">(ops.)</span>
                </label>
                <Input
                  id="event-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="event-end" className="text-sm font-medium">
                  Selesai <span className="text-muted-foreground">(ops.)</span>
                </label>
                <Input
                  id="event-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="event-location" className="text-sm font-medium">
                  Lokasi <span className="text-muted-foreground">(ops.)</span>
                </label>
                <Input
                  id="event-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Tempat"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="event-notes" className="text-sm font-medium">
                Catatan <span className="text-muted-foreground">(opsional)</span>
              </label>
              <Textarea
                id="event-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detail acara…"
                rows={2}
              />
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
        title="Hapus acara ini?"
        description={`"${event?.title ?? ""}" akan dihapus permanen.`}
      />
    </>
  );
};
