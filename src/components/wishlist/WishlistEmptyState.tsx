"use client";

import { Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WishlistEmptyStateProps {
  onAddItem: () => void;
}

export const WishlistEmptyState = ({ onAddItem }: WishlistEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Heart className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium">Belum ada wishlist</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
        Tambahkan barang yang ingin kamu beli
      </p>
      <div className="mt-4">
        <Button size="sm" onClick={onAddItem}>
          <Plus className="h-4 w-4" />
          Tambah Item
        </Button>
      </div>
    </div>
  );
};
