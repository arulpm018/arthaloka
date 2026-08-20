"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FAB } from "@/components/layout/FAB";
import { ActionSheet, type ActionType } from "@/components/layout/ActionSheet";
import { useAppStore } from "@/store/useAppStore";

/**
 * Routes yang menampilkan FAB tambah cepat. Halaman-halaman ini punya
 * konteks finansial / item — masuk akal punya akses cepat ke
 * pengeluaran/pemasukan/transfer/wishlist dari mana aja.
 */
const FAB_ROUTES = [
  "/dashboard",
  "/arul",
  "/fifi",
  "/together",
  "/wishlist",
  "/transactions",
];

/**
 * Global FAB — single instance di-mount oleh AppShell. Pasti hadir di semua
 * route yang termasuk `FAB_ROUTES` dengan posisi & shape identik.
 *
 * Action selection:
 *   - expense / income / transfer → buka TransactionSheet via store
 *   - wishlist → bump `wishlistAddRequest` counter; `<GlobalWishlistAddSheet>`
 *     yang di-mount di AppShell subscribe counter ini dan langsung buka form.
 *     No redirect — flow user nggak terputus.
 */
export const GlobalFAB = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const openSheet = useAppStore((s) => s.openSheet);
  const requestWishlistAdd = useAppStore((s) => s.requestWishlistAdd);
  const openAiAssistant = useAppStore((s) => s.openAiAssistant);

  const isFabRoute = FAB_ROUTES.some((r) => pathname.startsWith(r));
  if (!isFabRoute) return null;

  const handleSelect = (type: ActionType) => {
    if (type === "wishlist") {
      requestWishlistAdd();
      return;
    }
    if (type === "ai") {
      openAiAssistant();
      return;
    }
    openSheet(type);
  };

  return (
    <>
      <FAB onClick={() => setOpen(true)} />
      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
      />
    </>
  );
};
