import { describe, it, expect } from "vitest";
import {
  noteFromName,
  pickVisibleCategories,
  resolveDefaultAccountId,
  resolveTransactionName,
  sortCategoriesByUsage,
} from "@/lib/utils/entryDefaults";

const c = (categoryId: string, order: number) => ({ categoryId, order });

describe("sortCategoriesByUsage", () => {
  it("paling sering dipakai dulu, seri → order", () => {
    const sorted = sortCategoriesByUsage(
      [c("a", 0), c("b", 1), c("c", 2), c("d", 3)],
      { c: 5, b: 5, d: 1 }
    );
    expect(sorted.map((x) => x.categoryId)).toEqual(["b", "c", "d", "a"]);
  });
  it("tidak mengubah array asli", () => {
    const input = [c("a", 1), c("b", 0)];
    sortCategoriesByUsage(input, {});
    expect(input.map((x) => x.categoryId)).toEqual(["a", "b"]);
  });
});

describe("pickVisibleCategories", () => {
  const sorted = ["a", "b", "c", "d", "e"].map((id, i) => c(id, i));
  it("potong sesuai limit", () => {
    expect(pickVisibleCategories(sorted, null, false, 3).map((x) => x.categoryId)).toEqual(["a", "b", "c"]);
  });
  it("showAll → semua", () => {
    expect(pickVisibleCategories(sorted, null, true, 3)).toHaveLength(5);
  });
  it("kategori terpilih di luar limit tetap terlihat (ganti slot terakhir)", () => {
    expect(pickVisibleCategories(sorted, "e", false, 3).map((x) => x.categoryId)).toEqual(["a", "b", "e"]);
  });
  it("kategori terpilih di dalam limit → tidak berubah", () => {
    expect(pickVisibleCategories(sorted, "b", false, 3).map((x) => x.categoryId)).toEqual(["a", "b", "c"]);
  });
});

describe("resolveDefaultAccountId", () => {
  const accounts = [
    { accountId: "bersama-1", owner: "shared" as const },
    { accountId: "fifi-1", owner: "fifi" as const },
    { accountId: "arul-1", owner: "arul" as const },
  ];
  it("pakai rekening terakhir kalau masih ada", () => {
    expect(resolveDefaultAccountId(accounts, "fifi-1", "arul")).toBe("fifi-1");
  });
  it("rekening terakhir sudah hilang → rekening pertama milik user", () => {
    expect(resolveDefaultAccountId(accounts, "hilang", "arul")).toBe("arul-1");
  });
  it("tanpa rekening milik user → rekening pertama", () => {
    expect(resolveDefaultAccountId(accounts.slice(0, 1), null, "arul")).toBe("bersama-1");
  });
  it("tanpa rekening sama sekali → null", () => {
    expect(resolveDefaultAccountId([], "x", "arul")).toBeNull();
  });
});

describe("resolveTransactionName", () => {
  it("catatan diisi → dipakai (trim)", () => {
    expect(resolveTransactionName("  Bakso  ", "Makan")).toBe("Bakso");
  });
  it("catatan kosong → nama kategori", () => {
    expect(resolveTransactionName("   ", "Makan")).toBe("Makan");
  });
});

describe("noteFromName (isi field catatan saat edit)", () => {
  it("nama = nama kategori (catatan kosong waktu dicatat) → catatan kosong, supaya ganti kategori ikut ganti nama", () => {
    expect(noteFromName("Makan", "Makan")).toBe("");
  });
  it("nama custom → tetap jadi catatan", () => {
    expect(noteFromName("Bakso Pak Kumis", "Makan")).toBe("Bakso Pak Kumis");
  });
});
