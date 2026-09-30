import { describe, it, expect } from "vitest";
import {
  budgetLevel,
  daysLeftInMonth,
  summarizeMonthBudget,
} from "@/lib/utils/budget";
import type { Category } from "@/types";

type Cat = Pick<Category, "categoryId" | "name" | "icon" | "type" | "budgetAmount">;
const cat = (categoryId: string, type: Cat["type"], budgetAmount: number): Cat => ({
  categoryId,
  name: categoryId,
  icon: "package",
  type,
  budgetAmount,
});

describe("budgetLevel", () => {
  it("tanpa limit selalu normal", () => {
    expect(budgetLevel(999, 0)).toBe("normal");
  });
  it("di bawah 80% normal", () => {
    expect(budgetLevel(79, 100)).toBe("normal");
  });
  it("80% sampai <100% warning", () => {
    expect(budgetLevel(80, 100)).toBe("warning");
    expect(budgetLevel(99.9, 100)).toBe("warning");
  });
  it("100% ke atas over", () => {
    expect(budgetLevel(100, 100)).toBe("over");
    expect(budgetLevel(250, 100)).toBe("over");
  });
});

describe("daysLeftInMonth", () => {
  const sep = new Date(2026, 8, 1);
  it("bulan berjalan: termasuk hari ini", () => {
    expect(daysLeftInMonth(sep, new Date(2026, 8, 30))).toBe(1);
    expect(daysLeftInMonth(sep, new Date(2026, 8, 1))).toBe(30);
  });
  it("bulan lampau: 0", () => {
    expect(daysLeftInMonth(sep, new Date(2026, 9, 5))).toBe(0);
    expect(daysLeftInMonth(sep, new Date(2027, 0, 1))).toBe(0);
  });
  it("bulan depan: jumlah hari penuh", () => {
    expect(daysLeftInMonth(new Date(2026, 9, 1), new Date(2026, 8, 30))).toBe(31);
  });
});

describe("summarizeMonthBudget", () => {
  const categories = [
    cat("makan", "expense", 2_000_000),
    cat("transport", "expense", 500_000),
    cat("hiburan", "expense", 0),
    cat("gaji", "income", 0),
    cat("lainnya", "both", 100_000),
  ];
  const spending = { makan: 1_700_000, transport: 600_000, hiburan: 300_000 };

  it("hanya kategori non-income yang punya limit", () => {
    const s = summarizeMonthBudget(categories, spending, new Date(2026, 8, 1), new Date(2026, 8, 21));
    expect(s.items.map((i) => i.categoryId)).toEqual(["makan", "transport", "lainnya"]);
  });

  it("total, sisa, dan jatah per hari", () => {
    const s = summarizeMonthBudget(categories, spending, new Date(2026, 8, 1), new Date(2026, 8, 21));
    expect(s.totalBudget).toBe(2_600_000);
    expect(s.totalSpent).toBe(2_300_000);
    expect(s.remaining).toBe(300_000);
    expect(s.daysLeft).toBe(10);
    expect(s.perDay).toBe(30_000);
  });

  it("status & persen per kategori", () => {
    const s = summarizeMonthBudget(categories, spending, new Date(2026, 8, 1), new Date(2026, 8, 21));
    const byId = Object.fromEntries(s.items.map((i) => [i.categoryId, i]));
    expect(byId.makan).toMatchObject({ spent: 1_700_000, percentage: 85, status: "warning" });
    expect(byId.transport).toMatchObject({ percentage: 120, status: "over" });
    expect(byId.lainnya).toMatchObject({ spent: 0, percentage: 0, status: "normal" });
  });

  it("sisa negatif → jatah per hari 0", () => {
    const s = summarizeMonthBudget(
      [cat("makan", "expense", 100_000)],
      { makan: 150_000 },
      new Date(2026, 8, 1),
      new Date(2026, 8, 10)
    );
    expect(s.remaining).toBe(-50_000);
    expect(s.perDay).toBe(0);
  });

  it("bulan lampau → jatah per hari 0", () => {
    const s = summarizeMonthBudget(categories, {}, new Date(2026, 7, 1), new Date(2026, 8, 21));
    expect(s.daysLeft).toBe(0);
    expect(s.perDay).toBe(0);
  });
});
