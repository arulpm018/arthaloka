"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { useCategoryUsage } from "@/hooks/useCategoryUsage";
import { useAppStore } from "@/store/useAppStore";
import { OWNER_LABELS } from "@/lib/constants/labels";
import {
  pickVisibleCategories,
  readLastAccountId,
  resolveDefaultAccountId,
  resolveTransactionName,
  sortCategoriesByUsage,
  writeLastAccountId,
} from "@/lib/utils/entryDefaults";
import { AmountInput } from "@/components/shared/AmountInput";
import { CategoryGrid } from "@/components/categories/CategoryGrid";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { DeleteTransactionDialog } from "@/components/transactions/DeleteTransactionDialog";
import { EntryTypeTabs } from "@/components/transactions/EntryTypeTabs";
import { CreateTransactionInput, TransactionType } from "@/types";

const VISIBLE_CATEGORIES = 8;

const MODE_COPY: Record<TransactionType, { title: string; editTitle: string; success: string }> = {
  expense: { title: "Catat Pengeluaran", editTitle: "Edit Pengeluaran", success: "Pengeluaran tersimpan" },
  income: { title: "Catat Pemasukan", editTitle: "Edit Pemasukan", success: "Pemasukan tersimpan" },
};

const toDateInput = (ts: Timestamp) => format(ts.toDate(), "yyyy-MM-dd");

/**
 * Sheet catat/edit pengeluaran & pemasukan — satu instance untuk dua mode
 * (mengikuti `activeSheet`). Wajib diisi cuma nominal + kategori; rekening,
 * tanggal & catatan sudah terisi default. Pemilik transaksi = pemilik rekening.
 */
