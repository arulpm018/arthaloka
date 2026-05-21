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
