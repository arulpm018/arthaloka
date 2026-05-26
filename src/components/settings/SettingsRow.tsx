"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  /** Right-side content — value, badge, switch, button. Replaces chevron. */
  trailing?: React.ReactNode;
  /** When set, row is clickable. Chevron auto-shown if no `trailing`. */
  onClick?: () => void;
  /** Color hint untuk icon (mis. destructive di logout). Default: foreground. */
  variant?: "default" | "destructive";
  htmlFor?: string;
  className?: string;
}

/**
 * Generic settings row — icon di kiri, label + description di tengah,
 * trailing slot di kanan. Pattern dipakai konsisten di seluruh halaman
 * Settings supaya scanable & nggak gemuk.
 *
 * Render sebagai `<button>` kalau `onClick` ada, `<div>` kalau cuma display.
 */
export const SettingsRow = ({
  icon: Icon,
  label,
  description,
  trailing,
  onClick,
  variant = "default",
  htmlFor,
  className,
}: SettingsRowProps) => {
  const isInteractive = !!onClick;
  const showChevron = isInteractive && !trailing;

  const content = (
    <>
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          variant === "destructive"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        {htmlFor ? (
          <label
            htmlFor={htmlFor}
            className={cn(
              "block text-sm font-medium leading-tight",
              variant === "destructive" && "text-destructive"
            )}
          >
            {label}
          </label>
        ) : (
          <p
            className={cn(
              "text-sm font-medium leading-tight",
              variant === "destructive" && "text-destructive"
            )}
          >
            {label}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
      {showChevron && (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
          "hover:bg-accent active:bg-accent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 px-3 py-2.5", className)}>
      {content}
    </div>
  );
};

/**
 * Group container — render rows di atas card-style border + divider.
 */
export const SettingsGroup = ({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("space-y-2", className)}>
    {title && (
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3">
        {title}
      </h3>
    )}
    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
      {children}
    </div>
  </div>
);
