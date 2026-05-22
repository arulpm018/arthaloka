"use client";

import { useState, useCallback } from "react";
import { Plus, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { WishlistProgressSummary } from "@/components/wishlist/WishlistProgressSummary";
import { WishlistFilterBar } from "@/components/wishlist/WishlistFilterBar";
import { WishlistCategorySection } from "@/components/wishlist/WishlistCategorySection";
import { WishlistEmptyState } from "@/components/wishlist/WishlistEmptyState";
import { WishlistSkeleton } from "@/components/wishlist/WishlistSkeleton";
import { WishlistItemForm } from "@/components/wishlist/WishlistItemForm";
import { WishlistCategoryForm } from "@/components/wishlist/WishlistCategoryForm";
import { WishlistDeleteCategoryDialog } from "@/components/wishlist/WishlistDeleteCategoryDialog";
import { useWishlistItems } from "@/hooks/useWishlistItems";
import { useWishlistCategories } from "@/hooks/useWishlistCategories";
import { useWishlistProgress } from "@/hooks/useWishlistProgress";
import { filterByOwner, groupItemsByCategory } from "@/lib/utils/wishlist";
import type { OwnerFilter, WishlistItem, WishlistCategory } from "@/types/wishlist";
import type { WishlistItemFormValues } from "@/lib/validations/wishlistItem.schema";
import type { WishlistCategoryFormValues } from "@/lib/validations/wishlistCategory.schema";

export default function WishlistPage() {
  // Filter state
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");

  // Form states
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<WishlistCategory | null>(null);
  const [reopenItemFormAfterCategory, setReopenItemFormAfterCategory] = useState(false);

  // Delete category dialog state
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<WishlistCategory | null>(null);

  // Data hooks
  const { items, isLoading: itemsLoading, create, update, remove, togglePurchased } = useWishlistItems();
  const {
    categories,
    isLoading: categoriesLoading,
    create: createCategory,
    update: updateCategory,
    deactivate,
    isDuplicateName,
  } = useWishlistCategories();

  // Derived data
  const filteredItems = filterByOwner(items, ownerFilter);
  const groups = groupItemsByCategory(filteredItems, categories);
  const { overall } = useWishlistProgress(filteredItems);

  const isLoading = itemsLoading || categoriesLoading;

  // Optimistic toggle for purchase status
  const handleTogglePurchased = useCallback(
    async (item: WishlistItem) => {
      try {
        await togglePurchased(item);
      } catch {
        toast.error("Gagal mengubah status. Coba lagi.");
      }
    },
    [togglePurchased]
  );

  // Item form handlers
  const handleItemSubmit = async (data: WishlistItemFormValues) => {
    try {
      if (editingItem) {
        await update(editingItem.itemId, data);
        toast.success("Item berhasil diperbarui");
      } else {
        await create(data);
        toast.success("Item berhasil ditambahkan");
      }
      setShowItemForm(false);
      setEditingItem(null);
    } catch {
      toast.error("Gagal menyimpan. Coba lagi.");
    }
  };

  const handleItemDelete = async (itemId: string) => {
    try {
      await remove(itemId);
      toast.success("Item berhasil dihapus");
      setShowItemForm(false);
      setEditingItem(null);
    } catch {
      toast.error("Gagal menghapus. Coba lagi.");
    }
  };

  // Category form handlers
  const handleCategorySubmit = async (data: WishlistCategoryFormValues) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.categoryId, data);
      } else {
        await createCategory(data);
      }
      setShowCategoryForm(false);
      setEditingCategory(null);
      // Re-open item form if category was added from there
      if (reopenItemFormAfterCategory) {
        setReopenItemFormAfterCategory(false);
        setTimeout(() => setShowItemForm(true), 300);
      }
    } catch {
      toast.error("Gagal menyimpan kategori. Coba lagi.");
    }
  };

  // Open edit forms
  const handleEditItem = (item: WishlistItem) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleEditCategory = (category: WishlistCategory) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  // Open add item form
  const handleAddItem = () => {
    setEditingItem(null);
    setShowItemForm(true);
  };

  // Open add category form
  const handleAddCategory = () => {
    setEditingCategory(null);
    setShowCategoryForm(true);
  };

  // Delete category handler — opens confirmation dialog
  const handleDeleteCategory = (category: WishlistCategory) => {
    setCategoryToDelete(category);
    setShowDeleteCategoryDialog(true);
  };

  const handleConfirmDeleteCategory = async (categoryId: string) => {
    try {
      await deactivate(categoryId);
      toast.success("Kategori berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus kategori. Coba lagi.");
      throw new Error("Delete failed");
    }
  };

  // Count items in the category being deleted
  const deleteCategoryItemCount = categoryToDelete
    ? items.filter((item) => item.categoryId === categoryToDelete.categoryId).length
    : 0;

  return (
    <>
      <Header title="Wishlist" />

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {isLoading ? (
          <WishlistSkeleton />
        ) : (
          <>
            {items.length > 0 && (
              <WishlistProgressSummary
                purchasedCount={overall.purchasedCount}
                totalCount={overall.totalCount}
                purchasedAmount={overall.purchasedAmount}
                totalAmount={overall.totalAmount}
              />
            )}

            <WishlistFilterBar
              activeFilter={ownerFilter}
              onChange={setOwnerFilter}
            />

            {/* Tambah Kategori button */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleAddCategory}
              >
                <FolderPlus className="h-3.5 w-3.5 mr-1" />
                Tambah Kategori
              </Button>
            </div>

            {groups.length > 0 ? (
              <div className="space-y-4">
                {groups.map((group) => (
                  <WishlistCategorySection
                    key={group.category.categoryId}
                    category={group.category}
                    items={group.items}
                    progress={group.progress}
                    onTogglePurchased={handleTogglePurchased}
                    onEditItem={handleEditItem}
                    onEditCategory={handleEditCategory}
                  />
                ))}
              </div>
            ) : (
              <WishlistEmptyState onAddItem={handleAddItem} />
            )}
          </>
        )}
      </div>

      {/* FAB — floating action button */}
      <Button
        onClick={handleAddItem}
        className="fixed bottom-24 right-4 z-50 rounded-full h-14 w-14 shadow-lg"
        size="icon"
        aria-label="Tambah item wishlist"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Item Form (bottom sheet) */}
      <WishlistItemForm
        open={showItemForm}
        onClose={() => {
          setShowItemForm(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        categories={categories}
        onSubmit={handleItemSubmit}
        onDelete={handleItemDelete}
        onAddCategory={() => {
          setReopenItemFormAfterCategory(true);
          handleAddCategory();
        }}
      />

      {/* Category Form (bottom sheet) */}
      <WishlistCategoryForm
        open={showCategoryForm}
        onClose={() => {
          setShowCategoryForm(false);
          setEditingCategory(null);
        }}
        editingCategory={editingCategory}
        onSubmit={handleCategorySubmit}
        isDuplicateName={isDuplicateName}
        onDelete={handleDeleteCategory}
      />

      {/* Delete Category Confirmation Dialog */}
      <WishlistDeleteCategoryDialog
        open={showDeleteCategoryDialog}
        onOpenChange={setShowDeleteCategoryDialog}
        category={categoryToDelete}
        itemCount={deleteCategoryItemCount}
        onConfirm={handleConfirmDeleteCategory}
      />
    </>
  );
}
