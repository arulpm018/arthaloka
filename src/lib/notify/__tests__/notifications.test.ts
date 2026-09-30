import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  notifyTransactionsCreated,
  runDailyReminder,
  runMonthlySummary,
  type NotifyDeps,
} from "@/lib/notify/notifications";
import type { NotifyCategory, NotifyRepo, NotifyTransaction, NotifyUser } from "@/lib/notify/repo";
import type { PushPayload } from "@/lib/push/format";

const NOW = new Date("2026-09-30T05:00:00Z"); // 30 Sep 2026 12:00 WIB

class FakeRepo implements NotifyRepo {
  users: NotifyUser[] = [
    { uid: "u-arul", role: "arul" },
    { uid: "u-fifi", role: "fifi" },
  ];
  transactions: NotifyTransaction[] = [];
  categories: NotifyCategory[] = [
    { id: "c-makan", name: "Makan", budgetAmount: 1_000_000 },
    { id: "c-lain", name: "Lainnya", budgetAmount: 0 },
  ];
  claimed: string[] = [];
  recorders: string[] = [];

  async listUsers() {
    return this.users;
  }
  async getTransactions(ids: string[]) {
    return this.transactions.filter((t) => ids.includes(t.id));
  }
  async getCategories(ids: string[]) {
    return this.categories.filter((c) => ids.includes(c.id));
  }
  async expenseByCategory(start: Date, end: Date) {
    const out: Record<string, number> = {};
    this.transactions
      .filter((t) => t.type === "expense" && t.date >= start && t.date < end)
      .forEach((t) => {
        out[t.categoryId] = (out[t.categoryId] ?? 0) + t.amount;
      });
    return out;
  }
  async claimOnce(key: string) {
    if (this.claimed.includes(key)) return false;
    this.claimed.push(key);
    return true;
  }
  async recorderUidsSince() {
    return this.recorders;
  }
  async monthTotals() {
    return { income: 9_000_000, expense: 6_000_000, expenseByCategoryName: { Makan: 2_000_000, Transport: 500_000 } };
  }
}

const tx = (id: string, overrides: Partial<NotifyTransaction> = {}): NotifyTransaction => ({
  id,
  type: "expense",
  amount: 50_000,
  categoryId: "c-lain",
  categoryName: "Lainnya",
  accountName: "BCA",
  ownerUid: "u-arul",
  date: NOW,
  ...overrides,
});

let repo: FakeRepo;
let sent: { uids: string[]; payload: PushPayload }[];
let deps: NotifyDeps;

beforeEach(() => {
  repo = new FakeRepo();
  sent = [];
  deps = {
    repo,
    push: vi.fn(async (uids: string[], payload: PushPayload) => {
      sent.push({ uids, payload });
    }),
  };
});

describe("notifyTransactionsCreated — pasangan", () => {
  it("dikirim ke pasangan saja, dengan nama pencatat", async () => {
    repo.transactions = [tx("t1")];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    expect(sent).toHaveLength(1);
    expect(sent[0].uids).toEqual(["u-fifi"]);
    expect(sent[0].payload.title).toMatch(/^Arul catat/);
  });

  it("transaksi milik orang lain diabaikan (anti notif palsu)", async () => {
    repo.transactions = [tx("t1", { ownerUid: "u-fifi" })];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    expect(sent).toHaveLength(0);
  });

  it("id kosong → tidak apa-apa", async () => {
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: [], now: NOW });
    expect(deps.push).not.toHaveBeenCalled();
  });
});

describe("notifyTransactionsCreated — budget", () => {
  it("tembus 80% → notif ke berdua, sekali saja", async () => {
    repo.transactions = [tx("old", { categoryId: "c-makan", amount: 700_000 }), tx("t1", { categoryId: "c-makan", amount: 150_000 })];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    const budgetNotifs = sent.filter((s) => s.payload.url === "/budget");
    expect(budgetNotifs).toHaveLength(1);
    expect(budgetNotifs[0].uids).toEqual(["u-arul", "u-fifi"]);
    expect(budgetNotifs[0].payload.title).toBe("Makan sudah 80% budget");
    expect(repo.claimed).toEqual(["2026-09_c-makan_80"]);

    repo.transactions.push(tx("t2", { categoryId: "c-makan", amount: 10_000 }));
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t2"], now: NOW });
    expect(sent.filter((s) => s.payload.url === "/budget")).toHaveLength(1);
  });

  it("80 & 100 baru sekaligus → hanya notif 100", async () => {
    repo.transactions = [tx("t1", { categoryId: "c-makan", amount: 1_200_000 })];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    const budgetNotifs = sent.filter((s) => s.payload.url === "/budget");
    expect(budgetNotifs).toHaveLength(1);
    expect(budgetNotifs[0].payload.title).toBe("Makan lewat budget");
    expect(repo.claimed).toEqual(["2026-09_c-makan_80", "2026-09_c-makan_100"]);
  });

  it("kategori tanpa limit → tidak ada notif budget", async () => {
    repo.transactions = [tx("t1", { categoryId: "c-lain", amount: 9_000_000 })];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    expect(sent.filter((s) => s.payload.url === "/budget")).toHaveLength(0);
  });

  it("transaksi bertanggal bulan lalu → tidak cek budget bulan ini", async () => {
    repo.transactions = [tx("t1", { categoryId: "c-makan", amount: 5_000_000, date: new Date("2026-08-15T05:00:00Z") })];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    expect(sent.filter((s) => s.payload.url === "/budget")).toHaveLength(0);
  });
});

describe("runDailyReminder", () => {
  it("hanya user yang belum mencatat hari ini", async () => {
    repo.recorders = ["u-arul"];
    const targets = await runDailyReminder(deps, NOW);
    expect(targets).toEqual(["u-fifi"]);
    expect(sent[0]).toMatchObject({ uids: ["u-fifi"], payload: { url: "/dashboard?add=1" } });
  });
  it("semua sudah mencatat → tidak kirim", async () => {
    repo.recorders = ["u-arul", "u-fifi"];
    expect(await runDailyReminder(deps, NOW)).toEqual([]);
    expect(deps.push).not.toHaveBeenCalled();
  });
});

describe("runMonthlySummary", () => {
  it("rekap bulan lalu ke berdua dengan kategori terboros", async () => {
    await runMonthlySummary(deps, new Date("2026-10-01T01:00:00Z"));
    expect(sent[0].uids).toEqual(["u-arul", "u-fifi"]);
    expect(sent[0].payload.title).toBe("Rekap September 2026");
    expect(sent[0].payload.body).toContain("Paling boros: Makan");
  });
});
