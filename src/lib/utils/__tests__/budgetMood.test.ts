import { describe, it, expect } from "vitest";
import { budgetMood } from "@/lib/utils/budgetMood";
import type { MonthBudgetSummary } from "@/lib/utils/budget";

const SEP = new Date(2026, 8, 1); // September: 30 hari

/** Ringkasan budget 1.000.000 dengan `spent` terpakai & `daysLeft` sisa hari. */
const summary = (spent: number, daysLeft: number, totalBudget = 1_000_000): MonthBudgetSummary => ({
  totalBudget,
  totalSpent: spent,
  remaining: totalBudget - spent,
  daysLeft,
  perDay: 0,
  items: [],
});

describe("budgetMood", () => {
  it("belum ada budget → tanpa meme", () => {
    expect(budgetMood(summary(0, 20, 0), SEP)).toBeNull();
  });

  it("lewat budget → boncos", () => {
    expect(budgetMood(summary(1_050_000, 10), SEP)).toBe("boncos");
  });

  it("terpakai ≥ 90% (belum lewat) → mepet", () => {
    expect(budgetMood(summary(900_000, 3), SEP)).toBe("mepet");
  });

  it("belanja lebih cepat dari jalannya bulan (>20 poin) → boros", () => {
    // tanggal 10 (hari ke-10 dari 30 ≈ 33%), terpakai 55%
    expect(budgetMood(summary(550_000, 21), SEP)).toBe("boros");
  });

  it("jauh lebih lambat dari jalannya bulan (>20 poin) → hemat", () => {
    // tanggal 20 (≈ 67%), terpakai 30%
    expect(budgetMood(summary(300_000, 11), SEP)).toBe("hemat");
  });

  it("sejalan dengan waktu → aman", () => {
    // tanggal 15 (50%), terpakai 55%
    expect(budgetMood(summary(550_000, 16), SEP)).toBe("aman");
  });

  it("tepat di batas 20 poin masih aman", () => {
    // tanggal 15 (50%), terpakai 70% → selisih 20
    expect(budgetMood(summary(700_000, 16), SEP)).toBe("aman");
  });
});
