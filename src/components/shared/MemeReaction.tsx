"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  MEMES_BY_MOOD,
  MOOD_EMOJI,
  type MemeAsset,
  type MoodKey,
} from "@/lib/constants/memes";
import { useAppStore } from "@/store/useAppStore";
import { useCustomMemesByMood } from "@/components/shared/CustomMemesProvider";
import type { CustomMeme } from "@/types/meme";

interface MemeReactionProps {
  mood: MoodKey;
  size?: "sm" | "md" | "lg";
  /**
   * Deterministic seed untuk milih aset dari list. Sama → render meme yang
   * sama. Default: hash dari mood saja (stable per re-render dalam 1 session).
   */
  seed?: string;
  /** Override toggle — biasanya respect `currentUser.preferences.showMemes`. */
  forceShow?: boolean;
  className?: string;
}

const SIZE_CLASS = {
  sm: "w-8 h-8 text-xl",
  md: "w-16 h-16 text-3xl",
  lg: "w-32 h-32 text-5xl",
} as const;

const PIXEL_SIZE = { sm: 32, md: 64, lg: 128 } as const;

/**
 * Stable hash untuk milih aset deterministik berdasarkan seed string.
 */
const hashSeed = (seed: string): number => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

/**
 * Convert custom meme (Firestore) ke shape `MemeAsset` supaya bisa dirender
 * lewat path yang sama dengan meme statis. `dataUrl` boleh dipakai langsung
 * sebagai `src` di `<img>`.
 */
const customToAsset = (m: CustomMeme): MemeAsset => ({
  type: "tenor-direct", // pakai jalur direct media URL
  src: m.dataUrl,
  alt: m.alt,
  format: m.format === "gif" ? "gif" : "gif", // jpg juga di-render via <img>
});

/**
 * Render reaction meme by mood. Resolve order:
 *   1. Custom meme dari Firestore (priority — user-managed)
 *   2. Asset dari `MEMES_BY_MOOD[mood]` (static, hard-coded)
 *   3. Emoji unicode dari `MOOD_EMOJI`
 *
 * Selalu honor `currentUser.preferences.showMemes` — toggle off → null.
 */
export const MemeReaction = ({
  mood,
  size = "md",
  seed,
  forceShow,
  className,
}: MemeReactionProps) => {
  const showMemesPref = useAppStore(
    (s) => s.currentUser?.preferences?.showMemes
  );
  const memesEnabled = forceShow ?? showMemesPref ?? true;
  const customMemes = useCustomMemesByMood(mood);

  // Pick aset deterministik dari combined list. `useMemo` cegah recompute.
  const asset: MemeAsset | null = useMemo(() => {
    const customAssets = customMemes.map(customToAsset);
    const staticAssets = MEMES_BY_MOOD[mood] ?? [];
    const list = [...customAssets, ...staticAssets];
    if (list.length === 0) return null;
    const key = seed ?? `${mood}-default`;
    return list[hashSeed(key) % list.length];
  }, [mood, seed, customMemes]);

  const [errored, setErrored] = useState(false);

  // Reset error state ketika asset (mood/seed) berubah.
  useEffect(() => {
    setErrored(false);
  }, [asset]);

  if (!memesEnabled) return null;

  const emoji = MOOD_EMOJI[mood];

  // Fallback ke emoji kalau: belum ada aset, embed (di-render via TenorEmbed,
  // bukan inline), atau pernah error load.
  if (!asset || asset.type === "tenor-embed" || errored) {
    return (
      <span
        role="img"
        aria-label={asset?.alt ?? `Reaksi ${mood}`}
        className={cn(
          "inline-flex items-center justify-center leading-none",
          SIZE_CLASS[size],
          className
        )}
      >
        {emoji}
      </span>
    );
  }

  const dim = PIXEL_SIZE[size];
  const baseClass = cn(
    "rounded-md object-cover bg-muted shrink-0",
    SIZE_CLASS[size],
    className
  );

  if (asset.type === "tenor-direct" && asset.format === "mp4") {
    // `muted` + `playsInline` wajib biar autoplay jalan di iOS Safari.
    return (
      <video
        src={asset.src}
        width={dim}
        height={dim}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={asset.alt}
        onError={() => setErrored(true)}
        className={baseClass}
      />
    );
  }

  // Default: GIF / JPG (Tenor direct, local, atau Firebase Storage URL).
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.src}
      alt={asset.alt}
      width={dim}
      height={dim}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={baseClass}
    />
  );
};
