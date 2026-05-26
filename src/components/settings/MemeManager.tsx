"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useCustomMemes } from "@/hooks/useCustomMemes";
import { MOOD_CAPTIONS, MOOD_EMOJI, type MoodKey } from "@/lib/constants/memes";
import { cn } from "@/lib/utils/cn";
import type { CustomMeme } from "@/types/meme";

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;

const MOOD_OPTIONS: MoodKey[] = [
  "rich", "chill", "normal", "warning", "broke",
  "thinking", "stress", "panic",
  "celebrate", "sad", "romance", "empty",
];

interface MemeManagerProps {
  /** UID user yang upload — di-pass ke `createdBy`. */
  uid: string;
}

type FilterMood = MoodKey | "all";

/**
 * Settings panel untuk manage custom meme.
 *
 * Layout: filter pills (mood) di atas → grid 4 kolom kecil → tombol "+"
 * floating di pojok yang buka upload form (collapsible).
 */
export const MemeManager = ({ uid }: MemeManagerProps) => {
  const { memes, isLoading, service } = useCustomMemes();

  const [filter, setFilter] = useState<FilterMood>("all");
  const [showForm, setShowForm] = useState(false);

  const [pendingMood, setPendingMood] = useState<MoodKey>("celebrate");
  const [pendingAlt, setPendingAlt] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [memeToDelete, setMemeToDelete] = useState<CustomMeme | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Available moods (yang punya meme) untuk filter pills.
  const moodCounts = useMemo(() => {
    const map = new Map<MoodKey, number>();
    for (const m of memes) {
      map.set(m.mood, (map.get(m.mood) ?? 0) + 1);
    }
    return map;
  }, [memes]);

  const visibleMemes = useMemo(
    () => (filter === "all" ? memes : memes.filter((m) => m.mood === filter)),
    [memes, filter]
  );

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUploadError(null);
    if (!file) {
      setPendingFile(null);
      setPendingPreview(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("File kebesaran. Maksimal 10 MB.");
      e.target.value = "";
      return;
    }
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () =>
      setPendingPreview(
        typeof reader.result === "string" ? reader.result : null
      );
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setPendingAlt("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleUpload = async () => {
    if (!pendingFile) {
      setUploadError("Pilih file dulu");
      return;
    }
    if (!pendingAlt.trim()) {
      setUploadError("Tulis deskripsi (alt text) buat aksesibilitas");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      await service.create({
        mood: pendingMood,
        alt: pendingAlt.trim(),
        createdBy: uid,
        file: pendingFile,
      });
      toast.success("Meme tersimpan");
      // Auto-filter ke mood yang baru di-upload supaya user lihat hasilnya.
      setFilter(pendingMood);
      closeForm();
    } catch (err) {
      console.error("Failed to upload meme:", err);
      toast.error("Gagal upload meme");
      setUploadError(
        err instanceof Error ? err.message : "Gagal upload, coba lagi."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!memeToDelete) return;
    setIsDeleting(true);
    try {
      await service.remove(memeToDelete.memeId);
      toast.success("Meme dihapus");
      setMemeToDelete(null);
    } catch (err) {
      console.error("Failed to delete meme:", err);
      toast.error("Gagal hapus meme");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Action bar: count + add button */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {memes.length}{" "}
            <span className="text-muted-foreground font-normal">
              meme custom
            </span>
          </p>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Tambah meme
            </Button>
          )}
        </div>

        {/* Upload form — collapsible */}
        {showForm && (
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Meme baru</p>
              <button
                type="button"
                onClick={closeForm}
                className="p-1 -m-1 rounded-md text-muted-foreground hover:bg-accent"
                aria-label="Tutup form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Mood</label>
                <Select
                  value={pendingMood}
                  onValueChange={(v) => setPendingMood(v as MoodKey)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOOD_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MOOD_EMOJI[m]} {MOOD_CAPTIONS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  onChange={handleFilePick}
                  className={cn(
                    "block w-full text-xs text-muted-foreground",
                    "file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0",
                    "file:text-xs file:font-medium file:bg-background file:text-foreground",
                    "hover:file:bg-accent"
                  )}
                  disabled={isUploading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Deskripsi
              </label>
              <Input
                placeholder="Contoh: kucing nangis di dompet kosong"
                value={pendingAlt}
                onChange={(e) => setPendingAlt(e.target.value)}
                disabled={isUploading}
                maxLength={120}
              />
            </div>

            {pendingPreview && (
              <div className="flex items-center gap-3 rounded-lg bg-background p-2 border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingPreview}
                  alt="Preview meme"
                  className="h-12 w-12 rounded-md object-cover bg-muted"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {pendingFile?.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {pendingFile
                      ? `${(pendingFile.size / 1024).toFixed(0)} KB`
                      : ""}
                  </p>
                </div>
              </div>
            )}

            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={isUploading || !pendingFile || !pendingAlt.trim()}
                className="flex-1"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Upload
              </Button>
            </div>
          </div>
        )}

        {/* Filter pills — only show if there are memes */}
        {memes.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <FilterPill
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              Semua{" "}
              <span className="text-muted-foreground/70">({memes.length})</span>
            </FilterPill>
            {MOOD_OPTIONS.map((mood) => {
              const count = moodCounts.get(mood) ?? 0;
              if (count === 0) return null;
              return (
                <FilterPill
                  key={mood}
                  active={filter === mood}
                  onClick={() => setFilter(mood)}
                >
                  <span className="leading-none">{MOOD_EMOJI[mood]}</span>
                  <span>{MOOD_CAPTIONS[mood]}</span>
                  <span className="text-muted-foreground/70">({count})</span>
                </FilterPill>
              );
            })}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Memuat...</p>
        ) : memes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-8 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada meme custom
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Reaksi pakai emoji default. Tambah meme buat hidup-in dashboard.
            </p>
          </div>
        ) : visibleMemes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Belum ada meme di mood ini
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {visibleMemes.map((m) => (
              <MemeThumb
                key={m.memeId}
                meme={m}
                onDelete={() => setMemeToDelete(m)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!memeToDelete}
        onClose={() => setMemeToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus meme?"
        description={
          memeToDelete
            ? `Meme "${memeToDelete.alt}" akan dihapus permanen.`
            : ""
        }
        confirmLabel="Hapus"
        isLoading={isDeleting}
      />
    </>
  );
};

const FilterPill = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
      active
        ? "bg-foreground text-background"
        : "bg-muted text-muted-foreground hover:bg-accent"
    )}
  >
    {children}
  </button>
);

const MemeThumb = ({
  meme,
  onDelete,
}: {
  meme: CustomMeme;
  onDelete: () => void;
}) => (
  <div className="group relative rounded-lg overflow-hidden border border-border bg-muted aspect-square">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={meme.dataUrl}
      alt={meme.alt}
      loading="lazy"
      className="h-full w-full object-cover"
    />
    {/* Mood badge bottom-left */}
    <div className="absolute bottom-1 left-1 rounded-md bg-background/85 backdrop-blur-sm px-1.5 py-0.5 text-[11px] leading-none">
      {MOOD_EMOJI[meme.mood]}
    </div>
    <button
      type="button"
      onClick={onDelete}
      className={cn(
        "absolute top-1 right-1 p-1.5 rounded-md bg-background/85 text-destructive backdrop-blur-sm",
        "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
        "sm:opacity-0", // hover-reveal di sm+
        "max-sm:opacity-100" // selalu kelihatan di mobile (no hover state)
      )}
      aria-label={`Hapus meme ${meme.alt}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  </div>
);
