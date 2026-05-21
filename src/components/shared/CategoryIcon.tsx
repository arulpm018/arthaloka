"use client";

import { getCategoryIcon } from "@/lib/utils/categoryIcons";
import { cn } from "@/lib/utils/cn";

interface CategoryIconProps {
  icon: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

const iconSizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export const CategoryIcon = ({
  icon,
  color = "#64748b",
  size = "md",
  className,
}: CategoryIconProps) => {
  const Icon = getCategoryIcon(icon);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: `${color}15` }}
    >
      <Icon className={iconSizeClasses[size]} style={{ color }} />
    </div>
  );
};
