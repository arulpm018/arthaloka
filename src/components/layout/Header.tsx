"use client";

import { cn } from "@/lib/utils/cn";

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

export const Header = ({ title, ownerColor, titleSlot, children }: HeaderProps) => {
  // Subtle border tint when ownerColor is provided. Falls back to default
  // border via CSS class when not specified.
  const headerStyle = ownerColor
    ? { borderBottomColor: `${ownerColor}33` } // ~20% alpha tint
    : undefined;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6"
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
            <h1 className="text-xl-header truncate">{title}</h1>
          </>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
};
