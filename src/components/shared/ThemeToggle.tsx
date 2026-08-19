"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Toggle tema cepat di topbar desktop. Ikon di-swap via CSS `dark:` variant
 * supaya tidak ada hydration mismatch; nilai tema aktual hanya dibaca saat
 * klik (setelah mount).
 *
 * Catatan: kalau user sebelumnya memakai "System" di Settings, toggle ini
 * akan mengunci ke light/dark eksplisit.
 */
export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleClick = () => {
    if (!mounted) return;
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleClick}
      aria-label="Ganti tema terang/gelap"
    >
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
    </Button>
  );
};
