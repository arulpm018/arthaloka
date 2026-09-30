import type { Owner } from "@/types";

/**
 * Label pemilik rekening. Database tetap pakai value `"shared"`, UI
 * menampilkan "Bersama".
 */
export const OWNER_LABELS: Record<Owner, string> = {
  arul: "Arul",
  fifi: "Fifi",
  shared: "Bersama",
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
