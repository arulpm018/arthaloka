import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { categoriesService } from "@/lib/firestore/categories";
import { CreateCategoryInput } from "@/types";

const defaultCategories: Omit<CreateCategoryInput, "createdBy">[] = [
  { name: "Food & Drink", icon: "🍔", color: "#E03E3E", type: "expense", budgetAmount: 2000000, budgetScope: "each", isActive: true, order: 0 },
  { name: "Transport", icon: "🚗", color: "#2383E2", type: "expense", budgetAmount: 500000, budgetScope: "each", isActive: true, order: 1 },
  { name: "Rent & Housing", icon: "🏠", color: "#795548", type: "expense", budgetAmount: 0, budgetScope: "each", isActive: true, order: 2 },
  { name: "Utilities", icon: "💡", color: "#D9730D", type: "expense", budgetAmount: 300000, budgetScope: "each", isActive: true, order: 3 },
  { name: "Health", icon: "💊", color: "#0F9B58", type: "expense", budgetAmount: 0, budgetScope: "each", isActive: true, order: 4 },
  { name: "Fashion", icon: "👗", color: "#E255A1", type: "expense", budgetAmount: 500000, budgetScope: "each", isActive: true, order: 5 },
  { name: "Beauty", icon: "💄", color: "#9B59B6", type: "expense", budgetAmount: 300000, budgetScope: "fifi", isActive: true, order: 6 },
  { name: "Entertainment", icon: "🎮", color: "#6C63FF", type: "expense", budgetAmount: 200000, budgetScope: "each", isActive: true, order: 7 },
  { name: "Education", icon: "📚", color: "#00BCD4", type: "expense", budgetAmount: 0, budgetScope: "each", isActive: true, order: 8 },
  { name: "Dating", icon: "💑", color: "#E255A1", type: "expense", budgetAmount: 500000, budgetScope: "shared", isActive: true, order: 9 },
  { name: "Groceries", icon: "🛒", color: "#0F9B58", type: "expense", budgetAmount: 1000000, budgetScope: "each", isActive: true, order: 10 },
  { name: "Pets", icon: "🐾", color: "#795548", type: "expense", budgetAmount: 0, budgetScope: "each", isActive: true, order: 11 },
  { name: "Gifts", icon: "🎁", color: "#D9730D", type: "expense", budgetAmount: 0, budgetScope: "each", isActive: true, order: 12 },
  { name: "Salary", icon: "💼", color: "#0F9B58", type: "income", budgetAmount: 0, budgetScope: "each", isActive: true, order: 13 },
  { name: "Freelance", icon: "💸", color: "#2383E2", type: "income", budgetAmount: 0, budgetScope: "each", isActive: true, order: 14 },
  { name: "Bonus", icon: "🎯", color: "#D9730D", type: "income", budgetAmount: 0, budgetScope: "each", isActive: true, order: 15 },
  { name: "Others", icon: "📦", color: "#607D8B", type: "both", budgetAmount: 0, budgetScope: "each", isActive: true, order: 16 },
];

export async function seedCategories(createdBy: string): Promise<void> {
  const categoriesRef = collection(db, "categories");
  const existing = await getDocs(query(categoriesRef, limit(1)));

  if (!existing.empty) {
    console.log("Categories already seeded, skipping.");
    return;
  }

  for (const category of defaultCategories) {
    await categoriesService.create({ ...category, createdBy });
  }

  console.log(`Seeded ${defaultCategories.length} categories.`);
}

export { defaultCategories };
