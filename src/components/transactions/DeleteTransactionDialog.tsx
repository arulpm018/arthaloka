"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  transactionName: string;
  isLoading: boolean;
}

/**
 * Reusable confirmation dialog untuk menghapus transaksi (expense/income).
 *
 * Pure presentational — tidak melakukan Firestore call. Caller bertanggung jawab
 * meng-handle async operation di `onConfirm` dan mengontrol `isLoading`.
 */
export const DeleteTransactionDialog = ({
  open,
  onClose,
  onConfirm,
  transactionName,
  isLoading,
}: DeleteTransactionDialogProps) => {
  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Hapus Transaksi</DialogTitle>
          <DialogDescription>
            Yakin ingin menghapus transaksi{" "}
            <strong>{transactionName}</strong>? Saldo akun akan dikembalikan.
            Aksi ini tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={isLoading}
            onClick={() => {
              void onConfirm();
            }}
          >
            {isLoading ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
