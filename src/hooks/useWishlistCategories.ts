"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
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
    // Optimistic update: langsung tampilkan di UI sebelum server merespons
    const tempId = `temp_${Date.now()}`;
    const optimisticCategory: WishlistCategory = {
      ...input,
      categoryId: tempId,
      createdAt: Timestamp.now(),
    };
    setCategories((prev) => [...prev, optimisticCategory]);

    try {
      const id = await wishlistCategoriesService.create(input);
      // Replace temp entry with real ID (onSnapshot akan sync juga)
      setCategories((prev) =>
        prev.map((c) => (c.categoryId === tempId ? { ...c, categoryId: id } : c))
      );
      return id;
    } catch (err) {
      // Rollback optimistic update jika gagal
      setCategories((prev) => prev.filter((c) => c.categoryId !== tempId));
      throw err;
    }
  };

  const update = async (id: string, data: Partial<WishlistCategory>): Promise<void> => {
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.categoryId === id ? { ...c, ...data } : c))
    );
    try {
      await wishlistCategoriesService.update(id, data);
    } catch (err) {
      // onSnapshot akan revert ke state yang benar jika gagal
      throw err;
    }
  };

  const deactivate = async (id: string): Promise<void> => {
    // Optimistic: langsung hapus dari list
    const prev = categories;
    setCategories((current) => current.filter((c) => c.categoryId !== id));
    try {
      await wishlistCategoriesService.deactivate(id);
    } catch (err) {
      // Rollback
      setCategories(prev);
      throw err;
    }
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
