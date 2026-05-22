"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WishlistItem, CreateWishlistItemInput } from "@/types/wishlist";
import { wishlistItemsService } from "@/lib/firestore/wishlistItems";

export function useWishlistItems() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "wishlistItems"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          itemId: doc.id,
        })) as WishlistItem[];
        setItems(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching wishlist items:", err);
        setError("Gagal memuat data wishlist. Coba lagi nanti.");
        setIsLoading(false);
        // Retain last loaded data (don't clear items)
      }
    );

    return () => unsubscribe();
  }, []);

  const create = async (input: CreateWishlistItemInput): Promise<string> => {
    return wishlistItemsService.create(input);
  };

  const update = async (
    id: string,
    data: Partial<WishlistItem>
  ): Promise<void> => {
    return wishlistItemsService.update(id, data);
  };

  const remove = async (id: string): Promise<void> => {
    return wishlistItemsService.remove(id);
  };

  const togglePurchased = async (item: WishlistItem): Promise<void> => {
    return wishlistItemsService.togglePurchased(item);
  };

  return { items, isLoading, error, create, update, remove, togglePurchased };
}
