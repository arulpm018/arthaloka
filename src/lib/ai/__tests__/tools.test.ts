import { describe, it, expect, beforeEach } from "vitest";
import { executeTool, TOOL_DEFINITIONS } from "@/lib/ai/tools";
import { FakeStore, makeCtx } from "./fakeStore";

let store: FakeStore;
beforeEach(() => {
  store = new FakeStore();
});

const run = (name: string, args: unknown, ctx = makeCtx(store)) =>
  executeTool(name, JSON.stringify(args), ctx).then((result) => ({ result, ctx }));

describe("TOOL_DEFINITIONS", () => {
  it("berisi 8 tool keuangan", () => {
    expect(TOOL_DEFINITIONS.map((t) => t.function.name).sort()).toEqual([
      "add_transactions",
      "add_transfer",
      "create_account",
      "create_category",
      "delete_transaction",
      "get_monthly_summary",
      "list_accounts",
      "list_categories",
    ]);
  });
});

describe("add_transactions", () => {
  it("rekening tidak disebut → tidak menyimpan apa pun, tawarkan pilihan rekening (milik sendiri dulu)", async () => {
    const { result, ctx } = await run("add_transactions", {
      items: [{ type: "expense", amount: 25000, category: "Makan" }],
    });
    expect(result).toMatch(/^Gagal add_transactions: .*rekening belum disebut/);
    expect(store.transactions).toHaveLength(0);
    expect(ctx.choice?.options.map((o) => o.label)).toEqual(["BCA (Arul)", "Jago Bersama (Bersama)", "BRI (Fifi)"]);
    expect(ctx.choice?.options[0].reply).toBe("Pakai rekening BCA (Arul)");
  });

  it("setelah pencatatan berhasil, tombol pilihan rekening dihapus", async () => {
    const ctx = makeCtx(store);
    await executeTool("add_transactions", JSON.stringify({ items: [{ type: "expense", amount: 1000, category: "Makan" }] }), ctx);
    expect(ctx.choice).toBeDefined();
    await executeTool("add_transactions", JSON.stringify({ items: [{ type: "expense", amount: 1000, category: "Makan", account: "BCA (Arul)" }] }), ctx);
    expect(ctx.choice).toBeUndefined();
  });

  it("rekening pakai label pilihan 'Nama (Pemilik)' → tepat rekening itu walau nama kembar", async () => {
    store.accounts.push({ id: "a-fifi-bca", name: "BCA", owner: "fifi", type: "bank", balance: 0, order: 3 });
    await run("add_transactions", {
      items: [{ type: "expense", amount: 1000, category: "Makan", account: "BCA (Fifi)" }],
    });
    expect(store.transactions[0].accountId).toBe("a-fifi-bca");
  });

  it("nama default = kategori, nominal string dinormalisasi", async () => {
    const { result, ctx } = await run("add_transactions", {
      items: [{ type: "expense", amount: "25rb", category: "makan siang", account: "bca" }],
    });
    expect(result).toContain("Tersimpan");
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0]).toMatchObject({
      name: "Makan",
      amount: 25_000,
      accountId: "a-arul",
      categoryId: "c-makan",
      ownerUid: "u-arul",
    });
    expect(ctx.createdTransactionIds).toEqual([store.transactions[0].id]);
    expect(ctx.actions).toHaveLength(1);
    expect(store.accounts[0].balance).toBe(975_000);
  });

  it("rekening disebut & pemasukan", async () => {
    await run("add_transactions", {
      items: [{ type: "income", amount: 5_000_000, category: "Gaji", account: "bri", name: "Gaji September" }],
    });
    expect(store.transactions[0]).toMatchObject({ accountId: "a-fifi", categoryId: "c-gaji", name: "Gaji September" });
  });

  it("nama rekening ambigu antar pemilik → pilih milik user yang mencatat", async () => {
    store.accounts.push({ id: "a-fifi-bca", name: "BCA", owner: "fifi", type: "bank", balance: 0, order: 3 });
    await run(
      "add_transactions",
      { items: [{ type: "expense", amount: 22000, category: "Makan", account: "bca" }] },
      makeCtx(store, { uid: "u-fifi", role: "fifi" })
    );
    expect(store.transactions[0].accountId).toBe("a-fifi-bca");
  });

  it("nama ambigu tanpa milik user → rekening bersama lebih dulu", async () => {
    store.accounts.push({ id: "a-arul-jago", name: "Jago", owner: "arul", type: "bank", balance: 0, order: 3 });
    store.accounts.push({ id: "a-shared-jago", name: "Jago", owner: "shared", type: "bank", balance: 0, order: 4 });
    await run(
      "add_transactions",
      { items: [{ type: "expense", amount: 5000, category: "Makan", account: "jago" }] },
      makeCtx(store, { uid: "u-fifi", role: "fifi" })
    );
    expect(store.transactions[0].accountId).toBe("a-shared-jago");
  });

  it("kategori belum ada → dibuat otomatis", async () => {
    const { ctx } = await run("add_transactions", {
      items: [{ type: "expense", amount: 5000, category: "Parkir", account: "bca" }],
    });
    expect(store.categories.map((c) => c.name)).toContain("Parkir");
    expect(ctx.actions.map((a) => a.tool)).toEqual(["create_category", "add_transactions"]);
  });

  it("satu item invalid → tidak ada yang disimpan", async () => {
    const { result } = await run("add_transactions", {
      items: [
        { type: "expense", amount: 10_000, category: "Makan", account: "bca" },
        { type: "expense", amount: "abc", category: "Makan", account: "bca" },
      ],
    });
    expect(result).toMatch(/^Gagal add_transactions: .*item 2/);
    expect(store.transactions).toHaveLength(0);
  });

  it("banyak item → satu ringkasan total", async () => {
    const { result } = await run("add_transactions", {
      items: [
        { type: "expense", amount: 10_000, category: "Makan", account: "bca" },
        { type: "expense", amount: 15_000, category: "Makan", date: "2026-09-29", account: "bca" },
      ],
    });
    expect(result).toContain("2 transaksi");
    expect(store.transactions).toHaveLength(2);
  });
});

