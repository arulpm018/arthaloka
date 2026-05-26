import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { processImageToDataUrl } from "@/lib/utils/imageProcessing";
import type { CustomMeme, CreateCustomMemeInput } from "@/types/meme";

const COLLECTION = "memes";

/**
 * Service untuk CRUD custom meme. Foto disimpan inline sebagai Base64 data
 * URL di field `dataUrl` — zero-storage, butuh Firestore aja (Spark plan
 * compatible).
 *
 * Compression target: 700 KB binary (≈ 932 KB Base64) supaya doc tetap di
 * bawah 1 MB Firestore limit setelah ditambah metadata.
 */
export const memesService = {
  create: async (
    input: Omit<CreateCustomMemeInput, "dataUrl" | "format"> & { file: File }
  ): Promise<CustomMeme> => {
    const { file, ...metadata } = input;

    // Process file → data URL (auto-retry quality + dimension).
    const processed = await processImageToDataUrl(file, {
      maxDimension: 720,
      quality: 0.85,
      outputType: "image/jpeg",
      maxBytes: 700 * 1024,
    });

    const isAnimated = file.type === "image/gif";
    const format: CustomMeme["format"] = isAnimated ? "gif" : "jpg";

    const colRef = collection(db, COLLECTION);
    const ref = await addDoc(colRef, {
      mood: metadata.mood,
      alt: metadata.alt,
      createdBy: metadata.createdBy,
      isActive: true,
      dataUrl: processed.dataUrl,
      format,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      memeId: ref.id,
      ...metadata,
      dataUrl: processed.dataUrl,
      format,
      isActive: true,
      // Stamps di-fill server-side; cast biar ga maksa fetch lagi.
      createdAt: serverTimestamp() as never,
      updatedAt: serverTimestamp() as never,
    };
  },

  /** Update metadata tanpa replace foto. */
  updateMetadata: async (
    memeId: string,
    updates: Partial<Pick<CustomMeme, "alt" | "mood" | "isActive">>
  ): Promise<void> => {
    const ref = doc(db, COLLECTION, memeId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  remove: async (memeId: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION, memeId));
  },
};
