"use client";

import { cn } from "@/lib/utils/cn";

interface HeaderProps {
  title: string;
  showMonthPicker?: boolean;
  children?: React.ReactNode; // right slot for month picker or actions
}

export const Header = ({ title, children }: HeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6"
      )}
    >
      <h1 className="text-xl-header">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
};
