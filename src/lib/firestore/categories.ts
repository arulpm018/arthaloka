import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Category, CreateCategoryInput } from "@/types";

const COLLECTION = "categories";

export const categoriesService = {
  /**
   * Create a new category
   */
  create: async (input: CreateCategoryInput): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...input,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Update an existing category
   */
  update: async (id: string, data: Partial<Category>): Promise<void> => {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, { ...data });
  },

  /**
   * Soft delete (deactivate) a category
   */
  deactivate: async (id: string): Promise<void> => {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, { isActive: false });
  },
};
