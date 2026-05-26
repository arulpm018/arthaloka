import {
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types";

const COLLECTION = "users";

type UserPreferences = User["preferences"];

/**
 * Build a dot-notation update payload for a partial preferences update.
 * Example: { theme: "dark" } → { "preferences.theme": "dark" }
 *
 * Using dot-notation avoids replacing the entire `preferences` map and keeps
 * sibling keys (e.g. quickCategories) intact when only one key is updated.
 */
const toPreferencesDotPath = (
  updates: Partial<UserPreferences>
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    payload[`preferences.${key}`] = value;
  }
  return payload;
};

export const usersService = {
  /**
   * Partially update a user's preferences using dot-notation paths so that
   * untouched preference keys are preserved.
   */
  updatePreferences: async (
    uid: string,
    updates: Partial<UserPreferences>
  ): Promise<void> => {
    const ref = doc(db, COLLECTION, uid);
    await updateDoc(ref, {
      ...toPreferencesDotPath(updates),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Foundation for future partner-linking flow (V3). Stores `partnerUid` on
   * the user doc. Caller is responsible for performing the reciprocal update
   * on the partner document and any whitelist/permission checks.
   */
  linkPartner: async (uid: string, partnerUid: string): Promise<void> => {
    const ref = doc(db, COLLECTION, uid);
    await updateDoc(ref, {
      partnerUid,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Update relationship metadata (anniversary date). Pakai dot-notation biar
   * field selain yang di-update tetap intact. Pass `null` untuk hapus field.
   */
  updateRelationship: async (
    uid: string,
    updates: Partial<{ anniversaryDate: Timestamp | null }>
  ): Promise<void> => {
    const ref = doc(db, COLLECTION, uid);
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if ("anniversaryDate" in updates) {
      payload["relationship.anniversaryDate"] =
        updates.anniversaryDate === null
          ? deleteField()
          : updates.anniversaryDate;
    }
    await updateDoc(ref, payload);
  },
};
