import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { accountsService } from "@/lib/firestore/accounts";
import { CreateAccountInput } from "@/types";

const initialAccounts: Omit<CreateAccountInput, "ownerUid">[] = [
  { name: "Bank Mandiri", type: "bank", category: "personal", owner: "arul", balance: 25110, currency: "IDR", color: "#003D79", icon: "building-2", isActive: true, order: 0 },
  { name: "Bank Jago", type: "bank", category: "personal", owner: "arul", balance: 28773, currency: "IDR", color: "#FFD700", icon: "building-2", isActive: true, order: 1 },
  { name: "Bank Wondr", type: "bank", category: "personal", owner: "arul", balance: 3000, currency: "IDR", color: "#6C63FF", icon: "building-2", isActive: true, order: 2 },
  { name: "Saving Account", type: "savings", category: "personal", owner: "arul", balance: 2302049, currency: "IDR", color: "#0F9B58", icon: "piggy-bank", isActive: true, order: 3 },
  { name: "Bank BRI", type: "bank", category: "personal", owner: "fifi", balance: 8040800, currency: "IDR", color: "#003399", icon: "building-2", isActive: true, order: 0 },
  { name: "SeaBank", type: "e-wallet", category: "personal", owner: "fifi", balance: 14000, currency: "IDR", color: "#00BCD4", icon: "smartphone", isActive: true, order: 1 },
  { name: "Cash Wallet", type: "cash", category: "personal", owner: "fifi", balance: 500000, currency: "IDR", color: "#795548", icon: "wallet", isActive: true, order: 2 },
  { name: "Saving Account", type: "savings", category: "personal", owner: "fifi", balance: 0, currency: "IDR", color: "#E255A1", icon: "piggy-bank", isActive: true, order: 3 },
  { name: "Pacaran (Jago)", type: "bank", category: "shared", owner: "shared", balance: 335475, currency: "IDR", color: "#9B59B6", icon: "building-2", isActive: true, order: 0 },
  { name: "Investasi Tanah", type: "investment", category: "shared", owner: "shared", balance: 11400000, currency: "IDR", color: "#D9730D", icon: "trending-up", isActive: true, order: 1 },
  { name: "Investasi Saham", type: "investment", category: "shared", owner: "shared", balance: 33467069, currency: "IDR", color: "#2383E2", icon: "trending-up", isActive: true, order: 2 },
];

/**
 * Seeds initial accounts if the accounts collection is empty.
 * Call this from a settings page or dev tool.
 */
export async function seedAccounts(ownerUid: string): Promise<void> {
  // Check if accounts already exist
  const accountsRef = collection(db, "accounts");
  const existing = await getDocs(query(accountsRef, limit(1)));

  if (!existing.empty) {
    console.log("Accounts already seeded, skipping.");
    return;
  }

  for (const account of initialAccounts) {
    await accountsService.create({ ...account, ownerUid });
  }

  console.log(`Seeded ${initialAccounts.length} accounts.`);
}

export { initialAccounts };
