import type { BudgetMood } from "@/lib/utils/budgetMood";

/** GIF meme dari GIPHY — disimpan sebagai id, dimuat langsung dari CDN GIPHY. */
export interface MemeGif {
  id: string;
  /** Deskripsi untuk screen reader */
  alt: string;
}

/** Rendition ringan (lebar 200px, webp ~30–300 KB). */
export const giphyUrl = (id: string) => `https://media.giphy.com/media/${id}/200w.webp`;

export const MEMES_BY_MOOD: Record<BudgetMood, MemeGif[]> = {
  hemat: [
    { id: "6K9DqFGbqERY6W36Tq", alt: "Kapibara joget senang" },
    { id: "09AtjqWhujXg3BwHue", alt: "Kapibara pesta joget" },
  ],
  aman: [
    { id: "5ZduvJIfMxdyEGzPk2", alt: "Kapibara santai" },
    { id: "hi2kPofVMW70k", alt: "Kapibara berendam santai" },
  ],
  boros: [
    { id: "YZsoNot6VKBHYHm0zz", alt: "Kapibara panik, ups" },
    { id: "N53GCDUcHJr3n9Gkme", alt: "Kapibara gugup di balik pintu" },
  ],
  mepet: [
    { id: "yIRvECxXs31MYteBGH", alt: "Kapibara kaget" },
    { id: "DUuyU3KyYGLNS", alt: "SpongeBob gigit kuku ketakutan" },
  ],
  boncos: [
    { id: "loZPoFJzPsdCPsCJRr", alt: "Kapibara menangis" },
    { id: "QZ199NMwALrVOY2nng", alt: "Bank bilang tidak ada uang" },
  ],
};

/** Cadangan kalau GIF gagal dimuat (offline / GIPHY down). */
export const MOOD_EMOJI: Record<BudgetMood, string> = {
  hemat: "🤑",
  aman: "😎",
  boros: "😅",
  mepet: "😬",
  boncos: "😭",
};

export const MOOD_CAPTION: Record<BudgetMood, string> = {
  hemat: "Budget hemat banget bulan ini",
  aman: "Budget masih aman",
  boros: "Pengeluaran agak boros nih",
  mepet: "Budget mepet",
  boncos: "Budget boncos!",
};

/** Pilih GIF secara stabil untuk `seed` (mis. tanggal) — tidak berganti tiap render. */
export function pickMeme(mood: BudgetMood, seed: number): MemeGif {
  const list = MEMES_BY_MOOD[mood];
  return list[Math.abs(seed) % list.length];
}
