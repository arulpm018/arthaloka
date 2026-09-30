"use client";

import Link from "next/link";
import { PrometheusMascot } from "@/components/ai/PrometheusMascot";
import { useAppStore } from "@/store/useAppStore";

/**
 * Aksi cepat di header mobile: buka Prometheus (AI) & avatar → Pengaturan.
 * Di desktop padanannya ada di DesktopTopbar / kartu user sidebar.
 */
export const HeaderQuickActions = () => {
  const openAiAssistant = useAppStore((s) => s.openAiAssistant);
  const currentUser = useAppStore((s) => s.currentUser);

  const name = currentUser?.displayName ?? "Pengguna";
  const avatarUrl =
    currentUser?.preferences?.customAvatarUrl ?? currentUser?.photoURL ?? null;

  return (
    <>
      <button
        type="button"
        onClick={openAiAssistant}
        aria-label="Tanya Prometheus"
        className="rounded-lg transition-transform active:scale-95"
      >
        <PrometheusMascot className="h-8 w-8 rounded-lg" />
      </button>
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
    </>
  );
};
