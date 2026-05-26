"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Calendar, Check, X } from "lucide-react";
import { usersService } from "@/lib/firestore/users";
import {
  parseDisplayYmd,
  parseIsoYmd,
  timestampToDisplayYmd,
  timestampToIsoYmd,
} from "@/lib/utils/dateInput";
import { cn } from "@/lib/utils/cn";
import type { Timestamp } from "firebase/firestore";

interface AnniversaryRowProps {
  uid: string;
  /** Current value dari Firestore — kalau berubah dari luar, sync state. */
  value: Timestamp | null | undefined;
}

/**
 * Settings row untuk anniversary date dengan dual input:
 * 1. Text input "DD/MM/YYYY" — cepet kalau udah hafal
 * 2. Tombol kalender kecil di kanan — buka native picker
 *
 * Disimpan sebagai UTC noon di Firestore via helpers di
 * `src/lib/utils/dateInput.ts` supaya nggak kena timezone shift bug.
 */
export const AnniversaryRow = ({ uid, value }: AnniversaryRowProps) => {
  const [text, setText] = useState(timestampToDisplayYmd(value));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const datePickerRef = useRef<HTMLInputElement>(null);

  // Sync local state kalau Firestore value berubah (e.g. dari device lain).
  useEffect(() => {
    setText(timestampToDisplayYmd(value));
    setError(null);
  }, [value]);

  // Auto-mask: angka aja, slash insert otomatis di posisi 2 dan 5.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d/]/g, "");
    let masked = raw;
    // Auto-insert slash kalau user ngetik tanpa
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 4) {
      masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    } else if (digits.length > 2) {
      masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    } else if (raw === digits) {
      masked = digits;
    }
    setText(masked);
    setError(null);
  };

  const persist = async (ts: Timestamp | null) => {
    setIsSaving(true);
    try {
      await usersService.updateRelationship(uid, { anniversaryDate: ts });
      toast.success(ts ? "Tanggal jadian tersimpan" : "Tanggal jadian dihapus");
      setError(null);
    } catch (err) {
      console.error("Failed to update anniversary:", err);
      toast.error("Gagal menyimpan tanggal");
      setError("Gagal menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      // Empty → hapus tanggal kalau sebelumnya ada.
      if (value) await persist(null);
      return;
    }
    const ts = parseDisplayYmd(trimmed);
    if (!ts) {
      setError("Format: DD/MM/YYYY");
      return;
    }
    if (ts.toMillis() > Date.now()) {
      setError("Tanggal nggak boleh di masa depan");
      return;
    }
    // Skip kalau ga ada perubahan
    if (value && ts.toMillis() === value.toMillis()) return;
    await persist(ts);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setText(timestampToDisplayYmd(value));
      setError(null);
      e.currentTarget.blur();
    }
  };

  // Native date picker (hidden input) — synced dengan text via parsed value.
  const isoValue = (() => {
    const parsed = parseDisplayYmd(text);
    return parsed ? timestampToIsoYmd(parsed) : timestampToIsoYmd(value);
  })();

  const handleNativePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const ymd = e.target.value;
    if (!ymd) {
      setText("");
      if (value) await persist(null);
      return;
    }
    const ts = parseIsoYmd(ymd);
    if (!ts) {
      setError("Tanggal invalid");
      return;
    }
    setText(timestampToDisplayYmd(ts));
    setError(null);
    if (!value || ts.toMillis() !== value.toMillis()) {
      await persist(ts);
    }
  };

  const handleClear = async () => {
    setText("");
    setError(null);
    if (value) await persist(null);
  };

  const isDirty = text.trim() !== timestampToDisplayYmd(value);
  const todayIso = timestampToIsoYmd(
    // build Timestamp from today UTC noon
    parseIsoYmd(new Date().toISOString().split("T")[0]) ?? undefined
  );

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">Tanggal jadian</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              "Format DD/MM/YYYY"
            )}
          </p>
        </div>

        <div className="relative flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            placeholder="DD/MM/YYYY"
            value={text}
            onChange={handleChange}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            maxLength={10}
            className={cn(
              "h-8 w-28 rounded-md border bg-background px-2 text-xs tabular-nums",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              error
                ? "border-destructive focus-visible:ring-destructive"
                : "border-input",
              isDirty && !error && "border-primary"
            )}
            aria-label="Tanggal jadian"
          />

          {/* Hidden native date picker — di-trigger dari icon button */}
          <input
            ref={datePickerRef}
            type="date"
            value={isoValue}
            onChange={handleNativePick}
            max={todayIso}
            className="sr-only"
            aria-hidden
            tabIndex={-1}
          />

          {value && !isSaving && !isDirty && (
            <button
              type="button"
              onClick={handleClear}
              className="flex h-8 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Hapus tanggal jadian"
              title="Hapus"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {isDirty && !error && !isSaving && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault() /* keep focus */}
              onClick={handleSubmit}
              className="flex h-8 w-7 items-center justify-center rounded-md text-primary hover:bg-primary/10"
              aria-label="Simpan tanggal"
              title="Simpan"
            >
              <Check className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const el = datePickerRef.current;
              if (!el) return;
              // Modern browsers — buka picker UI tanpa harus focus input.
              if (typeof el.showPicker === "function") el.showPicker();
              else el.click();
            }}
            disabled={isSaving}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            aria-label="Buka kalender"
            title="Pilih dari kalender"
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
