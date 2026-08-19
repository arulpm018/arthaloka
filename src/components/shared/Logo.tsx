"use client";

import { cn } from "@/lib/utils/cn";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

/**
 * Arthafiloka logo mark — beruang peluk grafik (aset /logo-192.png),
 * tanpa teks. Wordmark "Arthafiloka" dirender terpisah di sebelahnya.
 */
export const Logo = ({ size = "md", showText = true, className }: LogoProps) => {
  const sizeMap = {
    sm: "h-5 w-5 rounded-[5px]",
    md: "h-6 w-6 rounded-md",
    lg: "h-8 w-8 rounded-lg",
  };

  const textSizeMap = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-192.png"
        alt="Logo Arthafiloka"
        className={cn("shrink-0 object-cover", sizeMap[size])}
      />
      {showText && (
        <span className={cn("font-semibold tracking-tight", textSizeMap[size])}>
          Arthafiloka
        </span>
      )}
    </div>
  );
};
