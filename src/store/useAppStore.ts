import { create } from "zustand";
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
  defaultOwner: "arul" | "fifi" | "shared" | null;

  // Actions
  openSheet: (
    type: "expense" | "income" | "transfer",
    item?: Transaction | Transfer | null
  ) => void;
  closeSheet: () => void;
  setSelectedMonth: (date: Date) => void;
  setDefaultOwner: (owner: "arul" | "fifi" | "shared" | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
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
  setDefaultOwner: (owner) => set({ defaultOwner: owner }),
}));
