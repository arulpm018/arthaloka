"use client";

import { useState } from "react";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { CategoryList } from "@/components/categories/CategoryList";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCategories } from "@/hooks/useCategories";
import { Category } from "@/types";

export default function CategoriesPage() {
  const { categories, isLoading } = useCategories();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleCategoryTap = (category: Category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingCategory(null);
  };

  return (
    <>
      <Header title="Kategori">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah
        </Button>
      </Header>
      <div className="p-4 max-w-4xl mx-auto">
        {isLoading ? (
          <LoadingState variant="list" count={8} />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Belum ada kategori"
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
            categories={categories}
            onCategoryTap={handleCategoryTap}
          />
        )}
      </div>
      <CategoryForm
        open={formOpen}
        onClose={handleClose}
        editingCategory={editingCategory}
      />
    </>
  );
}
