import type { Account, Owner } from "@/types";

const OWNER_ORDER: Owner[] = ["arul", "fifi", "shared"];

/** Kelompokkan rekening per pemilik (Arul, Fifi, Bersama) + subtotal & total. */
export function summarizeAccountsByOwner<T extends Pick<Account, "owner" | "balance">>(accounts: T[]) {
  const groups = OWNER_ORDER.map((owner) => {
    const items = accounts.filter((a) => a.owner === owner);
    return {
      owner,
      subtotal: items.reduce((sum, a) => sum + a.balance, 0),
      accounts: items,
    };
  }).filter((g) => g.accounts.length > 0);

  return { total: accounts.reduce((sum, a) => sum + a.balance, 0), groups };
}
