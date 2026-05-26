import { Timestamp } from "firebase/firestore";
import type { MoodKey } from "@/lib/constants/memes";

/**
 * Custom meme yang di-upload user. Disimpan inline sebagai Base64 data URL
 * di Firestore `memes/{memeId}.dataUrl`. Pendekatan zero-storage — kompatibel
 * dengan Firebase Spark (gratis) tanpa butuh Cloud Storage / Blaze plan.
 *
 * Coexist dengan static `MEMES_BY_MOOD` di code — `<MemeReaction>` resolve
 * ordering: custom (Firestore) → static (constants) → emoji fallback.
 */
export interface CustomMeme {
  memeId: string;
  mood: MoodKey;
  /** Base64 data URL: `data:image/jpeg;base64,...` atau `data:image/gif;base64,...`. */
  dataUrl: string;
  /** A11y wajib. */
  alt: string;
  /** `gif` untuk animated, `jpg` untuk static. Hint render. */
  format: "gif" | "jpg" | "webp";
  /** UID yang upload — buat audit kalau perlu. */
  createdBy: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateCustomMemeInput = Omit<
  CustomMeme,
  "memeId" | "createdAt" | "updatedAt" | "isActive"
>;
