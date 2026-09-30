import { OWNER_LABELS } from "@/lib/constants/labels";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { MONTH_NAMES_ID, wibMonthRange, wibParts } from "@/lib/utils/wib";
import type { AccountType, CategoryType, Owner, TransactionType } from "@/types";
import type { FinanceStore, NewTransaction, StoreAccount, StoreCategory } from "./financeStore";
import { normalizeAmount, parseDateInput, pickByName } from "./parse";
import type { AiAction } from "./types";

export interface ToolContext {
  store: FinanceStore;
  uid: string;
  /** Role user login — menentukan rekening default. */
  role: Owner;
  now: Date;
  /** Diisi tool: ringkasan aksi untuk ditampilkan di chat. */
  actions: AiAction[];
  /** Diisi tool: id transaksi baru (untuk notifikasi). */
  createdTransactionIds: string[];
}

const DAY_MS = 86_400_000;
const ACCOUNT_TYPES: AccountType[] = ["bank", "cash", "e-wallet", "savings", "investment"];
const OWNERS: Owner[] = ["arul", "fifi", "shared"];
const CATEGORY_TYPES: CategoryType[] = ["expense", "income", "both"];

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) => ({
  type: "function" as const,
  function: { name, description, parameters: { type: "object", properties, required } },
});

const AMOUNT = { type: "number", description: "Rupiah penuh, mis. 25000" };
const DATE = { type: "string", description: "YYYY-MM-DD atau 'YYYY-MM-DD HH:MM' (WIB). Kosong = sekarang." };

export const TOOL_DEFINITIONS = [
  fn("list_accounts", "Daftar rekening aktif beserta pemilik & saldo.", {}),
  fn("list_categories", "Daftar kategori beserta tipe & limit budget bulanan.", {
    type: { type: "string", enum: ["expense", "income"], description: "Filter tipe (opsional)" },
  }),
  fn("get_monthly_summary", "Ringkasan pemasukan/pengeluaran satu bulan + pengeluaran per kategori.", {
    month: { type: "string", description: "Format YYYY-MM. Kosong = bulan ini." },
  }),
  fn(
    "add_transactions",
    "Catat satu atau beberapa transaksi pengeluaran/pemasukan sekaligus.",
    {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["expense", "income"] },
            amount: AMOUNT,
            category: { type: "string", description: "Nama kategori; dibuat otomatis kalau belum ada" },
            account: { type: "string", description: "Nama rekening; kosong = rekening default user" },
            name: { type: "string", description: "Keterangan singkat (opsional)" },
            date: DATE,
          },
          required: ["type", "amount", "category"],
        },
      },
    },
    ["items"]
  ),
  fn(
    "add_transfer",
    "Pindah uang antar rekening.",
    {
      amount: AMOUNT,
      from: { type: "string", description: "Nama rekening asal" },
      to: { type: "string", description: "Nama rekening tujuan" },
      name: { type: "string", description: "Keterangan (opsional)" },
      date: DATE,
    },
    ["amount", "from", "to"]
  ),
  fn("delete_transaction", "Hapus transaksi terbaru (60 hari terakhir) yang cocok dengan nama dan/atau nominal.", {
    name: { type: "string", description: "Sebagian nama/kategori transaksi" },
    amount: AMOUNT,
  }),
  fn(
    "create_account",
    "Buat rekening baru.",
    {
      name: { type: "string" },
      type: { type: "string", enum: ACCOUNT_TYPES },
      owner: { type: "string", enum: OWNERS, description: "Pemilik rekening: arul, fifi, atau shared (bersama)" },
      balance: { type: "number", description: "Saldo awal (opsional)" },
    },
    ["name", "type", "owner"]
  ),
  fn(
    "create_category",
    "Buat kategori baru.",
    {
      name: { type: "string" },
      type: { type: "string", enum: CATEGORY_TYPES },
      budget: { type: "number", description: "Limit pengeluaran per bulan (opsional)" },
    },
    ["name", "type"]
  ),
];

type Args = Record<string, unknown>;
type Handler = (args: Args, ctx: ToolContext) => Promise<string>;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isBlankAmount = (v: unknown) => v === undefined || v === null || v === "" || v === 0;
const matchesType = (c: StoreCategory, type: TransactionType) => c.type === type || c.type === "both";

function defaultAccount(accounts: StoreAccount[], role: Owner): StoreAccount {
  const account = accounts.find((a) => a.owner === role) ?? accounts[0];
  if (!account) throw new Error("belum ada rekening. Buat rekening dulu.");
  return account;
}

function findCategory(categories: StoreCategory[], name: string, type: TransactionType): StoreCategory | undefined {
  try {
    return pickByName(categories.filter((c) => matchesType(c, type)), name, "Kategori");
  } catch {
    return undefined;
  }
}

