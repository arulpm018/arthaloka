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
  };
  inviteCode?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