export const TransactionSheet = () => {
  const { activeSheet, closeSheet, editingTransaction, currentUser } = useAppStore();
  const isOpen = activeSheet === "expense" || activeSheet === "income";
  const mode: TransactionType = activeSheet === "income" ? "income" : "expense";
  const isEditing = !!editingTransaction;
  const copy = MODE_COPY[mode];

  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const usage = useCategoryUsage();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: mode,
      name: "",
      amount: 0,
      accountId: "",
      accountName: "",
      categoryId: "",
      categoryName: "",
      categoryIcon: "",
      date: Timestamp.now(),
      note: "",
    },
  });

  const selectedCategoryId = watch("categoryId");
  const selectedAccountId = watch("accountId");
  const date = watch("date") as Timestamp | undefined;

  const sortedCategories = useMemo(
    () => sortCategoriesByUsage(categories.filter((c) => c.type === mode || c.type === "both"), usage),
    [categories, mode, usage]
  );
  const visibleCategories = pickVisibleCategories(
    sortedCategories,
    selectedCategoryId || null,
    showAllCategories,
    VISIBLE_CATEGORIES
  );

  // Reset form HANYA saat sheet dibuka / ganti mode / ganti target edit —
  // bukan tiap snapshot rekening berubah (mis. pasangan baru mencatat),
  // supaya isian yang sedang diketik tidak hilang.
  const initKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      initKeyRef.current = null;
      return;
    }
    const key = `${mode}:${editingTransaction?.transactionId ?? "new"}`;
    if (initKeyRef.current === key) return;
    if (!isEditing && accounts.length === 0) return; // tunggu rekening termuat
    initKeyRef.current = key;
    setShowAllCategories(false);

    if (isEditing && editingTransaction) {
      reset({
        type: editingTransaction.type,
        name: editingTransaction.name,
        amount: editingTransaction.amount,
        accountId: editingTransaction.accountId,
        accountName: editingTransaction.accountName,
        categoryId: editingTransaction.categoryId,
        categoryName: editingTransaction.categoryName,
        categoryIcon: editingTransaction.categoryIcon,
        date: editingTransaction.date,
        note: editingTransaction.note || "",
      });
      return;
    }

    const accountId = resolveDefaultAccountId(accounts, readLastAccountId(), currentUser?.role);
    const account = accounts.find((a) => a.accountId === accountId);
    reset({
      type: mode,
      name: "",
      amount: 0,
      accountId: account?.accountId ?? "",
      accountName: account?.name ?? "",
      categoryId: "",
      categoryName: "",
      categoryIcon: "",
      date: Timestamp.now(),
      note: "",
    });
  }, [isOpen, mode, isEditing, editingTransaction, accounts, currentUser, reset]);

  const onSubmit = async (data: TransactionFormValues) => {
    const account = accounts.find((a) => a.accountId === data.accountId);
    if (!account) {
      toast.error("Pilih rekening dulu");
      return;
    }
    const name = resolveTransactionName(data.name, data.categoryName);

    try {
      if (isEditing && editingTransaction) {
        await transactionsService.update(editingTransaction.transactionId, editingTransaction, {
          ...data,
          name,
          owner: account.owner,
        });
        toast.success("Perubahan tersimpan");
      } else {
        const input: CreateTransactionInput = {
          ...data,
          type: mode,
          name,
          date: data.date as Timestamp,
          owner: account.owner,
          ownerUid: currentUser?.uid ?? "",
        };
        await transactionsService.create(input);
        writeLastAccountId(account.accountId);
        toast.success(copy.success);
      }
      closeSheet();
    } catch (error) {
      console.error("Failed to save transaction:", error);
      toast.error("Gagal menyimpan. Coba lagi.");
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    const cat = categories.find((c) => c.categoryId === categoryId);
    if (!cat) return;
    setValue("categoryId", cat.categoryId, { shouldValidate: true });
    setValue("categoryName", cat.name);
    setValue("categoryIcon", cat.icon);
  };

  const handleAccountChange = (accountId: string) => {
    const acc = accounts.find((a) => a.accountId === accountId);
    if (!acc) return;
    setValue("accountId", acc.accountId, { shouldValidate: true });
    setValue("accountName", acc.name);
  };

  const handleDelete = async () => {
    if (!editingTransaction) return;
    setIsDeleting(true);
    try {
      await transactionsService.delete(editingTransaction);
      toast.success("Transaksi dihapus");
      setDeleteDialogOpen(false);
      closeSheet();
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      toast.error("Gagal menghapus. Coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(next) => !next && closeSheet()}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{isEditing ? copy.editTitle : copy.title}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-4">
            {!isEditing && <EntryTypeTabs value={mode} />}

            <div className="space-y-1">
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <AmountInput value={field.value} onChange={field.onChange} autoFocus={!isEditing} size="lg" />
                )}
              />
              {errors.amount && (
                <p className="text-center text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <CategoryGrid
                categories={visibleCategories}
                selected={selectedCategoryId || null}
                onSelect={handleCategorySelect}
              />
              <div className="flex items-center justify-between text-xs">
                {sortedCategories.length > VISIBLE_CATEGORIES ? (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((v) => !v)}
                    className="font-medium text-muted-foreground hover:text-foreground"
                  >
                    {showAllCategories ? "Tampilkan lebih sedikit" : `Semua kategori (${sortedCategories.length})`}
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => setCategoryFormOpen(true)}
                  className="flex items-center gap-0.5 font-medium text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Kategori baru
                </button>
              </div>
              {errors.categoryId && (
                <p className="text-xs text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedAccountId || ""} onValueChange={handleAccountChange}>
                <SelectTrigger aria-label="Rekening" className="h-9 rounded-full text-xs">
                  <SelectValue placeholder="Pilih rekening" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.accountId} value={acc.accountId}>
                      {acc.name} · {OWNER_LABELS[acc.owner]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                aria-label="Tanggal"
                className="h-9 rounded-full text-xs"
                value={date ? toDateInput(date) : ""}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setValue("date", Timestamp.fromDate(new Date(`${e.target.value}T12:00:00`)));
                }}
              />
            </div>
            {errors.accountId && (
              <p className="text-xs text-destructive">{errors.accountId.message}</p>
            )}

            <Input placeholder="Catatan (opsional)" aria-label="Catatan" {...register("name")} />

            <Button
              type="submit"
              className={mode === "income" ? "w-full bg-income text-white hover:bg-income/90" : "w-full"}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>

            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Transaksi
              </Button>
            )}
          </form>
        </SheetContent>
      </Sheet>

      <CategoryForm
        open={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
        defaultType={mode}
      />

      <DeleteTransactionDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        transactionName={editingTransaction?.name ?? ""}
        isLoading={isDeleting}
      />
    </>
  );
};
