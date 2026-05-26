"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a value — returns the latest `value` only after `delayMs`
 * has passed without further changes. Useful for search inputs where we
 * want to avoid firing downstream effects on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debouncedValue;
}
