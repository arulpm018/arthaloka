"use client";

import { useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { recorderLabel } from "@/lib/utils/recorder";

/** `(ownerUid) => "Arul" | "Fifi" | null` berdasarkan user login & pasangan. */
export function useRecorderLabel() {
  const currentUser = useAppStore((s) => s.currentUser);
  const partner = useAppStore((s) => s.partner);
  return useCallback(
    (uid: string | undefined) => recorderLabel(uid, currentUser, partner),
    [currentUser, partner]
  );
}
