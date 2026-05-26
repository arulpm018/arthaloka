"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { OWNER_COLORS, OWNER_LABELS } from "@/lib/constants/labels";
import { useAppStore } from "@/store/useAppStore";
import { useCouplePhotoContext } from "@/components/shared/CouplePhotoProvider";
import type { Owner } from "@/types";

interface OwnerAvatarProps {
  owner: Owner;
  /**
   * Override foto explicit. Kalau di-set, prop ini menang. Kalau ga, hook
   * resolve otomatis dari `currentUser.preferences.customAvatarUrl` atau
   * `partner.preferences.customAvatarUrl` (matching by `role`).
   */
  photoURL?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  /**
   * Default: foto lokal di `public/photos/{owner}.jpg` dipakai sebagai
   * fallback otomatis. Set `false` untuk skip — render initial chip langsung.
   */
  useLocalFallback?: boolean;
}

const SIZE_CLASS = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-2xl",
} as const;

const PIXEL_SIZE = { sm: 24, md: 40, lg: 80 } as const;

const localPhotoFor = (owner: Owner): string | null => {
  // Foto couple ditangani oleh component khusus (CoupleHero) — di sini fokus
  // ke per-orang. `shared` di-render sebagai initial "WE" chip dengan tint
  // shared color.
  if (owner === "arul") return "/photos/arul.jpg";
  if (owner === "fifi") return "/photos/fifi.jpg";
  return null;
};

/**
 * Avatar bulet by `owner`. Dipakai di header, settings profile, owner switcher.
 *
 * Fallback chain:
 *   1. `photoURL` prop (explicit override)
 *   2. Custom avatar dari Firestore (auto: currentUser/partner by role match)
 *   3. Foto lokal `/photos/{owner}.jpg` (kalau `useLocalFallback`)
 *   4. Initial chip dengan tint `OWNER_COLORS[owner]`
 *
 * `<img>` native di sini lebih cocok dari `next/image` karena ukuran kecil
 * dan source-nya bisa cross-origin Google profile / Firebase Storage.
 */
export const OwnerAvatar = ({
  owner,
  photoURL,
  size = "md",
  className,
  useLocalFallback = true,
}: OwnerAvatarProps) => {
  // Auto-resolve custom avatar — match owner role dengan currentUser/partner.
  const customAvatarFromStore = useAppStore((s) => {
    if (owner === "shared") return null;
    if (s.currentUser?.role === owner) {
      return s.currentUser.preferences?.customAvatarUrl ?? null;
    }
    if (s.partner?.role === owner) {
      return s.partner.preferences?.customAvatarUrl ?? null;
    }
    return null;
  });

  // Owner=shared → ambil foto couple dari Firestore (single subscription via provider).
  const { photo: couplePhoto } = useCouplePhotoContext();
  const couplePhotoUrl = owner === "shared" ? couplePhoto?.dataUrl ?? null : null;

  // Build fallback chain. State tracks current attempt index — naik kalau
  // <img> error, sampai kehabisan kandidat → render initial chip.
  const candidates: string[] = [];
  if (photoURL) candidates.push(photoURL);
  if (customAvatarFromStore && customAvatarFromStore !== photoURL) {
    candidates.push(customAvatarFromStore);
  }
  if (couplePhotoUrl && couplePhotoUrl !== photoURL) {
    candidates.push(couplePhotoUrl);
  }
  const local = useLocalFallback ? localPhotoFor(owner) : null;
  if (local) candidates.push(local);

  const [attempt, setAttempt] = useState(0);
  const currentSrc = candidates[attempt];

  const ownerColor = OWNER_COLORS[owner];
  const initial =
    owner === "shared" ? "WE" : OWNER_LABELS[owner].slice(0, 1).toUpperCase();
  const dim = PIXEL_SIZE[size];

  // No image candidate left → tinted initial chip.
  if (!currentSrc) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0",
          SIZE_CLASS[size],
          className
        )}
        style={{ backgroundColor: ownerColor }}
        aria-label={`Avatar ${OWNER_LABELS[owner]}`}
        role="img"
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={`Foto ${OWNER_LABELS[owner]}`}
      width={dim}
      height={dim}
      onError={() => setAttempt((n) => n + 1)}
      className={cn(
        "rounded-full object-cover shrink-0 ring-2 ring-background",
        SIZE_CLASS[size],
        className
      )}
      // Tinted halo as visual fallback — survives even if image partly loads.
      style={{ boxShadow: `0 0 0 1px ${ownerColor}55` }}
      loading="lazy"
      decoding="async"
    />
  );
};
