"use client";

import { cn } from "@/lib/utils/cn";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

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
        {/* Coin circle */}
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        {/* Dollar/currency symbol stylized */}
        <path
          d="M12 6.5V7.5M12 16.5V17.5M9.5 15.5C9.5 16.328 10.619 17 12 17C13.381 17 14.5 16.328 14.5 15.5C14.5 14.672 13.381 14 12 14C10.619 14 9.5 13.328 9.5 12.5C9.5 11.672 10.619 11 12 11C13.381 11 14.5 11.672 14.5 12.5M9.5 9.5C9.5 10.328 10.619 11 12 11M12 7.5C10.619 7.5 9.5 8.172 9.5 9C9.5 9.828 10.619 10.5 12 10.5C13.381 10.5 14.5 9.828 14.5 9C14.5 8.172 13.381 7.5 12 7.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span className={cn("font-semibold", textSizeMap[size])}>
          Arthafiloka
        </span>
      )}
    </div>
  );
};