describe("add_transfer", () => {
  it("memindah antar rekening", async () => {
    const { result } = await run("add_transfer", { amount: "500rb", from: "bca", to: "jago bersama" });
    expect(result).toContain("Transfer");
    expect(store.transfers[0]).toMatchObject({ amount: 500_000, name: "Transfer" });
    expect(store.transfers[0].from.id).toBe("a-arul");
    expect(store.transfers[0].to.id).toBe("a-shared");
  });
  it("rekening asal ambigu → milik user yang mencatat", async () => {
    store.accounts.push({ id: "a-fifi-bca", name: "BCA", owner: "fifi", type: "bank", balance: 0, order: 3 });
    await run("add_transfer", { amount: 1000, from: "bca", to: "jago bersama" }, makeCtx(store, { uid: "u-fifi", role: "fifi" }));
    expect(store.transfers[0].from.id).toBe("a-fifi-bca");
  });
  it("rekening asal tidak disebut → tidak transfer, tawarkan pilihan rekening", async () => {
    const { result, ctx } = await run("add_transfer", { amount: 1000, to: "jago bersama" });
    expect(result).toMatch(/^Gagal add_transfer: .*rekening asal belum disebut/);
    expect(store.transfers).toHaveLength(0);
    expect(ctx.choice?.options.length).toBeGreaterThan(0);
  });

  it("asal = tujuan → gagal", async () => {
    const { result } = await run("add_transfer", { amount: 1000, from: "BCA", to: "BCA" });
    expect(result).toMatch(/^Gagal add_transfer/);
  });
});

describe("delete_transaction", () => {
  it("hapus yang cocok nama & nominal", async () => {
    await run("add_transactions", { items: [{ type: "expense", amount: 22_000, category: "Makan", name: "Kopi", account: "bca" }] });
    const { result } = await run("delete_transaction", { name: "kopi", amount: 22000 });
    expect(result).toContain("Dihapus");
    expect(store.transactions).toHaveLength(0);
  });
  it("tanpa kriteria → gagal", async () => {
    const { result } = await run("delete_transaction", {});
    expect(result).toMatch(/^Gagal delete_transaction/);
  });
});

describe("baca data", () => {
  it("list_accounts menyebut pemilik", async () => {
    const { result } = await run("list_accounts", {});
    expect(result).toContain("BCA (Arul)");
    expect(result).toContain("Jago Bersama (Bersama)");
  });
  it("get_monthly_summary bulan berjalan", async () => {
    await run("add_transactions", { items: [{ type: "expense", amount: 50_000, category: "Makan", account: "bca" }] });
    const { result } = await run("get_monthly_summary", {});
    expect(result).toContain("September 2026");
    expect(result).toContain("Makan");
  });
});

describe("create_account & create_category", () => {
  it("create_account", async () => {
    await run("create_account", { name: "Dana", type: "e-wallet", owner: "fifi", balance: "100rb" });
    expect(store.accounts.at(-1)).toMatchObject({ name: "Dana", owner: "fifi", balance: 100_000 });
  });
  it("create_category dengan limit", async () => {
    await run("create_category", { name: "Hiburan", type: "expense", budget: "300rb" });
    expect(store.categories.at(-1)).toMatchObject({ name: "Hiburan", budgetAmount: 300_000 });
  });
});

describe("executeTool robust", () => {
  it("tool tak dikenal", async () => {
    expect(await executeTool("hapus_semua", "{}", makeCtx(store))).toBe("Tool 'hapus_semua' tidak ada.");
  });
  it("argumen bukan JSON", async () => {
    expect(await executeTool("list_accounts", "{oops", makeCtx(store))).toMatch(/^Gagal list_accounts/);
  });
});
