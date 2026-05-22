import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CreateWishlistItemInput, WishlistItem } from "@/types/wishlist";

const COLLECTION = "wishlistItems";

export const wishlistItemsService = {
  /**
   * Create a new wishlist item with isPurchased=false and purchasedAt=null
   */
  create: async (input: CreateWishlistItemInput): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...input,
      isPurchased: false,
      purchasedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Update a wishlist item with updatedAt timestamp
   */
  update: async (id: string, data: Partial<WishlistItem>): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Hard delete a wishlist item
   */
  remove: async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },

  /**
   * Toggle isPurchased status and set/clear purchasedAt accordingly
   */
  togglePurchased: async (item: WishlistItem): Promise<void> => {
    const docRef = doc(db, COLLECTION, item.itemId);
    const newIsPurchased = !item.isPurchased;
    await updateDoc(docRef, {
      isPurchased: newIsPurchased,
      purchasedAt: newIsPurchased ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
  },
};
