import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  partnerUid?: string;
  role: "arul" | "fifi";
  currency: "IDR";
  preferences: {
    theme: "light" | "dark" | "system";
    defaultAccountId?: string;
    quickCategories: string[];
    /**
     * Toggle untuk meme reaction di seluruh app (mood indicator, budget alert
     * GIF, empty state). Default ON jika `undefined`. Bisa di-off lewat
     * Settings → Privasi.
     */
    showMemes?: boolean;
    /**
     * URL avatar custom yang di-upload user (override Google `photoURL`).
     * Phase ini belum dipakai — slot untuk upload via Firebase Storage.
     */
    customAvatarUrl?: string;
  };
  inviteCode?: string;
  /**
   * Optional metadata pasangan — tampil di CoupleHero (Together page).
   */
  relationship?: {
    /** Tanggal jadian — caption "Berdua sejak ..." */
    anniversaryDate?: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
