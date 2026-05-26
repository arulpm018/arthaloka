"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { OwnerAvatar } from "@/components/shared/OwnerAvatar";
import { processImageToDataUrl } from "@/lib/utils/imageProcessing";
import { usersService } from "@/lib/firestore/users";
import { cn } from "@/lib/utils/cn";
import type { User } from "@/types";

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;

interface AvatarSectionProps {
  user: User;
}

/**
 * Profile header — avatar besar dengan camera button overlay (mirip pattern
 * iOS/Android), nama, email. Hapus button cuma muncul kalau ada custom avatar.
 *
 * Foto di-resize 384px JPEG dan disimpan inline sebagai Base64 data URL di
 * `users/{uid}.preferences.customAvatarUrl` (zero-storage).
 */
export const AvatarSection = ({ user }: AvatarSectionProps) => {
  const customUrl = user.preferences?.customAvatarUrl ?? null;
  const displayUrl = customUrl ?? user.photoURL ?? null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > MAX_BYTES) {
      setError("File kebesaran. Maksimal 10 MB.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const processed = await processImageToDataUrl(file, {
        maxDimension: 384,
        quality: 0.85,
        outputType: "image/jpeg",
        maxBytes: 250 * 1024,
      });
      await usersService.updatePreferences(user.uid, {
        customAvatarUrl: processed.dataUrl,
      });
      toast.success("Foto profil tersimpan");
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      const message =
        err instanceof Error ? err.message : "Gagal upload foto profil";
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    if (!customUrl) return;
    setError(null);
    setIsUploading(true);
    try {
      await usersService.updatePreferences(user.uid, {
        customAvatarUrl: undefined,
      });
      toast.success("Foto profil dihapus");
    } catch (err) {
      console.error("Failed to delete avatar:", err);
      toast.error("Gagal hapus foto profil");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center px-4 py-6">
      <div className="relative">
        <OwnerAvatar owner={user.role} photoURL={displayUrl} size="lg" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center",
            "rounded-full border-2 border-background bg-foreground text-background shadow-sm",
            "hover:bg-foreground/90 active:scale-95 transition-all",
            "disabled:opacity-50 disabled:pointer-events-none"
          )}
          aria-label={customUrl ? "Ganti foto profil" : "Upload foto profil"}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleFileChange}
          className="sr-only"
          disabled={isUploading}
        />
      </div>

      <p className="mt-3 text-base font-semibold leading-tight">
        {user.displayName || "User"}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>

      {customUrl && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isUploading}
          className="mt-3 flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          Hapus foto custom
        </button>
      )}

      {error && (
        <p className="mt-2 text-xs text-destructive max-w-[280px]">{error}</p>
      )}
    </div>
  );
};
