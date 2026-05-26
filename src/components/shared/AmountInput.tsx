"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatCurrency";

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  autoFocus?: boolean;
  className?: string;
  /**
   * Optional currency prefix label rendered inside the input.
   * Defaults to "Rp" for backward compatibility. Pass `""` to hide it
   * (input padding collapses to `pl-3`).
   */
  prefix?: string;
}

export const AmountInput = ({
  value,
  onChange,
  autoFocus,
  className,
  prefix = "Rp",
}: AmountInputProps) => {
  const [displayValue, setDisplayValue] = useState(value > 0 ? formatNumber(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === 0 && displayValue === "") return;
    setDisplayValue(value > 0 ? formatNumber(value) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    const num = parseInt(raw, 10) || 0;
    setDisplayValue(num > 0 ? formatNumber(num) : "");
    onChange(num);
  };

  const hasPrefix = prefix !== "";

  return (
    <div className={cn("relative", className)}>
      {hasPrefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder="0"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background pr-3 py-2 text-sm font-mono tabular-nums ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          hasPrefix ? "pl-10" : "pl-3"
        )}
      />
    </div>
  );
};
