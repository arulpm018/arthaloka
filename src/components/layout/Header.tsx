"use client";

import { cn } from "@/lib/utils/cn";
import { AppSwitcher } from "@/components/shared/AppSwitcher";

interface HeaderProps {
  /**
   * Default title text. Ignored when `titleSlot` is provided — use that for
   * interactive titles (e.g. owner switcher dropdown).
   */
  title?: string;
  showMonthPicker?: boolean;
  ownerColor?: string;
  /**
   * Custom title slot — replaces the default `<h1>` + dot. When supplied, the
   * caller is responsible for any indicator (e.g. dot) and accessibility label.
   */
  titleSlot?: React.ReactNode;
  children?: React.ReactNode; // right slot for month picker or actions
}

/**
 * Header halaman — dual-mode:
 * - Mobile: sticky bar h-14 dengan border (perilaku lama, tidak berubah).
 * - Desktop: baris judul halaman in-flow ala Notion — tanpa border/sticky,
 *   sejajar dengan container konten (max-w-5xl), judul lebih besar.
 * Slot kanan (MonthPicker, tombol aksi) tetap berfungsi di kedua mode.
 */
export const Header = ({ title, ownerColor, titleSlot, children }: HeaderProps) => {
  // Subtle border tint when ownerColor is provided. Falls back to default
  // border via CSS class when not specified. (Efek hanya terlihat di mobile —
  // desktop tidak punya border bawah.)
  const headerStyle = ownerColor
    ? { borderBottomColor: `${ownerColor}33` } // ~20% alpha tint
    : undefined;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4",
        "md:static md:z-auto md:h-auto md:min-h-[3.5rem] md:w-full md:max-w-5xl md:mx-auto md:border-0 md:bg-transparent md:px-6 md:pt-6"
      )}
      style={headerStyle}
    >
      <div className="flex items-center gap-2 min-w-0">
        {titleSlot ? (
          titleSlot
        ) : (
          <>
            {ownerColor && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: ownerColor }}
                aria-hidden="true"
              />
            )}
            <h1 className="text-xl-header truncate md:text-2xl md:font-semibold md:tracking-tight">
              {title}
            </h1>
          </>
        )}
      </div>
      {/* Switcher modul — mobile only; di desktop ada di DesktopTopbar.
          Selalu paling kanan (setelah aksi halaman) supaya posisinya konsisten. */}
      <div className="flex items-center gap-2">
        {children}
        <div className="md:hidden">
          <AppSwitcher />
        </div>
      </div>
    </header>
  );
};
