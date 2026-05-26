"use client";

import { useState, useEffect } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { Account } from "@/types";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useAppStore } from "@/store/useAppStore";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

interface AccountDetailSheetProps {
  open: boolean;
  onClose: () => void;
  account: Account | null;
  onEdit: (account: Account) => void;
}

export const AccountDetailSheet = ({
  open,
  onClose,
  account,
  onEdit,
}: AccountDetailSheetProps) => {
  const { selectedMonth, openSheet } = useAppStore();
  const { deactivate } = useAccounts();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch transactions for this account in the selected month
  const { transactions, isLoading: txLoading } = useTransactions({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
    owner: account?.owner,
    accountId: account?.accountId,
  });

  // Filter transactions by accountId (since useTransactions might not support accountId filter)
  const accountTransactions = transactions.filter(
    (tx) => tx.accountId === account?.accountId
  );

  const incomeTotal = accountTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const expenseTotal = accountTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Reset confirm name when dialog closes
  useEffect(() => {
    if (!deleteDialogOpen) {
      setConfirmName("");
    }
  }, [deleteDialogOpen]);

  const handleDelete = async () => {
    if (!account || confirmName !== account.name) return;

    setIsDeleting(true);
    try {
      await deactivate(account.accountId);
      setDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      console.error("Failed to delete account:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!account) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent side="bottom" className="rounded-t-sheet max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{account.name}</SheetTitle>
            <SheetDescription>Detail akun dan riwayat transaksi</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-5">
            {/* Account Info */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="text-xl font-mono font-semibold tabular-nums">
                    {formatCurrency(account.balance)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onEdit(account);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Tipe</p>
                  <p className="font-medium capitalize">{account.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pemilik</p>
                  <p className="font-medium capitalize">
                    {account.owner === "shared" ? OWNER_LABELS["shared"] : account.owner}
                  </p>
                </div>
              </div>

              {account.note && (
                <div>
                  <p className="text-xs text-muted-foreground">Catatan</p>
                  <p className="text-sm">{account.note}</p>
                </div>
              )}
            </div>

            {/* Income & Expense Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Pemasukan</p>
                <p className="text-sm font-mono font-semibold text-income tabular-nums">
                  +{formatCurrency(incomeTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Pengeluaran</p>
                <p className="text-sm font-mono font-semibold text-expense tabular-nums">
                  -{formatCurrency(expenseTotal)}
                </p>
              </div>
            </div>

            {/* Transactions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                Transaksi Bulan Ini ({accountTransactions.length})
              </h4>
              {txLoading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Memuat transaksi...
                </p>
              ) : accountTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Belum ada transaksi di akun ini
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {accountTransactions.map((tx) => (
                    <TransactionItem
                      key={tx.transactionId}
                      transaction={tx}
                      onTap={() => {
                        onClose();
                        openSheet(tx.type, tx);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Delete Button */}
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Akun
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Hapus Akun</DialogTitle>
            <DialogDescription>
              Aksi ini akan menonaktifkan akun <strong>{account.name}</strong>.
              Ketik nama akun untuk konfirmasi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              placeholder={`Ketik "${account.name}" untuk konfirmasi`}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoComplete="off"
            />
            <p
              className={cn(
                "text-xs",
                confirmName === account.name
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {confirmName === account.name
                ? "Nama cocok. Klik hapus untuk melanjutkan."
                : "Nama belum cocok."}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={confirmName !== account.name || isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Menghapus..." : "Hapus Akun"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
