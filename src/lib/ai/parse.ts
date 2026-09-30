import { wibDate, wibIsoDate } from "@/lib/utils/wib";
import type { Owner } from "@/types";

const DAY_MS = 86_400_000;

// Urutan penting: "juta" sebelum "jt", "ribu" sebelum "rb".
const AMOUNT_SUFFIXES: [string, number][] = [
  ["juta", 1_000_000],
  ["jt", 1_000_000],
  ["ribu", 1_000],
  ["rb", 1_000],
  ["k", 1_000],
  ["m", 1_000_000],
];

/**
 * Nominal Rupiah bulat dari angka atau teks bebas model:
 * "25rb", "25k", "22 ribu", "1,5jt", "Rp22.000", "1.500.000", "22,000".
 */
export function normalizeAmount(input: number | string): number {
  let value: number;

  if (typeof input === "number") {
    value = input;
  } else {
    let s = input.toLowerCase().replace(/rp/g, "").trim();
    let multiplier = 1;
    const suffix = AMOUNT_SUFFIXES.find(([suf]) => s.includes(suf));
    if (suffix) {
      s = s.split(suffix[0])[0].trim().replace(",", ".");
      multiplier = suffix[1];
    } else {
      s = s.replace(/\s/g, "");
      if (s.includes(",") && s.includes(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else if (s.includes(",")) {
        const parts = s.split(",");
        s = parts[parts.length - 1].length === 3 ? parts.join("") : s.replace(",", ".");
      } else if (s.includes(".")) {
        const parts = s.split(".");
        if (parts[parts.length - 1].length === 3) s = parts.join("");
      }
    }
    const parsed = s === "" ? NaN : Number(s);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Nominal '${input}' tidak bisa dibaca. Pakai angka Rupiah penuh, mis. 25000.`);
    }
    value = parsed * multiplier;
  }

  const rounded = Math.round(value);
  if (!(rounded > 0)) throw new Error("Nominal harus lebih dari 0.");
  return rounded;
}

/**
 * Tanggal dari model: "YYYY-MM-DD", "YYYY-MM-DD HH:MM" (WIB), "hari ini",
 * "kemarin", "kemarin lusa". Kosong/tak dikenal → `now` (lebih baik tanggal
 * default daripada pencatatan batal).
 */
export function parseDateInput(value: string | undefined | null, now: Date): Date {
  const v = (value ?? "").trim().toLowerCase();
  if (!v || v === "hari ini" || v === "sekarang") return now;
  if (v === "kemarin") return new Date(now.getTime() - DAY_MS);
  if (v === "kemarin lusa") return new Date(now.getTime() - 2 * DAY_MS);

  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ t](\d{2}):(\d{2}))?/.exec(v);
  if (!m) return now;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (m[4]) return wibDate(year, month, day, Number(m[4]), Number(m[5]));
  if (wibIsoDate(now) === `${m[1]}-${m[2]}-${m[3]}`) return now; // hari ini → momen sekarang
  return wibDate(year, month, day, 12); // tanggal lain → tengah hari WIB
}

/**
 * Semua item di tingkat kecocokan terbaik: exact → awalan → mengandung →
 * nama item terkandung di input. Kosong kalau tidak ada yang cocok.
 */
function bestMatches<T extends { name: string }>(items: T[], name: string): T[] {
  const n = name.trim().toLowerCase();
  if (!n) return [];
  const lower = (item: T) => item.name.toLowerCase();
  const tiers: ((item: T) => boolean)[] = [
    (i) => lower(i) === n,
    (i) => lower(i).startsWith(n),
    (i) => lower(i).includes(n),
    (i) => lower(i).length >= 3 && n.includes(lower(i)),
  ];
  for (const tier of tiers) {
    const matches = items.filter(tier);
    if (matches.length > 0) return matches;
  }
  return [];
}

function notFound<T extends { name: string }>(items: T[], name: string, kind: string): Error {
  const list = items.slice(0, 15).map((i) => i.name).join(", ") || "-";
  return new Error(`${kind} '${name}' tidak ditemukan. Yang ada: ${list}`);
}

/** Cocokkan nama: exact → awalan → mengandung → nama item terkandung di input. */
export function pickByName<T extends { name: string }>(items: T[], name: string, kind: string): T {
  const [found] = bestMatches(items, name);
  if (!found) throw notFound(items, name, kind);
  return found;
}

/**
 * Seperti `pickByName`, tapi kalau beberapa rekening sama-sama cocok
 * (mis. "BCA" milik Arul & Fifi), utamakan milik user yang mencatat,
 * lalu rekening bersama — jangan diam-diam memakai rekening pasangan.
 */
export function pickAccountByName<T extends { name: string; owner: Owner }>(
  accounts: T[],
  name: string,
  role: Owner,
  kind = "Rekening"
): T {
  const matches = bestMatches(accounts, name);
  if (matches.length === 0) throw notFound(accounts, name, kind);
  return (
    matches.find((a) => a.owner === role) ??
    matches.find((a) => a.owner === "shared") ??
    matches[0]
  );
}