const list_accounts: Handler = async (_args, ctx) => {
  const accounts = await ctx.store.listAccounts();
  if (accounts.length === 0) return "Belum ada rekening.";
  return accounts.map((a) => `- ${a.name} (${OWNER_LABELS[a.owner]}): ${formatCurrency(a.balance)}`).join("\n");
};

const list_categories: Handler = async (args, ctx) => {
  const type = str(args.type);
  const categories = (await ctx.store.listCategories()).filter(
    (c) => !type || matchesType(c, type as TransactionType)
  );
  if (categories.length === 0) return "Belum ada kategori.";
  return categories
    .map((c) => `- ${c.name} [${c.type}]${c.budgetAmount > 0 ? ` limit ${formatCurrency(c.budgetAmount)}/bulan` : ""}`)
    .join("\n");
};

const get_monthly_summary: Handler = async (args, ctx) => {
  const m = /^(\d{4})-(\d{2})$/.exec(str(args.month));
  const { year, month } = m ? { year: Number(m[1]), month: Number(m[2]) - 1 } : wibParts(ctx.now);
  const { start, end } = wibMonthRange(year, month);
  const transactions = await ctx.store.listTransactions(start, end);

  let income = 0;
  let expense = 0;
  const byCategory: Record<string, number> = {};
  transactions.forEach((t) => {
    if (t.type === "income") {
      income += t.amount;
    } else {
      expense += t.amount;
      byCategory[t.categoryName] = (byCategory[t.categoryName] ?? 0) + t.amount;
    }
  });

  const lines = [
    `${MONTH_NAMES_ID[month]} ${year}: masuk ${formatCurrency(income)}, keluar ${formatCurrency(expense)}, selisih ${formatCurrency(income - expense)} (${transactions.length} transaksi).`,
  ];
  const top = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (top.length > 0) {
    lines.push("Pengeluaran per kategori:", ...top.map(([name, total]) => `- ${name}: ${formatCurrency(total)}`));
  }
  return lines.join("\n");
};

const add_transactions: Handler = async (args, ctx) => {
  const rawItems = Array.isArray(args.items) ? (args.items as Args[]) : [];
  if (rawItems.length === 0) throw new Error("items kosong.");
  if (rawItems.length > 50) throw new Error("maksimal 50 transaksi sekali catat.");

  const [accounts, categories] = await Promise.all([ctx.store.listAccounts(), ctx.store.listCategories()]);

  // Validasi semua dulu — kalau ada yang salah, tidak ada yang disimpan.
  const problems: string[] = [];
  const pending: { type: TransactionType; amount: number; account: StoreAccount; categoryName: string; name: string; date: Date }[] = [];
  rawItems.forEach((raw, index) => {
    try {
      const type = raw.type === "income" || raw.type === "expense" ? (raw.type as TransactionType) : null;
      if (!type) throw new Error("type harus 'expense' atau 'income'");
      const amount = normalizeAmount(raw.amount as number | string);
      const accountName = str(raw.account);
      const account = accountName ? pickByName(accounts, accountName, "Rekening") : defaultAccount(accounts, ctx.role);
      const categoryName = str(raw.category);
      if (!categoryName) throw new Error("kategori wajib diisi");
      pending.push({ type, amount, account, categoryName, name: str(raw.name), date: parseDateInput(str(raw.date), ctx.now) });
    } catch (e) {
      problems.push(`item ${index + 1}: ${(e as Error).message}`);
    }
  });
  if (problems.length > 0) throw new Error(`tidak ada yang disimpan. ${problems.join("; ")}`);

  const known = categories.slice();
  const items: NewTransaction[] = [];
  for (const p of pending) {
    let category = findCategory(known, p.categoryName, p.type);
    if (!category) {
      category = await ctx.store.createCategory({ name: p.categoryName, type: p.type, budgetAmount: 0 }, ctx.uid);
      known.push(category);
      ctx.actions.push({ tool: "create_category", label: `Kategori baru: ${category.name}`, detail: "" });
    }
    items.push({ type: p.type, amount: p.amount, account: p.account, category, name: p.name || category.name, date: p.date });
  }

  const ids = await ctx.store.addTransactions(items, ctx.uid);
  ctx.createdTransactionIds.push(...ids);
  items.forEach((it) =>
    ctx.actions.push({
      tool: "add_transactions",
      label: `${it.type === "income" ? "Pemasukan" : "Pengeluaran"} ${formatCurrency(it.amount)} · ${it.category.name}`,
      detail: `${it.name} · ${it.account.name}`,
    })
  );

  if (items.length === 1) {
    const [it] = items;
    return `Tersimpan: ${it.name} ${formatCurrency(it.amount)} di ${it.account.name} (kategori ${it.category.name}).`;
  }
  const total = items.reduce((sum, it) => sum + it.amount, 0);
  return `Tersimpan ${items.length} transaksi, total ${formatCurrency(total)}.`;
};

