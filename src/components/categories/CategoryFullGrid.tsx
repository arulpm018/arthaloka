"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CategoryGrid } from "./CategoryGrid";
import { Category } from "@/types";

interface CategoryFullGridProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  selected: string | null;
  onSelect: (categoryId: string) => void;
}

export const CategoryFullGrid = ({
  open,
  onClose,
  categories,
  selected,
  onSelect,
}: CategoryFullGridProps) => {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[70vh] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Pilih Kategori</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <CategoryGrid
            categories={categories}
            selected={selected}
            onSelect={(id) => {
              onSelect(id);
              onClose();
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
