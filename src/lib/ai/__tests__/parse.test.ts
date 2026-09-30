import { describe, it, expect } from "vitest";
import { normalizeAmount, parseDateInput, pickByName } from "@/lib/ai/parse";

describe("normalizeAmount", () => {
  it.each([
    [25000, 25000],
    [22.4, 22],
    ["25000", 25000],
    ["25rb", 25000],
    ["25k", 25000],
    ["22 ribu", 22000],
    ["1,5jt", 1_500_000],
    ["1.5 juta", 1_500_000],
    ["Rp22.000", 22000],
    ["1.500.000", 1_500_000],
    ["22,000", 22000],
  ])("%s → %d", (input, expected) => {
    expect(normalizeAmount(input)).toBe(expected);
  });

  it.each([["abc"], [""], [0], [-5], ["0rb"]])("%s → error", (input) => {
    expect(() => normalizeAmount(input as number | string)).toThrow();
  });
});

describe("parseDateInput", () => {
  const now = new Date("2026-09-30T05:00:00Z"); // 30 Sep 12:00 WIB

  it("kosong / 'hari ini' → sekarang", () => {
    expect(parseDateInput(undefined, now)).toBe(now);
    expect(parseDateInput("hari ini", now)).toBe(now);
  });
  it("'kemarin' → 24 jam lalu", () => {
    expect(parseDateInput("kemarin", now).toISOString()).toBe("2026-09-29T05:00:00.000Z");
  });
  it("tanggal hari ini (WIB) → sekarang", () => {
    expect(parseDateInput("2026-09-30", now)).toBe(now);
  });
  it("tanggal lain → 12:00 WIB", () => {
    expect(parseDateInput("2026-09-28", now).toISOString()).toBe("2026-09-28T05:00:00.000Z");
  });
  it("tanggal + jam → jam WIB", () => {
    expect(parseDateInput("2026-09-28 19:30", now).toISOString()).toBe("2026-09-28T12:30:00.000Z");
  });
  it("tak dikenal → sekarang", () => {
    expect(parseDateInput("minggu depan kayaknya", now)).toBe(now);
  });
});

describe("pickByName", () => {
  const items = [{ name: "BCA" }, { name: "Bank Jago" }, { name: "Jago Bersama" }];

  it("exact (case-insensitive) diutamakan", () => {
    expect(pickByName(items, "bca", "Rekening").name).toBe("BCA");
  });
  it("awalan", () => {
    expect(pickByName(items, "bank", "Rekening").name).toBe("Bank Jago");
  });
  it("mengandung", () => {
    expect(pickByName(items, "bersama", "Rekening").name).toBe("Jago Bersama");
  });
  it("nama item terkandung di input", () => {
    expect(pickByName(items, "bca punya arul", "Rekening").name).toBe("BCA");
  });
  it("tidak ketemu → error menyebut daftar", () => {
    expect(() => pickByName(items, "mandiri", "Rekening")).toThrow(/Rekening 'mandiri' tidak ditemukan.*BCA/);
  });
  it("nama kosong → error", () => {
    expect(() => pickByName(items, "  ", "Rekening")).toThrow();
  });
});