const add_transfer: Handler = async (args, ctx) => {
  const accounts = await ctx.store.listAccounts();
  const amount = normalizeAmount(args.amount as number | string);
  const from = pickByName(accounts, str(args.from), "Rekening asal");
  const to = pickByName(accounts, str(args.to), "Rekening tujuan");
  if (from.id === to.id) throw new Error("rekening asal dan tujuan sama.");
  const name = str(args.name) || "Transfer";
  await ctx.store.addTransfer({ name, amount, from, to, date: parseDateInput(str(args.date), ctx.now) }, ctx.uid);
  ctx.actions.push({ tool: "add_transfer", label: `Transfer ${formatCurrency(amount)}`, detail: `${from.name} → ${to.name}` });
  return `Transfer ${formatCurrency(amount)} dari ${from.name} ke ${to.name} tersimpan.`;
};

const delete_transaction: Handler = async (args, ctx) => {
  const name = str(args.name).toLowerCase();
  const amount = isBlankAmount(args.amount) ? null : normalizeAmount(args.amount as number | string);
  if (!name && amount === null) throw new Error("sebutkan nama atau nominal transaksi yang mau dihapus.");

  const transactions = await ctx.store.listTransactions(
    new Date(ctx.now.getTime() - 60 * DAY_MS),
    new Date(ctx.now.getTime() + DAY_MS)
  );
  const target = transactions.find(
    (t) =>
      (!name || t.name.toLowerCase().includes(name) || t.categoryName.toLowerCase().includes(name)) &&
      (amount === null || t.amount === amount)
  );
  if (!target) throw new Error("transaksi yang cocok tidak ditemukan (60 hari terakhir).");

  await ctx.store.deleteTransaction(target);
  ctx.actions.push({
    tool: "delete_transaction",
    label: `Dihapus: ${target.name} ${formatCurrency(target.amount)}`,
    detail: target.accountName,
  });
  return `Dihapus: ${target.name} ${formatCurrency(target.amount)} (${target.accountName}).`;
};

const create_account: Handler = async (args, ctx) => {
  const name = str(args.name);
  if (!name) throw new Error("nama rekening wajib diisi.");
  const type = ACCOUNT_TYPES.includes(args.type as AccountType) ? (args.type as AccountType) : "bank";
  const owner = OWNERS.includes(args.owner as Owner) ? (args.owner as Owner) : ctx.role;
  const balance = isBlankAmount(args.balance) ? 0 : normalizeAmount(args.balance as number | string);
  const account = await ctx.store.createAccount({ name, type, owner, balance }, ctx.uid);
  ctx.actions.push({
    tool: "create_account",
    label: `Rekening baru: ${account.name}`,
    detail: `${OWNER_LABELS[owner]} · ${formatCurrency(balance)}`,
  });
  return `Rekening ${account.name} (${OWNER_LABELS[owner]}) dibuat dengan saldo ${formatCurrency(balance)}.`;
};

const create_category: Handler = async (args, ctx) => {
  const name = str(args.name);
  if (!name) throw new Error("nama kategori wajib diisi.");
  const type = CATEGORY_TYPES.includes(args.type as CategoryType) ? (args.type as CategoryType) : "expense";
  const budgetAmount = isBlankAmount(args.budget) ? 0 : normalizeAmount(args.budget as number | string);
  const existing = (await ctx.store.listCategories()).find(
    (c) => c.name.toLowerCase() === name.toLowerCase() && c.type === type
  );
  if (existing) return `Kategori ${existing.name} sudah ada.`;
  const category = await ctx.store.createCategory({ name, type, budgetAmount }, ctx.uid);
  const limit = budgetAmount > 0 ? ` dengan limit ${formatCurrency(budgetAmount)}/bulan` : "";
  ctx.actions.push({ tool: "create_category", label: `Kategori baru: ${category.name}`, detail: limit.trim() });
  return `Kategori ${category.name} dibuat${limit}.`;
};

const HANDLERS: Record<string, Handler> = {
  list_accounts,
  list_categories,
  get_monthly_summary,
  add_transactions,
  add_transfer,
  delete_transaction,
  create_account,
  create_category,
};

/** Jalankan tool dari model. Tidak pernah throw — error dikembalikan sebagai teks "Gagal …". */
export async function executeTool(name: string, rawArgs: string, ctx: ToolContext): Promise<string> {
  const handler = HANDLERS[name];
  if (!handler) return `Tool '${name}' tidak ada.`;
  let args: Args;
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Args) : {};
  } catch {
    return `Gagal ${name}: argumen bukan JSON valid.`;
  }
  try {
    return await handler(args, ctx);
  } catch (e) {
    return `Gagal ${name}: ${e instanceof Error ? e.message : String(e)}`;
  }
}
