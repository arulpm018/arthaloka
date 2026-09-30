import type {
  FinanceStore,
  NewTransaction,
  NewTransfer,
  StoreAccount,
  StoreCategory,
  StoreTransaction,
} from "@/lib/ai/financeStore";
import type { ToolContext } from "@/lib/ai/tools";

export class FakeStore implements FinanceStore {
  seq = 0;
  accounts: StoreAccount[] = [
    { id: "a-arul", name: "BCA", owner: "arul", type: "bank", balance: 1_000_000, order: 0 },
    { id: "a-fifi", name: "BRI", owner: "fifi", type: "bank", balance: 500_000, order: 1 },
    { id: "a-shared", name: "Jago Bersama", owner: "shared", type: "bank", balance: 0, order: 2 },
  ];
  categories: StoreCategory[] = [
    { id: "c-makan", name: "Makan", icon: "utensils", type: "expense", budgetAmount: 2_000_000, order: 0 },
    { id: "c-gaji", name: "Gaji", icon: "briefcase", type: "income", budgetAmount: 0, order: 1 },
  ];
  transactions: (StoreTransaction & { ownerUid: string })[] = [];
  transfers: NewTransfer[] = [];

  async listAccounts() {
    return this.accounts;
  }
  async listCategories() {
    return this.categories;
  }
  async listTransactions(start: Date, end: Date) {
    return this.transactions
      .filter((t) => t.date >= start && t.date < end)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
  async createCategory(input: { name: string; type: StoreCategory["type"]; budgetAmount: number }) {
    const category = { id: `c-${++this.seq}`, icon: "package", order: 99, ...input };
    this.categories.push(category);
    return category;
  }
  async createAccount(input: { name: string; type: StoreAccount["type"]; owner: StoreAccount["owner"]; balance: number }) {
    const account = { id: `a-${++this.seq}`, order: 99, ...input };
    this.accounts.push(account);
    return account;
  }
  async addTransactions(items: NewTransaction[], uid: string) {
    return items.map((item) => {
      const id = `t-${++this.seq}`;
      this.transactions.push({
        id,
        type: item.type,
        name: item.name,
        amount: item.amount,
        accountId: item.account.id,
        accountName: item.account.name,
        categoryId: item.category.id,
        categoryName: item.category.name,
        date: item.date,
        ownerUid: uid,
      });
      item.account.balance += item.type === "income" ? item.amount : -item.amount;
      return id;
    });
  }
  async addTransfer(input: NewTransfer) {
    this.transfers.push(input);
    return `tf-${++this.seq}`;
  }
  async deleteTransaction(tx: StoreTransaction) {
    this.transactions = this.transactions.filter((t) => t.id !== tx.id);
  }
}

export const NOW = new Date("2026-09-30T05:00:00Z"); // 30 Sep 2026 12:00 WIB

export function makeCtx(store: FakeStore, overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    store,
    uid: "u-arul",
    role: "arul",
    now: NOW,
    actions: [],
    createdTransactionIds: [],
    ...overrides,
  };
}
