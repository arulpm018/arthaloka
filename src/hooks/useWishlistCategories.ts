"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WishlistCategory, CreateWishlistCategoryInput } from "@/types";
import { wishlistCategoriesService } from "@/lib/firestore/wishlistCategories";
import { isDuplicateCategoryName } from "@/lib/utils/wishlist";

export function useWishlistCategories() {
  const [categories, setCategories] = useState<WishlistCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "wishlistCategories"),
      where("isActive", "==", true),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          categoryId: doc.id,
        })) as WishlistCategory[];
        setCategories(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching wishlist categories:", err);
        setError("Gagal memuat kategori wishlist. Coba lagi nanti.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const create = async (input: CreateWishlistCategoryInput): Promise<string> => {
    return wishlistCategoriesService.create(input);
  };

  const update = async (id: string, data: Partial<WishlistCategory>): Promise<void> => {
    return wishlistCategoriesService.update(id, data);
  };

  const deactivate = async (id: string): Promise<void> => {
    return wishlistCategoriesService.deactivate(id);
  };

  const isDuplicateName = useCallback(
    (name: string, excludeId?: string): boolean => {
      return isDuplicateCategoryName(name, categories, excludeId);
    },
    [categories]
  );

  return {
    categories,
    isLoading,
    error,
    create,
    update,
    deactivate,
    isDuplicateName,
  };
}
