"use client";

import { useId, useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB hard cap (storage rules: 5 MB after compression)
const ACCEPTED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ImageUploaderProps {
  /** Pre-existing image (current avatar / couple photo / meme). */
  currentUrl?: string | null;
  /** Aspect ratio preview. Default 1 (square). Pakai 16/10 buat hero. */
  aspectRatio?: number;
  /** Hint copy di button picker. Default "Upload foto". */
  pickerLabel?: string;
  /** Tampilkan tombol hapus kalau ada `currentUrl`. */
  allowRemove?: boolean;
  /** Async — caller balikin URL baru setelah upload selesai (untuk reset state). */
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  className?: string;
}

/**
 * Generic image picker dengan preview + upload progress. Caller handle
 * processing + storage upload via `onUpload(file)`. Component cuma:
 *   - validasi tipe & ukuran
 *   - tampilin local preview (FileReader) sebelum upload selesai
 *   - swap preview ke `currentUrl` setelah caller resolve
 *   - tombol Hapus opsional
 */
export const ImageUploader = ({
  currentUrl,
  aspectRatio = 1,
  pickerLabel = "Upload foto",
  allowRemove = true,
  onUpload,
  onRemove,
  className,
}: ImageUploaderProps) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = localPreview ?? currentUrl ?? null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    // Validasi awal — caller juga akan validasi di processImageFile, tapi
    // di sini kita kasih feedback cepat sebelum read.
    if (!ACCEPTED_MIMES.includes(file.type)) {
      setError("Format tidak didukung. Pakai JPG, PNG, WebP, atau GIF.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File kebesaran. Maksimal 10 MB.");
      e.target.value = "";
      return;
    }

    // Local preview — instant feedback sebelum upload selesai.
    const reader = new FileReader();
    reader.onload = () => {
      setLocalPreview(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      await onUpload(file);
      // Caller udah update parent state → currentUrl bakal refresh.
      // Local preview di-clear supaya ke-render dari source-of-truth.
      setLocalPreview(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal upload. Coba lagi.";
      setError(message);
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
      e.target.value = ""; // allow re-select file yang sama
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setError(null);
    setIsRemoving(true);
    try {
      await onRemove();
      setLocalPreview(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal hapus. Coba lagi.";
      setError(message);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-border bg-muted",
          aspectRatio === 1 ? "aspect-square" : ""
        )}
        style={aspectRatio !== 1 ? { aspectRatio } : undefined}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Preview foto"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Upload className="h-6 w-6" />
          </div>
        )}
        {(isUploading || isRemoving) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-foreground" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_MIMES.join(",")}
          onChange={handleFileChange}
          className="sr-only"
          disabled={isUploading || isRemoving}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading || isRemoving}
        >
          <Upload className="h-4 w-4" />
          {currentUrl ? "Ganti" : pickerLabel}
        </Button>
        {allowRemove && currentUrl && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isUploading || isRemoving}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
            Hapus
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
