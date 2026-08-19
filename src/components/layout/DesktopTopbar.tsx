"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Crumb {
  label: string;
  href?: string;
}

interface DesktopTopbarProps {
  onToggleSidebar: () => void;
  /** Breadcrumb kiri — crumb terakhir (tanpa href) jadi judul halaman */
  crumbs?: Crumb[];
  /** Slot aksi kanan (QuickAddDropdown, ThemeToggle, dsb.) */
  children?: React.ReactNode;
}

/**
 * Topbar desktop — hidden di mobile (di bawah md BottomNav + Header halaman
 * yang lama tetap dipakai). Berisi toggle sidebar, breadcrumb modul/halaman,
 * dan slot aksi global di kanan.
 */
export const DesktopTopbar = ({
  onToggleSidebar,
  crumbs,
  children,
}: DesktopTopbarProps) => {
  return (
    <header className="hidden h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4 md:flex">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onToggleSidebar}
        aria-label="Tampilkan/sembunyikan sidebar"
      >
        <PanelLeft className="h-4 w-4" />
      </Button>

      {crumbs && crumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-sm"
        >
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <Fragment key={`${crumb.label}-${i}`}>
                {i > 0 && (
                  <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                    aria-hidden="true"
                  />
                )}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="truncate text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast
                        ? "truncate font-medium text-foreground"
                        : "truncate text-muted-foreground"
                    }
                  >
                    {crumb.label}
                  </span>
                )}
              </Fragment>
            );
          })}
        </nav>
      )}

      {children && (
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {children}
        </div>
      )}
    </header>
  );
};
