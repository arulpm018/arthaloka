/**
 * Format number to IDR currency string: "Rp 1.234.567"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number without currency symbol: "1.234.567"
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

/**
 * Parse IDR formatted string back to number
 */
export function parseCurrency(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ""), 10) || 0;
}

/**
 * Compact amount for tight spaces: 1500000 -> "1,5jt", 250000 -> "250rb"
 */
export function formatCompactAmount(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000)
    return `${formatCompactPart(amount / 1_000_000_000)}M`;
  if (abs >= 1_000_000) return `${formatCompactPart(amount / 1_000_000)}jt`;
  if (abs >= 1_000) return `${Math.round(amount / 1_000)}rb`;
  return `${amount}`;
}

const formatCompactPart = (value: number): string =>
  value
    .toFixed(value < 10 ? 1 : 0)
    .replace(".", ",")
    .replace(",0", "");
