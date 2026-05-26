import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  formatRelativeDate,
  formatDate,
  formatMonthYear,
} from "@/lib/utils/formatDate";

// Validates: Requirements AC12.2
//
// `formatRelativeDate` returns one of (in priority order):
//   1. "Hari ini"      → today
//   2. "Kemarin"       → yesterday
//   3. weekday name    → same calendar week (e.g. "Senin", "Minggu")
//   4. "d MMM"         → same year, but earlier than this week
//   5. "d MMM yyyy"    → previous years
//
// `date-fns` `isThisWeek` defaults to weeks starting on Sunday, so we pin a
// reference "today" of Wednesday 2024-05-15 to make the buckets deterministic.

const REFERENCE_NOW = new Date(2024, 4, 15, 12, 0, 0); // Wed 15 May 2024, 12:00 local

describe("formatRelativeDate", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(REFERENCE_NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("returns 'Hari ini' for today", () => {
    const today = new Date(2024, 4, 15, 9, 0, 0);
    expect(formatRelativeDate(today)).toBe("Hari ini");
  });

  it("returns 'Kemarin' for yesterday", () => {
    const yesterday = new Date(2024, 4, 14, 9, 0, 0);
    expect(formatRelativeDate(yesterday)).toBe("Kemarin");
  });

  it("returns the Indonesian weekday name for a date earlier in the same week", () => {
    // Sun 12 May 2024 is the same calendar week as Wed 15 May 2024
    // (date-fns default weekStartsOn=0/Sunday).
    const threeDaysAgo = new Date(2024, 4, 12, 9, 0, 0);
    expect(formatRelativeDate(threeDaysAgo)).toBe("Minggu");
  });

  it("returns 'd MMM' for a date in the same year but outside this week", () => {
    // 15 Apr 2024 — same year, not this week.
    const oneMonthAgo = new Date(2024, 3, 15, 9, 0, 0);
    expect(formatRelativeDate(oneMonthAgo)).toBe("15 Apr");
  });

  it("returns 'd MMM yyyy' for dates in previous years", () => {
    const lastYear = new Date(2023, 4, 15, 9, 0, 0);
    expect(formatRelativeDate(lastYear)).toBe("15 Mei 2023");
  });
});

// ─── formatDate ──────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("formats a date as 'd MMMM yyyy' in Indonesian", () => {
    expect(formatDate(new Date(2024, 4, 12))).toBe("12 Mei 2024");
  });

  it("renders single-digit day without leading zero", () => {
    expect(formatDate(new Date(2024, 0, 1))).toBe("1 Januari 2024");
  });
});

// ─── formatMonthYear ─────────────────────────────────────────────────────────

describe("formatMonthYear", () => {
  it("formats a date as 'MMMM yyyy' in Indonesian", () => {
    expect(formatMonthYear(new Date(2024, 4, 12))).toBe("Mei 2024");
  });

  it("uses the full Indonesian month name", () => {
    expect(formatMonthYear(new Date(2024, 11, 31))).toBe("Desember 2024");
  });
});
