"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCouplePhoto } from "@/hooks/useCouplePhoto";

interface CoupleHeroProps {
  /** Override foto. Kalau ga di-set, pakai uploaded data URL dari Firestore,
   *  fallback ke `/photos/couple/default.jpg`, lalu gradient placeholder. */
  src?: string;
  /** Tanggal jadian — kalau ada, render counter "X hari · sejak DD MMMM YYYY"
   *  sebagai overlay di bagian bawah foto. */
  anniversaryDate?: Timestamp | null;
  className?: string;
}

const LOCAL_FALLBACK = "/photos/couple/default.jpg";

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const formatDate = (ts: Timestamp): string => {
  const d = ts.toDate();
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/**
 * Hero foto couple — Personalization Plan §3.6.
 *
 * Fallback graceful: kalau foto gagal load, render gradient pink/blue/purple
 * dengan icon Heart di tengah biar layout tetep terjaga (no broken image).
 *
 * Anniversary counter (kalau ada) di-render sebagai overlay di bagian bawah
 * foto dengan gradient mask buat legibility. Tone factual, tidak alay.
 */
export const CoupleHero = ({
  src,
  anniversaryDate,
  className,
}: CoupleHeroProps) => {
  const { photo } = useCouplePhoto();
  const uploadedUrl = photo?.dataUrl ?? null;

  const [attempt, setAttempt] = useState(0);
  const candidates = [src, uploadedUrl, LOCAL_FALLBACK].filter(
    (s): s is string => !!s
  );
  const currentSrc = candidates[attempt];
  const errored = attempt >= candidates.length;

  // Re-tick day count saat user balik ke tab supaya nggak stale lewat midnight.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const days = anniversaryDate
    ? Math.floor((now - anniversaryDate.toMillis()) / 86_400_000)
    : null;
  const showCounter = anniversaryDate && days !== null && days >= 0;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border",
        "aspect-[16/10]",
        className
      )}
    >
      {errored ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#E255A1]/15 via-[#2383E2]/10 to-[#9B59B6]/20"
          aria-hidden="true"
        >
          <Heart className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt="Foto bareng"
          onError={() => setAttempt((n) => n + 1)}
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Anniversary overlay — bottom of photo */}
      {showCounter && (
        <>
          {/* Gradient mask buat legibility teks di atas foto */}
          <div
            className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/65 via-black/25 to-transparent pointer-events-none"
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-3 p-4 text-white">
            <p className="text-sm leading-tight drop-shadow-sm">
              <span className="font-semibold tabular-nums">
                {days!.toLocaleString("id-ID")}
              </span>{" "}
              <span className="text-white/80">hari pacaran</span>
            </p>
            <p className="text-xs text-white/75 tabular-nums drop-shadow-sm">
              sejak {formatDate(anniversaryDate!)}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
