/**
 * Mood mapping utilities — pure functions, zero side effects.
 *
 * Lihat Personalization Plan §3.8 / §3.9 dan
 * `src/lib/constants/memeThresholds.ts` untuk angka-angkanya.
 */

import { MoodKey } from "@/lib/constants/memes";
import { BALANCE_THRESHOLDS } from "@/lib/constants/memeThresholds";

/**
 * Total balance → mood tier untuk dashboard hero indicator.
 *
 * Negatif balance (utang > aset) di-treat sebagai `broke` — paling konservatif.
 */
export const getMoodForBalance = (balance: number): MoodKey => {
  if (balance >= BALANCE_THRESHOLDS.rich) return "rich";
  if (balance >= BALANCE_THRESHOLDS.chill) return "chill";
  if (balance >= BALANCE_THRESHOLDS.normal) return "normal";
  if (balance >= BALANCE_THRESHOLDS.warning) return "warning";
  return "broke";
};

/**
 * Net bulanan (income - expense) → mood tier. Dipakai di OwnerOverview hero.
 *
 * Threshold sengaja simple: surplus = bagus, defisit = sedih.
 */
export const getMoodForNet = (income: number, expense: number): MoodKey => {
  const net = income - expense;
  if (net <= 0) return "sad";
  // Net positif tapi tipis (<10% dari income) — masih hati-hati
  if (income > 0 && net < income * 0.1) return "warning";
  if (net >= income * 0.5) return "rich";
  return "chill";
};

/**
 * Stable seed per-hari — meme nggak ganti tiap re-render dalam 1 hari.
 * Dipakai sebagai default `seed` di `<MemeReaction>`.
 */
export const dailySeed = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
};
