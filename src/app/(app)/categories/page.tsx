"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { CategoryList } from "@/components/categories/CategoryList";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { WishlistCategoryList } from "@/components/categories/WishlistCategoryList";
import { WishlistCategoryForm } from "@/components/wishlist/WishlistCategoryForm";
import { WishlistDeleteCategoryDialog } from "@/components/wishlist/WishlistDeleteCategoryDialog";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCategories } from "@/hooks/useCategories";
import { useWishlistCategories } from "@/hooks/useWishlistCategories";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";
import { useAppStore } from "@/store/useAppStore";
import { Category, BudgetScope } from "@/types";
import { WishlistCategory } from "@/types/wishlist";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { cn } from "@/lib/utils/cn";
import type { WishlistCategoryFormValues } from "@/lib/validations/wishlistCategory.schema";

type CategoryTab = "transaksi" | "wishlist";

const scopeTabs: { value: BudgetScope | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "arul", label: OWNER_LABELS["arul"] },
  { value: "fifi", label: OWNER_LABELS["fifi"] },
  { value: "shared", label: OWNER_LABELS["shared"] },
];

export default function CategoriesPage() {
  const router = useRouter();
  const { categories, isLoading } = useCategories();
  const {
    categories: wishlistCategories,
    isLoading: wishlistLoading,
    create: createWishlistCategory,
    update: updateWishlistCategory,
    deactivate: deactivateWishlistCategory,
    isDuplicateName: isWishlistDuplicateName,
  } = useWishlistCategories();
  const { selectedMonth, setSelectedMonth } = useAppStore();
  const { budgets } = useBudgetStatus(selectedMonth);

  // Tab state
  const [activeTab, setActiveTab] = useState<CategoryTab>("transaksi");

  // Regular category state
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeScope, setActiveScope] = useState<BudgetScope | "all">("all");

  // Wishlist category state
  const [wishlistFormOpen, setWishlistFormOpen] = useState(false);
  const [editingWishlistCategory, setEditingWishlistCategory] = useState<WishlistCategory | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<WishlistCategory | null>(null);

  // Build a map of categoryId -> spent amount
  const spendingMap: Record<string, number> = {};
  budgets.forEach((b) => {
    spendingMap[b.categoryId] = b.spent;
  });

  // Filter categories by scope
  const filteredCategories =
    activeScope === "all"
      ? categories
      : categories.filter((c) => c.budgetScope === activeScope);

  // Filter wishlist categories by scope
  const filteredWishlistCategories =
    activeScope === "all"
      ? wishlistCategories
      : wishlistCategories.filter((c) => c.owner === activeScope);

  const handleCategoryTap = (category: Category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleViewTransactions = (category: Category) => {
    router.push(`/transactions?categoryId=${category.categoryId}`);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingCategory(null);
  };

  // Wishlist category handlers
  const handleWishlistCategoryTap = (category: WishlistCategory) => {
    setEditingWishlistCategory(category);
    setWishlistFormOpen(true);
  };

  const handleWishlistFormClose = () => {
    setWishlistFormOpen(false);
    setEditingWishlistCategory(null);
  };

  const handleWishlistCategorySubmit = async (data: WishlistCategoryFormValues) => {
    try {
      if (editingWishlistCategory) {
        await updateWishlistCategory(editingWishlistCategory.categoryId, data);
        toast.success("Kategori wishlist berhasil diperbarui");
      } else {
        await createWishlistCategory(data);
        toast.success("Kategori wishlist berhasil ditambahkan");
      }
      handleWishlistFormClose();
    } catch {
      toast.error("Gagal menyimpan kategori. Coba lagi.");
    }
  };

  const handleDeleteWishlistCategory = (category: WishlistCategory) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async (categoryId: string) => {
    try {
      await deactivateWishlistCategory(categoryId);
      toast.success("Kategori wishlist berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus kategori. Coba lagi.");
      throw new Error("Delete failed");
    }
  };

  const handleAddClick = () => {
    if (activeTab === "transaksi") {
      setFormOpen(true);
    } else {
      setWishlistFormOpen(true);
    }
  };

  return (
    <>
      <Header title="Kategori">
        {activeTab === "transaksi" && (
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        )}
      </Header>
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Main Tabs: Transaksi / Wishlist */}
        <div className="flex gap-1 bg-accent/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("transaksi")}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "transaksi"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Transaksi
          </button>
          <button
            onClick={() => setActiveTab("wishlist")}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "wishlist"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Wishlist
          </button>
        </div>

        {/* Scope Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {scopeTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveScope(tab.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeScope === tab.value
                  ? "bg-foreground text-background"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "transaksi" ? (
          // Regular categories
          <>
            {isLoading ? (
              <LoadingState variant="list" count={8} />
            ) : filteredCategories.length === 0 ? (
              <EmptyState
                icon={Tag}
                title={
                  activeScope === "all"
                    ? "Belum ada kategori"
                    : `Belum ada kategori untuk ${scopeTabs.find((t) => t.value === activeScope)?.label}`
                }
                description="Tambahkan kategori pengeluaran/pemasukan"
                action={
                  <Button size="sm" onClick={() => setFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah
                  </Button>
                }
              />
            ) : (
              <CategoryList
                categories={filteredCategories}
                spendingMap={spendingMap}
                onCategoryTap={handleCategoryTap}
                onViewTransactions={handleViewTransactions}
                showScope={activeScope === "all"}
              />
            )}
          </>
        ) : (
          // Wishlist categories
          <>
            {wishlistLoading ? (
              <LoadingState variant="list" count={6} />
            ) : filteredWishlistCategories.length === 0 ? (
              <EmptyState
                icon={Tag}
                title={
                  activeScope === "all"
                    ? "Belum ada kategori wishlist"
                    : `Belum ada kategori wishlist untuk ${scopeTabs.find((t) => t.value === activeScope)?.label}`
                }
                description="Tambahkan kategori untuk wishlist kamu"
                action={
                  <Button size="sm" onClick={() => setWishlistFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah
                  </Button>
                }
              />
            ) : (
              <WishlistCategoryList
                categories={filteredWishlistCategories}
                onCategoryTap={handleWishlistCategoryTap}
                showOwner={activeScope === "all"}
              />
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <Button
        size="sm"
        className="fixed bottom-24 right-4 rounded-full shadow-lg"
        onClick={handleAddClick}
      >
        <Plus className="h-4 w-4 mr-1" />
        Tambah
      </Button>

      {/* Regular Category Form */}
      <CategoryForm
        open={formOpen}
        onClose={handleClose}
        editingCategory={editingCategory}
      />

      {/* Wishlist Category Form */}
      <WishlistCategoryForm
        open={wishlistFormOpen}
        onClose={handleWishlistFormClose}
        editingCategory={editingWishlistCategory}
        onSubmit={handleWishlistCategorySubmit}
        isDuplicateName={isWishlistDuplicateName}
        onDelete={handleDeleteWishlistCategory}
      />

      {/* Delete Wishlist Category Dialog */}
      <WishlistDeleteCategoryDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        category={categoryToDelete}
        itemCount={0}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
