import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/utils/formatCurrency";

// `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })`
// inserts a U+00A0 NO-BREAK SPACE between the currency symbol and the digits,
// not a regular ASCII space. We pin that exact character here so the tests
// remain meaningful regardless of how the assertion is rendered in editors.
const NBSP = "\u00A0";

// Validates: Requirements AC12.1
//
// Edge cases enumerated in task 9.3:
//   - 0           → "Rp 0"
//   - 1000        → "Rp 1.000"
//   - 1234567     → "Rp 1.234.567"
//   - -500        → "-Rp 500"  (test current Intl behaviour)
//   - very large  → "Rp 999.999.999.999"

describe("formatCurrency", () => {
  it("formats zero as 'Rp 0'", () => {
    expect(formatCurrency(0)).toBe(`Rp${NBSP}0`);
  });

  it("formats 1000 with a single dot separator", () => {
    expect(formatCurrency(1000)).toBe(`Rp${NBSP}1.000`);
  });

  it("formats 1234567 with two dot separators", () => {
    expect(formatCurrency(1234567)).toBe(`Rp${NBSP}1.234.567`);
  });

  it("formats negative numbers with the minus before the currency symbol", () => {
    // Locale id-ID renders negatives as "-Rp 500" (minus, then symbol)
    expect(formatCurrency(-500)).toBe(`-Rp${NBSP}500`);
  });

  it("formats very large numbers (12 digits) without losing precision", () => {
    expect(formatCurrency(999999999999)).toBe(`Rp${NBSP}999.999.999.999`);
  });
});
