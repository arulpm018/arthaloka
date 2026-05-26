import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { processImageToDataUrl } from "@/lib/utils/imageProcessing";

const DOC_PATH = ["appConfig", "couple"] as const;

export interface CouplePhoto {
  /** Base64 data URL — `data:image/jpeg;base64,...`. */
  dataUrl: string;
  updatedBy: string;
  updatedAt: Timestamp;
}

/**
 * Single shared slot untuk foto couple. Doc `appConfig/couple` di Firestore;
 * kedua user bisa overwrite. Compression target lebih rendah (550 KB) karena
 * foto ini dipake di hero & login background, butuh dimensi sedikit lebih
 * besar (1024px) — lebih ringan ke quality dibanding dimensi.
 */
export const couplePhotoService = {
  get: async (): Promise<CouplePhoto | null> => {
    const ref = doc(db, ...DOC_PATH);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as CouplePhoto;
  },

  set: async (file: File, uid: string): Promise<CouplePhoto> => {
    const processed = await processImageToDataUrl(file, {
      maxDimension: 1024,
      quality: 0.85,
      outputType: "image/jpeg",
      maxBytes: 700 * 1024,
    });
    const ref = doc(db, ...DOC_PATH);
    const payload = {
      dataUrl: processed.dataUrl,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    return {
      dataUrl: processed.dataUrl,
      updatedBy: uid,
      updatedAt: serverTimestamp() as never,
    };
  },

  remove: async (): Promise<void> => {
    const ref = doc(db, ...DOC_PATH);
    await deleteDoc(ref);
  },
};
