"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { WishlistProgressSummary } from "@/components/wishlist/WishlistProgressSummary";
import { WishlistFilterBar } from "@/components/wishlist/WishlistFilterBar";
import { WishlistCategorySection } from "@/components/wishlist/WishlistCategorySection";
import { WishlistEmptyState } from "@/components/wishlist/WishlistEmptyState";
import { WishlistSkeleton } from "@/components/wishlist/WishlistSkeleton";
import { WishlistItemForm } from "@/components/wishlist/WishlistItemForm";
import { WishlistCategoryForm } from "@/components/wishlist/WishlistCategoryForm";
import { WishlistDeleteCategoryDialog } from "@/components/wishlist/WishlistDeleteCategoryDialog";
import { WishlistDeleteItemDialog } from "@/components/wishlist/WishlistDeleteItemDialog";
import { WishlistCelebrationDialog } from "@/components/wishlist/WishlistCelebrationDialog";
import { useWishlistItems } from "@/hooks/useWishlistItems";
import { useWishlistCategories } from "@/hooks/useWishlistCategories";
import { useWishlistProgress } from "@/hooks/useWishlistProgress";
import { useAppStore } from "@/store/useAppStore";
import { filterByOwner, groupItemsByCategory } from "@/lib/utils/wishlist";
import type { OwnerFilter, WishlistItem, WishlistCategory } from "@/types/wishlist";
import type { WishlistItemFormValues } from "@/lib/validations/wishlistItem.schema";
import type { WishlistCategoryFormValues } from "@/lib/validations/wishlistCategory.schema";

const CELEBRATION_KEY_PREFIX = "arthafiloka.wishlistCelebrated:";

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

  // Delete item dialog state — wired by long-press menu on WishlistItemCard
  const [itemToDelete, setItemToDelete] = useState<WishlistItem | null>(null);

  // Celebration modal — muncul sekali saat progress transisi ke 100%.
  // Per-session via sessionStorage, namespaced by ownerFilter biar:
  //   - rayakan "all=100%" tetep ke-trigger meskipun dulu pernah rayain "arul=100%"
  //   - reload dengan progress sama tidak men-spam dialog
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const prevPercentageRef = useRef<number | null>(null);

  // Zustand action to open the global TransactionSheet with prefill +
  // wishlist source. The sheet handles the back-link (mark item purchased +
  // store linkedTransactionId) on submit success.
  const openSheetWithPrefill = useAppStore((s) => s.openSheetWithPrefill);

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

  // Trigger celebration modal sekali per session saat percentage hit 100%.
  // Dipake `useEffect` (bukan inline) supaya nggak race dengan state update.
  const overallPercentage =
    overall.totalCount > 0
      ? Math.round((overall.purchasedCount / overall.totalCount) * 100)
      : 0;

  useEffect(() => {
    if (isLoading || overall.totalCount === 0) return;

    const sessionKey = `${CELEBRATION_KEY_PREFIX}${ownerFilter}`;
    let celebratedThisSession = false;
    try {
      celebratedThisSession =
        typeof window !== "undefined" &&
        window.sessionStorage.getItem(sessionKey) === "1";
    } catch {
      /* ignore storage errors */
    }

    const prev = prevPercentageRef.current;
    const justHit100 = prev !== null && prev < 100 && overallPercentage === 100;
    const initialAt100 = prev === null && overallPercentage === 100;

    if ((justHit100 || initialAt100) && !celebratedThisSession) {
      setCelebrationOpen(true);
      try {
        window.sessionStorage.setItem(sessionKey, "1");
      } catch {
        /* ignore */
      }
    }

    prevPercentageRef.current = overallPercentage;
  }, [overallPercentage, overall.totalCount, isLoading, ownerFilter]);

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

  // Mark wishlist item as purchased AND record an expense in one flow.
  // We open the global expense TransactionSheet pre-filled with the item's
  // name/price/owner and tag the source so the sheet can mark the item
  // purchased + store `linkedTransactionId` after a successful save.
  const handleMarkWithExpense = useCallback(
    (item: WishlistItem) => {
      openSheetWithPrefill(
        "expense",
        {
          name: item.nama,
          amount: item.harga,
          owner: item.owner,
        },
        { type: "wishlist", itemId: item.itemId }
      );
    },
    [openSheetWithPrefill]
  );

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

  // Confirm delete from long-press menu (separate from delete-while-editing flow)
  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await remove(itemToDelete.itemId);
      toast.success("Item berhasil dihapus");
      setItemToDelete(null);
    } catch {
      toast.error("Gagal menghapus. Coba lagi.");
      throw new Error("Delete failed");
    }
  };

  return (
    <>
      <Header title="Wishlist" />

      <div className="p-4 space-y-5 max-w-4xl mx-auto pb-32">
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

            {/* Filter + Add Category row */}
            <div className="flex items-center justify-between gap-2">
              <WishlistFilterBar
                activeFilter={ownerFilter}
                onChange={setOwnerFilter}
              />
              <button
                onClick={handleAddCategory}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Tambah Kategori"
                aria-label="Tambah kategori"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
            </div>

            {groups.length > 0 ? (
              <div className="space-y-3">
                {groups.map((group) => (
                  <WishlistCategorySection
                    key={group.category.categoryId}
                    category={group.category}
                    items={group.items}
                    progress={group.progress}
                    onTogglePurchased={handleTogglePurchased}
                    onEditItem={handleEditItem}
                    onEditCategory={handleEditCategory}
                    onDeleteItem={(item) => setItemToDelete(item)}
                    onMarkPurchasedWithExpense={handleMarkWithExpense}
                  />
                ))}
              </div>
            ) : (
              <WishlistEmptyState onAddItem={handleAddItem} />
            )}
          </>
        )}
      </div>

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

      {/* Delete Item Confirmation Dialog (long-press menu) */}
      <WishlistDeleteItemDialog
        open={!!itemToDelete}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null);
        }}
        item={itemToDelete}
        onConfirm={handleConfirmDeleteItem}
      />

      {/* 100% celebration modal */}
      <WishlistCelebrationDialog
        open={celebrationOpen}
        onClose={() => setCelebrationOpen(false)}
        totalCount={overall.totalCount}
      />
    </>
  );
}
