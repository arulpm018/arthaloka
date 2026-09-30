import { describe, it, expect } from "vitest";
import {
  budgetPayload,
  budgetThresholdsReached,
  DAILY_REMINDER_PAYLOAD,
  monthlySummaryPayload,
  partnerTransactionPayload,
} from "@/lib/push/format";
import { formatCurrency } from "@/lib/utils/formatCurrency";

describe("budgetThresholdsReached", () => {
  it.each([
    [79, 100, []],
    [80, 100, [80]],
    [99, 100, [80]],
    [100, 100, [80, 100]],
    [150, 100, [80, 100]],
    [500, 0, []],
  ])("spent %d / budget %d → %j", (spent, budget, expected) => {
    expect(budgetThresholdsReached(spent, budget)).toEqual(expected);
  });
});

describe("partnerTransactionPayload", () => {
  it("satu transaksi", () => {
    const p = partnerTransactionPayload("Fifi", [
      { type: "expense", amount: 50_000, categoryName: "Makan", accountName: "BRI" },
    ]);
    expect(p).toEqual({
      title: `Fifi catat ${formatCurrency(50_000)}`,
      body: "Makan · BRI",
      url: "/transactions",
      tag: "partner-tx",
    });
  });
  it("pemasukan diberi keterangan", () => {
    const p = partnerTransactionPayload("Arul", [
      { type: "income", amount: 1_000_000, categoryName: "Gaji", accountName: "BCA" },
    ]);
    expect(p.body).toBe("Gaji · BCA (pemasukan)");
  });
  it("banyak transaksi → ringkasan", () => {
    const p = partnerTransactionPayload("Arul", [
      { type: "expense", amount: 10_000, categoryName: "Makan", accountName: "BCA" },
      { type: "expense", amount: 15_000, categoryName: "Parkir", accountName: "BCA" },
    ]);
    expect(p.title).toBe("Arul catat 2 transaksi");
    expect(p.body).toBe(`Total ${formatCurrency(25_000)}`);
  });
});

describe("budgetPayload", () => {
  it("80%", () => {
    const p = budgetPayload({ categoryId: "c1", categoryName: "Makan", threshold: 80, spent: 1_600_000, budget: 2_000_000 });
    expect(p.title).toBe("Makan sudah 80% budget");
    expect(p.body).toBe(`${formatCurrency(1_600_000)} dari ${formatCurrency(2_000_000)} bulan ini`);
    expect(p).toMatchObject({ url: "/budget", tag: "budget-c1" });
  });
  it("100%", () => {
    expect(budgetPayload({ categoryId: "c1", categoryName: "Makan", threshold: 100, spent: 1, budget: 1 }).title).toBe(
      "Makan lewat budget"
    );
  });
});

describe("payload terjadwal", () => {
  it("pengingat harian membuka form catat", () => {
    expect(DAILY_REMINDER_PAYLOAD.url).toBe("/dashboard?add=1");
  });
  it("ringkasan bulanan", () => {
    const p = monthlySummaryPayload({ monthLabel: "September 2026", income: 10_000_000, expense: 7_000_000, topCategory: "Makan" });
    expect(p.title).toBe("Rekap September 2026");
    expect(p.body).toBe(`Keluar ${formatCurrency(7_000_000)}, masuk ${formatCurrency(10_000_000)}. Paling boros: Makan.`);
    expect(p.url).toBe("/recap");
  });
  it("ringkasan tanpa kategori", () => {
    expect(monthlySummaryPayload({ monthLabel: "X", income: 0, expense: 0, topCategory: null }).body).not.toContain("boros");
  });
});
