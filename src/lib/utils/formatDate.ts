import { format, isToday, isYesterday, isThisWeek, isThisYear } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Format date to relative string: "Hari ini", "Kemarin", "Senin", "12 Mar", "12 Mar 2023"
 */
export function formatRelativeDate(date: Date): string {
  if (isToday(date)) return "Hari ini";
  if (isYesterday(date)) return "Kemarin";
  if (isThisWeek(date)) return format(date, "EEEE", { locale: id });
  if (isThisYear(date)) return format(date, "d MMM", { locale: id });
  return format(date, "d MMM yyyy", { locale: id });
}

/**
 * Format date for display: "12 Mei 2024"
 */
export function formatDate(date: Date): string {
  return format(date, "d MMMM yyyy", { locale: id });
}

/**
 * Format month/year: "Mei 2024"
 */
export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy", { locale: id });
}
