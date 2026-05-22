import { Timestamp } from "firebase/firestore";

export type CategoryType = "expense" | "income" | "both";
export type BudgetScope = "arul" | "fifi" | "shared";

export interface Category {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  budgetAmount: number;
  budgetScope: BudgetScope;
  isActive: boolean;
  order: number;
  createdBy: string;
  createdAt: Timestamp;
}

export type CreateCategoryInput = Omit<Category, "categoryId" | "createdAt">;
