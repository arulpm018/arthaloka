"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WishlistCategory } from "@/types/wishlist";

interface WishlistDeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: WishlistCategory | null;
  itemCount: number;
  onConfirm: (categoryId: string) => Promise<void>;
}

export const WishlistDeleteCategoryDialog = ({
  open,
  onOpenChange,
  category,
  itemCount,
  onConfirm,
}: WishlistDeleteCategoryDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!category) return;
    setIsDeleting(true);
    try {
      await onConfirm(category.categoryId);
      onOpenChange(false);
    } catch {
      // Error handling is done by the parent (toast)
    } finally {
      setIsDeleting(false);
    }
  };

  if (!category) return null;

  const hasItems = itemCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
          <AlertDialogDescription>
            {hasItems
              ? `Kategori "${category.name}" memiliki ${itemCount} item. Item-item tersebut akan menjadi tidak berkategori. Lanjutkan?`
              : `Hapus kategori "${category.name}"?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Menghapus..." : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
