import { Timestamp } from "firebase/firestore";
import { Owner } from "./account";

export interface WishlistCategory {
  categoryId: string;
  name: string;
  icon: string;
  owner: Owner;
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
}

export type CreateWishlistCategoryInput = Omit<WishlistCategory, "categoryId" | "createdAt">;

export interface WishlistItem {
  itemId: string;
  nama: string;
  harga: number;
  lokasi: string;
  categoryId: string;
  owner: Owner;
  isPurchased: boolean;
  purchasedAt: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateWishlistItemInput = Omit<WishlistItem, "itemId" | "createdAt" | "updatedAt" | "isPurchased" | "purchasedAt">;

export interface ProgressSummary {
  purchasedCount: number;
  totalCount: number;
  purchasedAmount: number;
  totalAmount: number;
}

export interface CategoryProgress extends ProgressSummary {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
}

export interface WishlistCategoryGroup {
  category: WishlistCategory;
  items: WishlistItem[];
  progress: CategoryProgress;
}

export type OwnerFilter = "all" | "arul" | "fifi" | "shared";
