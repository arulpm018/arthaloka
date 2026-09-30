"use client";

import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";

/**
 * Aksi di header mobile: avatar → Pengaturan. Asisten AI dibuka dari tab
 * "AI" di form catat (tombol + tengah).
 */
export const HeaderQuickActions = () => {
  const currentUser = useAppStore((s) => s.currentUser);

  const name = currentUser?.displayName ?? "Pengguna";
  const avatarUrl =
    currentUser?.preferences?.customAvatarUrl ?? currentUser?.photoURL ?? null;

  return (
    <Link href="/settings" aria-label="Pengaturan" className="rounded-full">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </Link>
  );
};
