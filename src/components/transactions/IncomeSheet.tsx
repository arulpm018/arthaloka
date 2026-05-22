"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp } from "firebase/firestore";
import { Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transactionSchema, TransactionFormValues } from "@/lib/validations/transaction.schema";
import { transactionsService } from "@/lib/firestore/transactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useAppStore } from "@/store/useAppStore";
import { AmountInput } from "@/components/shared/AmountInput";
import { CategoryGrid } from "@/components/categories/CategoryGrid";
import { CategoryFullGrid } from "@/components/categories/CategoryFullGrid";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { CreateTransactionInput } from "@/types";

export const IncomeSheet = () => {
  const { activeSheet, closeSheet, editingTransaction, currentUser } = useAppStore();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOpen = activeSheet === "income";
  const isEditing = !!editingTransaction && editingTransaction.type === "income";

  const incomeCategories = categories.filter(
    (c) => c.type === "income" || c.type === "both"
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      type: "income",
      name: "",
      amount: 0,
      accountId: "",
      accountName: "",
      categoryId: "",
      categoryName: "",
      categoryIcon: "",
      owner: currentUser?.role || "arul",
      ownerUid: currentUser?.uid || "",
      date: Timestamp.now(),
      note: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
      setSubmitSuccess(false);

      if (isEditing && editingTransaction) {
        reset({
          type: "income",
          name: editingTransaction.name,
          amount: editingTransaction.amount,
          accountId: editingTransaction.accountId,
          accountName: editingTransaction.accountName,
          categoryId: editingTransaction.categoryId,
          categoryName: editingTransaction.categoryName,
          categoryIcon: editingTransaction.categoryIcon,
          owner: editingTransaction.owner,
          ownerUid: editingTransaction.ownerUid,
          date: editingTransaction.date,
          note: editingTransaction.note || "",
        });
      } else {
        const defaultAccount =
          accounts.find(
            (a) => a.accountId === currentUser?.preferences?.defaultAccountId
          ) || accounts[0];
        reset({
          type: "income",
          name: "",
          amount: 0,
          accountId: defaultAccount?.accountId || "",
          accountName: defaultAccount?.name || "",
          categoryId: "",
          categoryName: "",
          categoryIcon: "",
          owner: currentUser?.role || "arul",
          ownerUid: currentUser?.uid || "",
          date: Timestamp.now(),
          note: "",
        });
      }
    }
  }, [isOpen, isEditing, editingTransaction, accounts, currentUser, reset]);

  const onSubmit = async (data: TransactionFormValues) => {
    try {
      setSubmitError(null);
      if (isEditing && editingTransaction) {
        await transactionsService.update(
          editingTransaction.transactionId,
          editingTransaction,
          data
        );
      } else {
        await transactionsService.create(data as unknown as CreateTransactionInput);
      }
      setSubmitSuccess(true);
      setTimeout(() => {
        closeSheet();
        setSubmitSuccess(false);
      }, 800);
    } catch (error) {
      console.error("Failed to save income:", error);
      setSubmitError("Gagal menyimpan. Coba lagi.");
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    const cat = categories.find((c) => c.categoryId === categoryId);
    if (cat) {
      setValue("categoryId", cat.categoryId);
      setValue("categoryName", cat.name);
      setValue("categoryIcon", cat.icon);
    }
  };

  const handleAccountChange = (accountId: string) => {
    const acc = accounts.find((a) => a.accountId === accountId);
    if (acc) {
      setValue("accountId", acc.accountId);
      setValue("accountName", acc.name);
    }
  };

  const handleDelete = async () => {
    if (!editingTransaction) return;
    setIsDeleting(true);
    try {
      await transactionsService.delete(editingTransaction);
      setDeleteDialogOpen(false);
      closeSheet();
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedOwner = watch("owner");
  const filteredAccounts = accounts.filter(
    (a) => a.owner === selectedOwner || a.owner === "shared"
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={() => closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isEditing ? "Edit Pemasukan" : "Tambah Pemasukan"}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Jumlah</label>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <AmountInput
                    value={field.value}
                    onChange={field.onChange}
                    autoFocus={!isEditing}
                  />
                )}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Keterangan</label>
              <Input placeholder="Gajian, freelance, dll" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Category Quick Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Kategori</label>
                <button
                  type="button"
                  onClick={() => setCategoryFormOpen(true)}
                  className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Tambah
                </button>
              </div>
              <CategoryGrid
                categories={incomeCategories}
                selected={watch("categoryId") || null}
                onSelect={handleCategorySelect}
                quickOnly
              />
              <button
                type="button"
                onClick={() => setShowAllCategories(true)}
                className="text-xs text-muted-foreground underline"
              >
                Lihat semua kategori →
              </button>
              {errors.categoryId && (
                <p className="text-xs text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            {/* Owner */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pemilik</label>
              <Select
                value={selectedOwner}
                onValueChange={(val) => setValue("owner", val as TransactionFormValues["owner"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arul">Arul</SelectItem>
                  <SelectItem value="fifi">Fifi</SelectItem>
                  <SelectItem value="shared">Together</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account (Ke Akun) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ke Akun</label>
              <Select
                value={watch("accountId")}
                onValueChange={handleAccountChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map((acc) => (
                    <SelectItem key={acc.accountId} value={acc.accountId}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountId && (
                <p className="text-xs text-destructive">{errors.accountId.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tanggal</label>
              <Input
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setValue("date", Timestamp.fromDate(new Date(e.target.value)))
                }
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Catatan (opsional)</label>
              <Input placeholder="Catatan tambahan" {...register("note")} />
            </div>

            {/* Error message */}
            {submitError && (
              <p className="text-sm text-destructive text-center">{submitError}</p>
            )}

            {/* Success message */}
            {submitSuccess && (
              <p className="text-sm text-income text-center">
                {isEditing ? "Perubahan tersimpan ✓" : "Pemasukan tersimpan ✓"}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-income hover:bg-income/90 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Menyimpan..."
                : isEditing
                  ? "Simpan Perubahan"
                  : "Simpan Pemasukan"}
            </Button>

            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus Transaksi
              </Button>
            )}
          </form>
        </SheetContent>
      </Sheet>

      <CategoryFullGrid
        open={showAllCategories}
        onClose={() => setShowAllCategories(false)}
        categories={incomeCategories}
        selected={watch("categoryId") || null}
        onSelect={handleCategorySelect}
      />

      <CategoryForm
        open={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Hapus Transaksi</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus transaksi <strong>{editingTransaction?.name}</strong>? 
              Saldo akun akan dikembalikan. Aksi ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
