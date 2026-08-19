"use client";

import { useCallback, useEffect, useState } from "react";

const COLLAPSED = "1";

/**
 * State collapse sidebar desktop — persist di localStorage per modul
 * (key berbeda untuk keuangan & produktivitas). Server selalu render
 * expanded supaya tidak ada hydration mismatch; state localStorage
 * di-apply setelah mount.
 */
export function useSidebarState(storageKey: string) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) === COLLAPSED) {
        setCollapsed(true);
      }
    } catch {
      /* ignore storage errors */
    }
  }, [storageKey]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? COLLAPSED : "0");
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, [storageKey]);

  return { collapsed, toggle };
}
