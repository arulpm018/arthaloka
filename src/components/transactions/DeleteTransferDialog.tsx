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

interface DeleteTransferDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  transferName: string;
  isLoading: boolean;
}

export const DeleteTransferDialog = ({
  open,
  onClose,
  onConfirm,
  transferName,
  isLoading,
}: DeleteTransferDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Hapus Transfer</DialogTitle>
          <DialogDescription>
            Yakin ingin menghapus transfer <strong>{transferName}</strong>?
            Saldo kedua akun akan dikembalikan. Aksi ini tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={isLoading}
            onClick={() => onConfirm()}
          >
            {isLoading ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
