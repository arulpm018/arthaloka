/**
 * Kalender WIB (UTC+7, tanpa DST). Server Vercel berjalan di UTC, jadi
 * batas hari/bulan untuk AI, notifikasi, dan cron dihitung lewat helper ini.
 */
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

export const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Komponen kalender WIB dari sebuah instant. `month` 0–11. */
export function wibParts(instant: Date) {
  const shifted = new Date(instant.getTime() + WIB_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** Instant untuk jam dinding WIB tertentu (argumen boleh overflow, mis. month 12). */
export function wibDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month, day, hour, minute) - WIB_OFFSET_MS);
}

/** [start, end) hari WIB yang memuat `instant`. */
export function wibDayRange(instant: Date): { start: Date; end: Date } {
  const { year, month, day } = wibParts(instant);
  const start = wibDate(year, month, day);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** [start, end) bulan WIB. `month` 0–11, boleh overflow. */
export function wibMonthRange(year: number, month: number): { start: Date; end: Date } {
  return { start: wibDate(year, month, 1), end: wibDate(year, month + 1, 1) };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-09" */
export function wibMonthKey(instant: Date): string {
  const { year, month } = wibParts(instant);
  return `${year}-${pad(month + 1)}`;
}

/** "2026-09-30" */
export function wibIsoDate(instant: Date): string {
  const { year, month, day } = wibParts(instant);
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** Bulan sebelum bulan WIB dari `instant`. */
export function wibPreviousMonth(instant: Date): { year: number; month: number } {
  const { year, month } = wibParts(instant);
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}
