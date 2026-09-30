import { OWNER_LABELS } from "@/lib/constants/labels";
import type { User } from "@/types";

type Person = Pick<User, "uid" | "role"> | null | undefined;

/** Nama pencatat transaksi dari `ownerUid` (Arul/Fifi); null kalau tak dikenal. */
export function recorderLabel(uid: string | undefined, currentUser: Person, partner: Person): string | null {
  if (!uid) return null;
  if (currentUser && uid === currentUser.uid) return OWNER_LABELS[currentUser.role];
  if (partner && uid === partner.uid) return OWNER_LABELS[partner.role];
  return null;
}
