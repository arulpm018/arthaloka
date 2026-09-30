import { describe, it, expect } from "vitest";
import { findAccount, planAccountMerge } from "./accountMerge.mjs";

const pacaran = { id: "a-pacaran", name: "Pacaran (Jago)", owner: "shared", balance: 335_475 };
const jago = { id: "a-jago", name: "Bank Jago", owner: "arul", balance: 28_773 };
const bca = { id: "a-bca", name: "BCA", owner: "fifi", balance: 100_000 };

describe("findAccount", () => {
  const accounts = [pacaran, jago, bca];

  it("cocok nama persis (tanpa beda huruf besar/spasi)", () => {
    expect(findAccount(accounts, "  bank jago ").id).toBe("a-jago");
  });
  it("cocok id", () => {
    expect(findAccount(accounts, "a-pacaran").name).toBe("Pacaran (Jago)");
  });
  it("tidak ketemu → error", () => {
    expect(() => findAccount(accounts, "Mandiri")).toThrow(/tidak ditemukan/);
  });
  it("nama dipakai >1 rekening → minta pakai id", () => {
    expect(() => findAccount([...accounts, { ...bca, id: "a-bca-2" }], "BCA")).toThrow(/pakai id/);
  });
});

describe("planAccountMerge", () => {
  const transactions = [
    { id: "t1", accountId: "a-pacaran", owner: "shared" },
    { id: "t2", accountId: "a-jago", owner: "arul" },
    { id: "t3", accountId: "a-bca", owner: "fifi" },
  ];
  const transfers = [
    { id: "tf-out", fromAccountId: "a-pacaran", toAccountId: "a-bca" },
    { id: "tf-in", fromAccountId: "a-bca", toAccountId: "a-pacaran" },
    { id: "tf-internal", fromAccountId: "a-jago", toAccountId: "a-pacaran" },
    { id: "tf-jago", fromAccountId: "a-jago", toAccountId: "a-bca" },
    { id: "tf-lain", fromAccountId: "a-bca", toAccountId: "a-bca-lain" },
  ];

  it("transaksi rekening asal pindah ke tujuan dengan nama & pemilik baru", () => {
    const plan = planAccountMerge({ from: pacaran, to: jago, toOwner: "shared", transactions, transfers });
    expect(plan.transactionUpdates).toContainEqual({
      id: "t1",
      data: { accountId: "a-jago", accountName: "Bank Jago", owner: "shared" },
    });
  });

  it("pemilik tujuan berubah → transaksi lama rekening tujuan ikut diperbarui", () => {
    const plan = planAccountMerge({ from: pacaran, to: jago, toOwner: "shared", transactions, transfers });
    expect(plan.transactionUpdates).toContainEqual({ id: "t2", data: { owner: "shared" } });
    expect(plan.transactionUpdates.map((u) => u.id)).not.toContain("t3");
  });

  it("pemilik tujuan tetap → transaksi lama rekening tujuan tidak disentuh", () => {
    const plan = planAccountMerge({ from: pacaran, to: jago, transactions, transfers });
    expect(plan.transactionUpdates.map((u) => u.id)).toEqual(["t1"]);
    expect(plan.transactionUpdates[0].data.owner).toBe("arul");
  });

  it("transfer diarahkan ulang; transfer antara asal ↔ tujuan dihapus", () => {
    const plan = planAccountMerge({ from: pacaran, to: jago, toOwner: "shared", transactions, transfers });
    expect(plan.transferDeletes).toEqual(["tf-internal"]);
    expect(plan.transferUpdates).toContainEqual({
      id: "tf-out",
      data: { fromAccountId: "a-jago", fromAccountName: "Bank Jago", fromAccountOwner: "shared", owner: "shared" },
    });
    expect(plan.transferUpdates).toContainEqual({
      id: "tf-in",
      data: { toAccountId: "a-jago", toAccountName: "Bank Jago", toAccountOwner: "shared" },
    });
    // transfer dari tujuan ke rekening lain: hanya pemiliknya yang berubah
    expect(plan.transferUpdates).toContainEqual({
      id: "tf-jago",
      data: { fromAccountOwner: "shared", owner: "shared" },
    });
    expect(plan.transferUpdates.map((u) => u.id)).not.toContain("tf-lain");
  });

  it("saldo asal ditambahkan ke tujuan; rekening asal dinonaktifkan", () => {
    const plan = planAccountMerge({ from: pacaran, to: jago, toOwner: "shared", transactions, transfers });
    expect(plan.target).toEqual({
      id: "a-jago",
      balanceIncrement: 335_475,
      data: { owner: "shared", category: "shared" },
    });
    expect(plan.source).toEqual({ id: "a-pacaran", data: { isActive: false, balance: 0 } });
  });

  it("asal = tujuan → error", () => {
    expect(() => planAccountMerge({ from: jago, to: jago, transactions, transfers })).toThrow(/sama/);
  });
});
