import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WishlistCategory, CreateWishlistCategoryInput } from "@/types";

const COLLECTION = "wishlistCategories";

export const wishlistCategoriesService = {
  /**
   * Create a new wishlist category
   */
  create: async (input: CreateWishlistCategoryInput): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...input,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Update an existing wishlist category
   */
  update: async (id: string, data: Partial<WishlistCategory>): Promise<void> => {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, { ...data });
  },

  /**
   * Soft delete (deactivate) a wishlist category
   */
  deactivate: async (id: string): Promise<void> => {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, { isActive: false });
  },
};
