import { describe, it, expect } from "vitest";
import {
  wibDayRange,
  wibIsoDate,
  wibMonthKey,
  wibMonthRange,
  wibParts,
  wibPreviousMonth,
} from "@/lib/utils/wib";

describe("wib", () => {
  it("wibParts: 18:30 UTC = 01:30 WIB hari berikutnya", () => {
    expect(wibParts(new Date("2026-09-30T18:30:00Z"))).toEqual({
      year: 2026,
      month: 9,
      day: 1,
      hour: 1,
      minute: 30,
    });
  });

  it("wibDayRange: [00:00 WIB, 00:00 WIB besok)", () => {
    const { start, end } = wibDayRange(new Date("2026-09-30T18:30:00Z"));
    expect(start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-01T17:00:00.000Z");
  });

  it("wibMonthRange: September 2026 & overflow Desember", () => {
    const sep = wibMonthRange(2026, 8);
    expect(sep.start.toISOString()).toBe("2026-08-31T17:00:00.000Z");
    expect(sep.end.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(wibMonthRange(2026, 11).end.toISOString()).toBe("2026-12-31T17:00:00.000Z");
  });

  it("wibMonthKey & wibIsoDate memakai kalender WIB", () => {
    const instant = new Date("2026-09-30T17:00:00Z"); // 1 Okt 00:00 WIB
    expect(wibMonthKey(instant)).toBe("2026-10");
    expect(wibIsoDate(instant)).toBe("2026-10-01");
  });

  it("wibPreviousMonth melewati tahun", () => {
    expect(wibPreviousMonth(new Date("2027-01-05T03:00:00Z"))).toEqual({ year: 2026, month: 11 });
    expect(wibPreviousMonth(new Date("2026-10-01T03:00:00Z"))).toEqual({ year: 2026, month: 8 });
  });
});
