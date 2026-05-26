"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";

interface WishlistEmptyStateProps {
  onAddItem: () => void;
}

export const WishlistEmptyState = ({ onAddItem }: WishlistEmptyStateProps) => {
  return (
    <EmptyState
      meme="empty"
      title="Belum ada wishlist"
      description="Tambahkan barang yang ingin kamu beli"
      action={
        <Button size="sm" onClick={onAddItem}>
          <Plus className="h-4 w-4" />
          Tambah Item
        </Button>
      }
    />
  );
};
