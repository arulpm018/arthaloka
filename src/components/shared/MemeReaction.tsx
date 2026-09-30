"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { giphyUrl, MOOD_EMOJI, pickMeme } from "@/lib/constants/memes";
import type { BudgetMood } from "@/lib/utils/budgetMood";

interface MemeReactionProps {
  mood: BudgetMood;
  /** Penentu GIF yang dipilih (mis. tanggal) supaya stabil sepanjang hari */
  seed: number;
  className?: string;
}

/** GIF meme sesuai kondisi keuangan; emoji kalau GIF gagal dimuat (offline). */
export const MemeReaction = ({ mood, seed, className }: MemeReactionProps) => {
  const meme = pickMeme(mood, seed);
  const [failedId, setFailedId] = useState<string | null>(null);

  if (failedId === meme.id) {
    return (
      <span role="img" aria-label={meme.alt} className={cn("flex items-center justify-center text-4xl", className)}>
        {MOOD_EMOJI[mood]}
      </span>
    );
  }

  return (
    // GIF animasi dari CDN GIPHY — next/image tidak perlu di sini.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={giphyUrl(meme.id)}
      alt={meme.alt}
      title="via GIPHY"
      loading="lazy"
      onError={() => setFailedId(meme.id)}
      className={cn("object-cover", className)}
    />
  );
};
