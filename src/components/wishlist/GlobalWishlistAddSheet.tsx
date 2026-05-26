"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WishlistItemForm } from "@/components/wishlist/WishlistItemForm";
import { WishlistCategoryForm } from "@/components/wishlist/WishlistCategoryForm";
import { useWishlistItems } from "@/hooks/useWishlistItems";
import { useWishlistCategories } from "@/hooks/useWishlistCategories";
import { useAppStore } from "@/store/useAppStore";
import type { WishlistItemFormValues } from "@/lib/validations/wishlistItem.schema";
import type { WishlistCategoryFormValues } from "@/lib/validations/wishlistCategory.schema";

/**
 * Global wishlist "tambah item" sheet — di-mount di `AppShell` supaya bisa
 * dibuka dari mana aja (FAB → Wishlist) tanpa redirect ke /wishlist.
 *
 * Trigger: counter `wishlistAddRequest` di store. Tiap counter naik (FAB
 * dipencet), sheet dibuka. /wishlist page tetep punya form lokal sendiri
 * untuk edit dan re-open setelah add category — gak bentrok karena cuma
 * 1 sheet yang aktif kapan pun.
 *
 * Form ini juga handle inline "Tambah Kategori" via secondary sheet.
 */
export const GlobalWishlistAddSheet = () => {
  const wishlistAddRequest = useAppStore((s) => s.wishlistAddRequest);
  const lastHandled = useRef(wishlistAddRequest);

  const [open, setOpen] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [reopenAfterCategory, setReopenAfterCategory] = useState(false);

  const { create } = useWishlistItems();
  const {
    categories,
    create: createCategory,
    isDuplicateName,
  } = useWishlistCategories();

  // Buka sheet saat counter naik (skip initial mount).
  useEffect(() => {
    if (wishlistAddRequest !== lastHandled.current) {
      lastHandled.current = wishlistAddRequest;
      setOpen(true);
    }
  }, [wishlistAddRequest]);

  const handleSubmit = async (data: WishlistItemFormValues) => {
    try {
      await create(data);
      toast.success("Item wishlist tersimpan");
      setOpen(false);
    } catch (err) {
      console.error("Failed to create wishlist item:", err);
      toast.error("Gagal menyimpan. Coba lagi.");
    }
  };

  const handleAddCategory = () => {
    // WishlistItemForm udah call onClose() sebelum panggil ini, jadi sheet
    // udah ke-close. Flag ini buat re-open form item lagi pas user beres.
    setReopenAfterCategory(true);
    setShowCategoryForm(true);
  };

  const handleCategorySubmit = async (data: WishlistCategoryFormValues) => {
    try {
      await createCategory(data);
      setShowCategoryForm(false);
      if (reopenAfterCategory) {
        setReopenAfterCategory(false);
        // Slight delay biar transisi sheet ga ke-stack.
        setTimeout(() => setOpen(true), 200);
      }
    } catch (err) {
      console.error("Failed to create wishlist category:", err);
      toast.error("Gagal menyimpan kategori. Coba lagi.");
    }
  };

  return (
    <>
      <WishlistItemForm
        open={open}
        onClose={() => setOpen(false)}
        editingItem={null}
        categories={categories}
        onSubmit={handleSubmit}
        onAddCategory={handleAddCategory}
      />

      <WishlistCategoryForm
        open={showCategoryForm}
        onClose={() => {
          setShowCategoryForm(false);
          // Kalau user batal add category, re-open item form supaya alur
          // user nggak hilang.
          if (reopenAfterCategory) {
            setReopenAfterCategory(false);
            setTimeout(() => setOpen(true), 200);
          }
        }}
        editingCategory={null}
        onSubmit={handleCategorySubmit}
        isDuplicateName={isDuplicateName}
      />
    </>
  );
};
