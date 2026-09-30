import { describe, it, expect } from "vitest";
import { duplicateKey, planCategoryMerges } from "./categoryMerge.mjs";

const cat = (id, name, type, order, budgetAmount = 0) => ({ id, name, type, order, budgetAmount, icon: "package" });

describe("duplicateKey", () => {
  it("abaikan huruf besar/kecil & spasi berlebih", () => {
    expect(duplicateKey(cat("1", "  Food   &  Drink ", "expense", 0))).toBe("food & drink|expense");
  });
  it("tipe beda → kunci beda", () => {
    expect(duplicateKey(cat("1", "Lainnya", "expense", 0))).not.toBe(duplicateKey(cat("2", "Lainnya", "income", 0)));
  });
});

describe("planCategoryMerges", () => {
  it("pertahankan yang paling banyak transaksi, limit = maksimum grup", () => {
    const plans = planCategoryMerges(
      [cat("a", "Makan", "expense", 0, 1_000_000), cat("b", "makan", "expense", 5, 2_000_000), cat("c", "Transport", "expense", 1)],
      { a: 3, b: 10 }
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].keep.id).toBe("b");
    expect(plans[0].remove.map((r) => r.id)).toEqual(["a"]);
    expect(plans[0].budgetAmount).toBe(2_000_000);
  });
  it("jumlah transaksi seri → order terkecil", () => {
    const plans = planCategoryMerges([cat("x", "Hiburan", "expense", 9), cat("y", "Hiburan", "expense", 2)], {});
    expect(plans[0].keep.id).toBe("y");
  });
  it("tanpa duplikat → kosong", () => {
    expect(planCategoryMerges([cat("a", "A", "expense", 0), cat("b", "B", "expense", 1)], {})).toEqual([]);
  });
});
