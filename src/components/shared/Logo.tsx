"use client";

import { cn } from "@/lib/utils/cn";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

/**
 * Arthafiloka logo mark — vesica piscis.
 * Two overlapping circles symbolize Arul & Fifi as whole individuals;
 * the center dot represents the shared wealth growing between them.
 *
 * Single-color, uses currentColor so it adapts to theme + owner accents.
 */
export const Logo = ({ size = "md", showText = true, className }: LogoProps) => {
  const sizeMap = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const textSizeMap = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(sizeMap[size], "shrink-0")}
        aria-hidden="true"
      >
        {/* Left circle — Arul */}
        <circle
          cx="8.5"
          cy="12"
          r="6.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        {/* Right circle — Fifi */}
        <circle
          cx="15.5"
          cy="12"
          r="6.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        {/* Center dot — shared wealth */}
        <circle cx="12" cy="12" r="0.9" fill="currentColor" />
      </svg>
      {showText && (
        <span className={cn("font-semibold tracking-tight", textSizeMap[size])}>
          Arthafiloka
        </span>
      )}
    </div>
  );
};
