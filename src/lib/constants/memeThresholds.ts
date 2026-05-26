/**
 * Threshold mapping untuk mood reaction. Personalization Plan §3.8 / §3.9.
 *
 * Konservatif by design: jangan tiap saldo turun sedikit langsung dapet meme.
 * Tweak di sini kalau mau adjust sensitivity.
 */

/** Total balance (IDR) → mood tier untuk dashboard hero. */
export const BALANCE_THRESHOLDS = {
  rich: 100_000_000, //  > 100M
  chill: 50_000_000, //  50–100M
  normal: 10_000_000, // 10–50M
  warning: 1_000_000, // 1–10M
  // < 1M → broke
} as const;

/**
 * Persentase budget per kategori → status. Existing `BudgetStatus.status`
 * pakai threshold yang sama (lihat `useBudgets`):
 * - normal:  < 80%
 * - warning: 80–100%
 * - over:    > 100%
 */
export const BUDGET_STATUS_THRESHOLDS = {
  warning: 80,
  over: 100,
} as const;
