import { CreateAccountInput } from "@/types";
import { accountsService } from "@/lib/firestore/accounts";

/**
 * Initial account data for Arthafiloka.
 * Call seedAccounts() to populate Firestore with these accounts.
 */
const initialAccounts: CreateAccountInput[] = [
  {
    name: "Bank Mandiri",
    type: "bank",
    category: "personal",
    owner: "arul",
    ownerUid: "",
    balance: 25110,
    currency: "IDR",
    color: "#003D79",
    icon: "🏦",
    isActive: true,
    order: 0,
  },
  {
    name: "Bank Jago",
    type: "bank",
    category: "personal",
    owner: "arul",
    ownerUid: "",
    balance: 28773,
    currency: "IDR",
    color: "#FFCC00",
    icon: "🏦",
    isActive: true,
    order: 1,
  },
  {
    name: "Bank Wondr",
    type: "bank",
    category: "personal",
    owner: "arul",
    ownerUid: "",
    balance: 3000,
    currency: "IDR",
    color: "#6C63FF",
    icon: "🏦",
    isActive: true,
    order: 2,
  },
  {
    name: "Saving Account Arul",
    type: "savings",
    category: "personal",
    owner: "arul",
    ownerUid: "",
    balance: 2302049,
    currency: "IDR",
    color: "#0F9B58",
    icon: "💰",
    isActive: true,
    order: 3,
  },
  {
    name: "Bank BRI",
    type: "bank",
    category: "personal",
    owner: "fifi",
    ownerUid: "",
    balance: 8040800,
    currency: "IDR",
    color: "#0066B3",
    icon: "🏦",
    isActive: true,
    order: 4,
  },
  {
    name: "SeaBank",
    type: "e-wallet",
    category: "personal",
    owner: "fifi",
    ownerUid: "",
    balance: 14000,
    currency: "IDR",
    color: "#00AED6",
    icon: "💳",
    isActive: true,
    order: 5,
  },
  {
    name: "Cash Wallet",
    type: "cash",
    category: "personal",
    owner: "fifi",
    ownerUid: "",
    balance: 500000,
    currency: "IDR",
    color: "#4CAF50",
    icon: "💵",
    isActive: true,
    order: 6,
  },
  {
    name: "Saving Account Fifi",
    type: "savings",
    category: "personal",
    owner: "fifi",
    ownerUid: "",
    balance: 0,
    currency: "IDR",
    color: "#E255A1",
    icon: "💰",
    isActive: true,
    order: 7,
  },
  {
    name: "Pacaran Jago",
    type: "bank",
    category: "shared",
    owner: "shared",
    ownerUid: "",
    balance: 335475,
    currency: "IDR",
    color: "#9B59B6",
    icon: "💑",
    isActive: true,
    order: 8,
  },
  {
    name: "Investasi Tanah",
    type: "investment",
    category: "shared",
    owner: "shared",
    ownerUid: "",
    balance: 11400000,
    currency: "IDR",
    color: "#8B4513",
    icon: "🏡",
    isActive: true,
    order: 9,
  },
  {
    name: "Investasi Saham",
    type: "investment",
    category: "shared",
    owner: "shared",
    ownerUid: "",
    balance: 33467069,
    currency: "IDR",
    color: "#2383E2",
    icon: "📈",
    isActive: true,
    order: 10,
  },
];

/**
 * Seed Firestore with initial accounts.
 * @param arulUid - Firebase UID for Arul
 * @param fifiUid - Firebase UID for Fifi (optional, defaults to arulUid for shared)
 */
export async function seedAccounts(
  arulUid: string,
  fifiUid?: string
): Promise<string[]> {
  const ids: string[] = [];

  for (const account of initialAccounts) {
    let ownerUid = arulUid;
    if (account.owner === "fifi" && fifiUid) {
      ownerUid = fifiUid;
    } else if (account.owner === "shared") {
      ownerUid = arulUid; // shared accounts owned by primary user
    }

    const id = await accountsService.create({
      ...account,
      ownerUid,
    });
    ids.push(id);
  }

  return ids;
}

export { initialAccounts };
