"use client";

import { toast } from "sonner";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { useCouplePhoto } from "@/hooks/useCouplePhoto";
import { useAppStore } from "@/store/useAppStore";

/**
 * Couple photo uploader. Foto disimpan inline sebagai Base64 data URL di
 * doc Firestore `appConfig/couple` (single shared slot, bisa ditulis
 * keduanya). Realtime sync via `useCouplePhoto`.
 */
export const CouplePhotoSection = () => {
  const { photo, service } = useCouplePhoto();
  const currentUser = useAppStore((s) => s.currentUser);

  const handleUpload = async (file: File) => {
    if (!currentUser) {
      toast.error("Harus login dulu");
      throw new Error("not authenticated");
    }
    try {
      await service.set(file, currentUser.uid);
      toast.success("Foto bareng tersimpan");
    } catch (err) {
      console.error("Failed to upload couple photo:", err);
      toast.error(
        err instanceof Error ? err.message : "Gagal upload foto bareng"
      );
      throw err;
    }
  };

  const handleRemove = async () => {
    try {
      await service.remove();
      toast.success("Foto bareng dihapus");
    } catch (err) {
      console.error("Failed to delete couple photo:", err);
      toast.error("Gagal hapus foto bareng");
      throw err;
    }
  };

  return (
    <ImageUploader
      currentUrl={photo?.dataUrl ?? null}
      aspectRatio={16 / 10}
      pickerLabel="Upload foto bareng"
      onUpload={handleUpload}
      onRemove={photo ? handleRemove : undefined}
    />
  );
};
