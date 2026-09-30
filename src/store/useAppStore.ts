import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, Transaction, Transfer } from "@/types";

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

  // Privacy State (persisted)
  hideBalance: boolean;

  // Asisten AI sheet — dibuka dari header mobile / topbar desktop.
  aiAssistantOpen: boolean;
  openAiAssistant: () => void;
  closeAiAssistant: () => void;

  // Actions
  openSheet: (
    type: "expense" | "income" | "transfer",
    item?: Transaction | Transfer | null
  ) => void;
  closeSheet: () => void;
  setSelectedMonth: (date: Date) => void;
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

      // Privacy State
      hideBalance: false,

      // Asisten AI
      aiAssistantOpen: false,
      openAiAssistant: () => set({ aiAssistantOpen: true }),
      closeAiAssistant: () => set({ aiAssistantOpen: false }),

      // Actions
      openSheet: (type, item) =>
        set({
          activeSheet: type,
          editingTransaction:
            type !== "transfer" ? ((item as Transaction | null) ?? null) : null,
          editingTransfer:
            type === "transfer" ? ((item as Transfer | null) ?? null) : null,
        }),
      closeSheet: () =>
        set({
          activeSheet: null,
          editingTransaction: null,
          editingTransfer: null,
        }),
      setSelectedMonth: (date) => set({ selectedMonth: date }),
      setHideBalance: (hide) => set({ hideBalance: hide }),
    }),
    {
      name: "arthafiloka-app-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ hideBalance: state.hideBalance }),
    }
  )
);
