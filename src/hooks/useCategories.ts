"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Category, CreateCategoryInput } from "@/types";
import { categoriesService } from "@/lib/firestore/categories";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "categories"),
      where("isActive", "==", true),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          categoryId: doc.id,
        })) as Category[];
        setCategories(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching categories:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const create = async (input: CreateCategoryInput): Promise<string> => {
    return categoriesService.create(input);
  };

  const update = async (id: string, data: Partial<Category>): Promise<void> => {
    return categoriesService.update(id, data);
  };

  const deactivate = async (id: string): Promise<void> => {
    return categoriesService.deactivate(id);
  };

  return { categories, isLoading, create, update, deactivate };
}
