/**
 * Meme & mood configuration — Personalization Plan §2.4 / §4.
 *
 * Strategi:
 * - Default ship dengan array kosong → app jalan tanpa GIF, fallback ke
 *   `MOOD_EMOJI` (emoji unicode). Zero broken-image risk.
 * - User isi `MEMES_BY_MOOD` dengan Tenor direct URL (`.gif` / `.mp4`) untuk
 *   ngidupin reaksi. MP4 preferred — lebih ringan ~10x dibanding GIF.
 *
 * Catatan a11y: setiap aset wajib punya `alt` deskriptif (bukan emoji).
 */

export type MoodKey =
  // Net worth / total balance
  | "rich" //      🤑 > 100M IDR
  | "chill" //     😎 50–100M
  | "normal" //    🙂 10–50M
  | "warning" //   😅 1–10M
  | "broke" //     🥺 < 1M
  // Budget alert severity
  | "thinking" //  🤔 1 kategori warning
  | "stress" //    😬 2+ kategori warning
  | "panic" //     🔥 ada kategori over budget
  // Special states
  | "celebrate" // 🎉 wishlist tercapai / milestone
  | "sad" //       😔 net negatif bulan ini
  | "romance" //   💕 couple / together section
  | "empty"; //    🫥 zero-state generic

export interface MemeAsset {
  /** `tenor-direct` = URL media langsung; `local` = file di public/; `tenor-embed` = pakai TenorEmbed component (one-shot only). */
  type: "tenor-direct" | "tenor-embed" | "local";
  /** Media URL atau path lokal. */
  src: string;
  /** WAJIB — deskripsi screen reader, bukan repeat dari emoji. */
  alt: string;
  /** Untuk `tenor-embed` only. */
  postId?: string;
  /** Hint render — `mp4` pakai `<video>`, `gif` pakai `<img>`. */
  format?: "gif" | "mp4";
  width?: number;
  height?: number;
}

/**
 * Daftar aset per mood. Kosong = fallback ke `MOOD_EMOJI`.
 *
 * Cara nambah: buka Tenor → Share → Copy MP4 URL (atau GIF URL) → paste:
 *
 * ```ts
 * broke: [{
 *   type: "tenor-direct",
 *   src: "https://media.tenor.com/xxxxx/kucing-nangis.mp4",
 *   alt: "Kucing nangis",
 *   format: "mp4",
 *   width: 320, height: 320,
 * }],
 * ```
 *
 * Tip: pilih meme universal (kucing, kapibara) — hindari teks Inggris doang.
 */
export const MEMES_BY_MOOD: Record<MoodKey, MemeAsset[]> = {
  rich: [],
  chill: [],
  normal: [],
  warning: [],
  broke: [],
  thinking: [],
  stress: [],
  panic: [],
  celebrate: [],
  sad: [],
  romance: [],
  empty: [],
};

/**
 * Emoji fallback per mood — selalu ada, tidak butuh network. Dipakai oleh
 * `<MemeReaction>` saat list aset kosong atau gagal load.
 */
export const MOOD_EMOJI: Record<MoodKey, string> = {
  rich: "🤑",
  chill: "😎",
  normal: "🙂",
  warning: "😅",
  broke: "🥺",
  thinking: "🤔",
  stress: "😬",
  panic: "🔥",
  celebrate: "🎉",
  sad: "😔",
  romance: "💕",
  empty: "🫥",
};

/**
 * Caption pendek per mood — copywriting untuk hero/banner. Bahasa Indonesia
 * sesuai konvensi UI.
 */
export const MOOD_CAPTIONS: Record<MoodKey, string> = {
  rich: "Lagi makmur",
  chill: "Santai aja",
  normal: "Aman",
  warning: "Mulai hati-hati",
  broke: "Dompet menipis",
  thinking: "Ada yang perlu dicek",
  stress: "Beberapa kategori warning",
  panic: "Budget kelewat",
  celebrate: "Tercapai!",
  sad: "Bulan ini boncos",
  romance: "Berdua",
  empty: "Belum ada apa-apa",
};
