import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TransactionFormValues } from "@/lib/validations/transaction.schema";
import { User, Transaction, Transfer } from "@/types";

/**
 * Tracks the origin of a prefill so that the TransactionSheet can perform
 * cross-feature side effects after a successful save (e.g. mark a wishlist
 * item as purchased and link the new transaction id back to it).
 */
export type PrefillSource = { type: "wishlist"; itemId: string };

interface AppStore {
  // Auth State
  currentUser: User | null;
  partner: User | null;
  isLoading: boolean;
  setCurrentUser: (user: User | null) => void;
  setPartner: (user: User | null) => void;
  setIsLoading: (loading: boolean) => void;

  // UI State
  activeSheet: "expense" | "income" | "transfer" | null;
  editingTransaction: Transaction | null;
  editingTransfer: Transfer | null;
  selectedMonth: Date;
  defaultOwner: "arul" | "fifi" | "shared" | null;

  // Cross-feature prefill state (ephemeral — not persisted)
  prefillData: Partial<TransactionFormValues> | null;
  prefillSource: PrefillSource | null;

  // Privacy State (persisted)
  hideBalance: boolean;

  // Wishlist add trigger — flipped by global FAB action; consumed (auto-reset)
  // oleh halaman wishlist saat membuka form. Pakai counter (bukan boolean)
  // supaya klik beruntun selalu trigger ulang efek.
  wishlistAddRequest: number;
  requestWishlistAdd: () => void;

  // Actions
  openSheet: (
    type: "expense" | "income" | "transfer",
    item?: Transaction | Transfer | null
  ) => void;
  /**
   * Open the sheet with a partial form prefill plus an optional source tag.
   * The sheet uses `prefillData` to override defaults on create, and
   * `prefillSource` to perform follow-up writes after a successful save.
   * Both are cleared by `closeSheet`.
   */
  openSheetWithPrefill: (
    type: "expense" | "income" | "transfer",
    prefillData: Partial<TransactionFormValues>,
    source: PrefillSource | null
  ) => void;
  closeSheet: () => void;
  setSelectedMonth: (date: Date) => void;
  setDefaultOwner: (owner: "arul" | "fifi" | "shared" | null) => void;
  setHideBalance: (hide: boolean) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Auth State
      currentUser: null,
      partner: null,
      isLoading: true,
      setCurrentUser: (user) => set({ currentUser: user }),
      setPartner: (partner) => set({ partner }),
      setIsLoading: (isLoading) => set({ isLoading }),

      // UI State
      activeSheet: null,
      editingTransaction: null,
      editingTransfer: null,
      selectedMonth: new Date(),
      defaultOwner: null,

      // Prefill State
      prefillData: null,
      prefillSource: null,

      // Privacy State
      hideBalance: false,

      // Wishlist add trigger
      wishlistAddRequest: 0,
      requestWishlistAdd: () =>
        set((s) => ({ wishlistAddRequest: s.wishlistAddRequest + 1 })),

      // Actions
      openSheet: (type, item) =>
        set({
          activeSheet: type,
          editingTransaction:
            type !== "transfer" ? ((item as Transaction | null) ?? null) : null,
          editingTransfer:
            type === "transfer" ? ((item as Transfer | null) ?? null) : null,
          // Plain open clears any stale prefill from a prior flow.
          prefillData: null,
          prefillSource: null,
        }),
      openSheetWithPrefill: (type, prefillData, source) =>
        set({
          activeSheet: type,
          editingTransaction: null,
          editingTransfer: null,
          prefillData,
          prefillSource: source,
        }),
      closeSheet: () =>
        set({
          activeSheet: null,
          editingTransaction: null,
          editingTransfer: null,
          prefillData: null,
          prefillSource: null,
        }),
      setSelectedMonth: (date) => set({ selectedMonth: date }),
      setDefaultOwner: (owner) => set({ defaultOwner: owner }),
      setHideBalance: (hide) => set({ hideBalance: hide }),
    }),
    {
      name: "arthafiloka-app-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ hideBalance: state.hideBalance }),
    }
  )
);
