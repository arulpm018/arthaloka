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
     * URL avatar custom yang di-upload user (override Google `photoURL`).
     * Phase ini belum dipakai — slot untuk upload via Firebase Storage.
     */
    customAvatarUrl?: string;
  };
  inviteCode?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
