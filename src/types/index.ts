export * from "./user";
export * from "./account";
export * from "./transaction";
export * from "./transfer";
export * from "./category";
export * from "./wishlist";
export * from "./meme";
export * from "./productivity";

// Derived types
export interface BudgetStatus {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  budgetAmount: number;
  spent: number;
  percentage: number;
  status: "normal" | "warning" | "over";
}

export interface TxFilters {
  startDate: Date;
  endDate: Date;
  owner?: "arul" | "fifi" | "shared";
  categoryId?: string;
  accountId?: string;
  type?: "expense" | "income";
  search?: string;
}

export interface TransferFilters {
  startDate: Date;
  endDate: Date;
  owner?: "arul" | "fifi" | "shared";
}
