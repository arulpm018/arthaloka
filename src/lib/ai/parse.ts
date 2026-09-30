import { wibDate, wibIsoDate } from "@/lib/utils/wib";

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

/** Cocokkan nama: exact → awalan → mengandung → nama item terkandung di input. */
export function pickByName<T extends { name: string }>(items: T[], name: string, kind: string): T {
  const n = name.trim().toLowerCase();
  const lower = (item: T) => item.name.toLowerCase();
  const found = n
    ? items.find((i) => lower(i) === n) ??
      items.find((i) => lower(i).startsWith(n)) ??
      items.find((i) => lower(i).includes(n)) ??
      items.find((i) => lower(i).length >= 3 && n.includes(lower(i)))
    : undefined;
  if (!found) {
    const list = items.slice(0, 15).map((i) => i.name).join(", ") || "-";
    throw new Error(`${kind} '${name}' tidak ditemukan. Yang ada: ${list}`);
  }
  return found;
}
