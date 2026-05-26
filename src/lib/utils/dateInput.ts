/**
 * Date helpers untuk input "tanggal saja" (tanpa jam) — anniversary, dll.
 *
 * Strategi anti-timezone-bug:
 * - Simpan sebagai UTC noon (12:00 UTC). Ini aman dari shift timezone
 *   apapun antara UTC-12 sampai UTC+12 — tanggal kalendar tetep konsisten.
 * - Baca selalu pakai UTC getters (`getUTCFullYear` dst), bukan local.
 *
 * Bug yang dicegah: kalau simpan local midnight di WIB (UTC+7), valuenya
 * UTC = hari sebelumnya jam 17:00. `toISOString()` ngembalikan tanggal
 * UTC → tampil mundur 1 hari di input.
 */

import { Timestamp } from "firebase/firestore";

/** Build Timestamp dari y/m/d (1-indexed bulan), pinned ke UTC noon. */
export const ymdToTimestamp = (
  year: number,
  month: number,
  day: number
): Timestamp => {
  const ms = Date.UTC(year, month - 1, day, 12, 0, 0, 0);
  return Timestamp.fromMillis(ms);
};

/** Extract YYYY-MM-DD (zero-padded) dari Timestamp pakai UTC getters. */
export const timestampToIsoYmd = (ts: Timestamp | null | undefined): string => {
  if (!ts) return "";
  const d = ts.toDate();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Parse "YYYY-MM-DD" → Timestamp UTC noon. Return null kalau invalid. */
export const parseIsoYmd = (str: string): Timestamp | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mon = Number(m[2]);
  const d = Number(m[3]);
  if (!isValidYmd(y, mon, d)) return null;
  return ymdToTimestamp(y, mon, d);
};

/** Format Timestamp → "DD/MM/YYYY" buat display di text input. */
export const timestampToDisplayYmd = (
  ts: Timestamp | null | undefined
): string => {
  if (!ts) return "";
  const d = ts.toDate();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${day}/${m}/${y}`;
};

/**
 * Parse "DD/MM/YYYY" atau "D/M/YYYY" → Timestamp UTC noon.
 * Return `null` kalau format atau tanggal invalid (mis. 31/02/2024).
 */
export const parseDisplayYmd = (str: string): Timestamp | null => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str.trim());
  if (!m) return null;
  const d = Number(m[1]);
  const mon = Number(m[2]);
  const y = Number(m[3]);
  if (!isValidYmd(y, mon, d)) return null;
  return ymdToTimestamp(y, mon, d);
};

/**
 * Validasi tanggal benar-benar real — nolak tanggal yang nge-overflow
 * (mis. 31 Februari, 30 Februari, 31 April). `Date.UTC` cuma normalize
 * tanpa nge-throw, jadi kita compare ulang ke input asli.
 */
const isValidYmd = (y: number, m: number, d: number): boolean => {
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 1900 || y > 2100) return false;
  const ms = Date.UTC(y, m - 1, d);
  const back = new Date(ms);
  return (
    back.getUTCFullYear() === y &&
    back.getUTCMonth() === m - 1 &&
    back.getUTCDate() === d
  );
};
