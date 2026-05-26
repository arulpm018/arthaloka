import type { Owner } from "@/types";

/**
 * Display labels for owner values. Database tetap pakai value `"shared"`,
 * tapi UI menampilkan "Bareng" sebagai pengganti "Berdua"/"Together"/"Bersama"
 * yang sebelumnya dipakai inkonsisten di V1.
 */
export const OWNER_LABELS: Record<Owner, string> = {
  arul: "Arul",
  fifi: "Fifi",
  shared: "Bareng",
};

/**
 * Owner color tokens untuk visual indicator (header dot, border tint, dll).
 * - arul: blue
 * - fifi: pink
 * - shared: purple
 */
export const OWNER_COLORS: Record<Owner, string> = {
  arul: "#2383E2",
  fifi: "#E255A1",
  shared: "#9B59B6",
};
