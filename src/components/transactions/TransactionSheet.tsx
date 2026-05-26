"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp, serverTimestamp } from "firebase/firestore";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  transactionSchema,
  TransactionFormValues,
} from "@/lib/validations/transaction.schema";
import { transactionsService } from "@/lib/firestore/transactions";
import { wishlistItemsService } from "@/lib/firestore/wishlistItems";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useAppStore } from "@/store/useAppStore";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { AmountInput } from "@/components/shared/AmountInput";
import { CategoryGrid } from "@/components/categories/CategoryGrid";
import { CategoryFullGrid } from "@/components/categories/CategoryFullGrid";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { DeleteTransactionDialog } from "@/components/transactions/DeleteTransactionDialog";
import { CreateTransactionInput, Category } from "@/types";

type TransactionMode = "expense" | "income";

interface ModeConfig {
  title: { create: string; edit: string };
  buttonClass: string;
  buttonLabel: { create: string; edit: string };
  accountLabel: string;
  namePlaceholder: string;
  categoryFilter: (category: Category) => boolean;
  successMessage: { create: string; edit: string };
}

const MODE_CONFIG: Record<TransactionMode, ModeConfig> = {
  expense: {
    title: { create: "Tambah Pengeluaran", edit: "Edit Pengeluaran" },
    buttonClass: "",
    buttonLabel: {
      create: "Simpan Pengeluaran",
      edit: "Simpan Perubahan",
    },
    accountLabel: "Akun",
    namePlaceholder: "Makan siang, bensin, dll",
    categoryFilter: (category) =>
      category.type === "expense" || category.type === "both",
    successMessage: {
      create: "Pengeluaran tersimpan",
      edit: "Perubahan tersimpan",
    },
  },
  income: {
    title: { create: "Tambah Pemasukan", edit: "Edit Pemasukan" },
    buttonClass: "bg-income hover:bg-income/90 text-white",
    buttonLabel: {
      create: "Simpan Pemasukan",
      edit: "Simpan Perubahan",
    },
    accountLabel: "Ke Akun",
    namePlaceholder: "Gajian, freelance, dll",
    categoryFilter: (category) =>
      category.type === "income" || category.type === "both",
    successMessage: {
      create: "Pemasukan tersimpan",
      edit: "Perubahan tersimpan",
    },
  },
};

interface TransactionSheetProps {
  mode: TransactionMode;
}

/**
 * Polymorphic bottom sheet untuk menambah/mengedit transaksi expense atau income.
 *
 * Menggantikan duplikasi V1 (`ExpenseSheet` + `IncomeSheet`). Behaviour mode-spesifik
 * di-driven oleh `MODE_CONFIG[mode]`.
 *
 * Submit pattern (per AC3):
 * - `await` service call dulu, baru `closeSheet()`.
 * - Sukses: `toast.success(...)` lalu close.
 * - Gagal: `toast.error(...)`, sheet tetap open dengan form data preserved.
 */
export const TransactionSheet = ({ mode }: TransactionSheetProps) => {
  const config = MODE_CONFIG[mode];
  const {
    activeSheet,
    closeSheet,
    editingTransaction,
    currentUser,
    defaultOwner,
    prefillData,
    prefillSource,
  } = useAppStore();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOpen = activeSheet === mode;
  const isEditing =
    !!editingTransaction && editingTransaction.type === mode;

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
      owner: currentUser?.role || "arul",
      ownerUid: currentUser?.uid || "",
      date: Timestamp.now(),
      note: "",
    },
  });

  const selectedOwner = watch("owner");
  const selectedAccountId = watch("accountId");

  const filteredCategories = categories.filter(
    (c) => config.categoryFilter(c) && c.budgetScope === selectedOwner
  );
  const filteredAccounts = accounts.filter((a) => a.owner === selectedOwner);

  // Reset form saat sheet open / mode / editing target berubah.
  useEffect(() => {
    if (!isOpen) return;

    if (isEditing && editingTransaction) {
      reset({
        type: mode,
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
      // Owner: prefill (e.g. wishlist item.owner) wins over defaultOwner.
      const ownerDefault =
        prefillData?.owner ?? defaultOwner ?? currentUser?.role ?? "arul";
      // Account default uses the user's preferred account, falling back to
      // the first account that matches the resolved owner. The prefill flow
      // (wishlist) intentionally does not pre-select an account.
      const defaultAccount =
        accounts.find(
          (a) => a.accountId === currentUser?.preferences?.defaultAccountId
        ) || accounts.find((a) => a.owner === ownerDefault) || accounts[0];
      reset({
        type: mode,
        name: prefillData?.name ?? "",
        amount: prefillData?.amount ?? 0,
        accountId: defaultAccount?.accountId || "",
        accountName: defaultAccount?.name || "",
        categoryId: "",
        categoryName: "",
        categoryIcon: "",
        owner: ownerDefault,
        ownerUid: currentUser?.uid || "",
        date: Timestamp.now(),
        note: "",
      });
    }
  }, [
    isOpen,
    isEditing,
    editingTransaction,
    accounts,
    currentUser,
    defaultOwner,
    mode,
    prefillData,
    reset,
  ]);

  // Reset accountId saat owner berubah dan account current tidak match.
  // Mencegah silent invalid state (account dari owner lain ter-pick).
  useEffect(() => {
    if (!isOpen) return;
    if (!selectedAccountId) return;
    const current = accounts.find((a) => a.accountId === selectedAccountId);
    if (current && current.owner !== selectedOwner) {
      setValue("accountId", "", { shouldValidate: false });
      setValue("accountName", "", { shouldValidate: false });
    }
  }, [selectedOwner, selectedAccountId, accounts, isOpen, setValue]);

  const onSubmit = async (data: TransactionFormValues) => {
    try {
      if (isEditing && editingTransaction) {
        await transactionsService.update(
          editingTransaction.transactionId,
          editingTransaction,
          data
        );
        toast.success(config.successMessage.edit);
      } else {
        const newTxId = await transactionsService.create(
          data as unknown as CreateTransactionInput
        );

        // Cross-feature side effect: when this create flow originated from a
        // wishlist item, mark the item as purchased and link the new
        // transaction id back to it. We swallow errors here so the success
        // toast for the transaction itself isn't blocked — the transaction
        // already saved successfully.
        if (prefillSource?.type === "wishlist") {
          try {
            await wishlistItemsService.update(prefillSource.itemId, {
              isPurchased: true,
              purchasedAt: serverTimestamp() as unknown as Timestamp,
              linkedTransactionId: newTxId,
            });
          } catch (linkError) {
            console.error(
              "Failed to link wishlist item to transaction:",
              linkError
            );
            toast.error("Transaksi tersimpan, tapi gagal update wishlist.");
          }
        }

        toast.success(config.successMessage.create);
      }
      closeSheet();
    } catch (error) {
      console.error(`Failed to save ${mode}:`, error);
      toast.error("Gagal menyimpan. Coba lagi.");
      // Sheet stays open dengan form data preserved untuk retry
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    const cat = categories.find((c) => c.categoryId === categoryId);
    if (cat) {
      setValue("categoryId", cat.categoryId, { shouldValidate: true });
      setValue("categoryName", cat.name);
      setValue("categoryIcon", cat.icon);
    }
  };

  const handleAccountChange = (accountId: string) => {
    const acc = accounts.find((a) => a.accountId === accountId);
    if (acc) {
      setValue("accountId", acc.accountId, { shouldValidate: true });
      setValue("accountName", acc.name);
    }
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
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[90vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              {isEditing ? config.title.edit : config.title.create}
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
                <p className="text-xs text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Keterangan</label>
              <Input
                placeholder={config.namePlaceholder}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
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
                categories={filteredCategories}
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
                <p className="text-xs text-destructive">
                  {errors.categoryId.message}
                </p>
              )}
            </div>

            {/* Owner */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pemilik</label>
              <Select
                value={selectedOwner}
                onValueChange={(val) =>
                  setValue("owner", val as TransactionFormValues["owner"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arul">{OWNER_LABELS.arul}</SelectItem>
                  <SelectItem value="fifi">{OWNER_LABELS.fifi}</SelectItem>
                  <SelectItem value="shared">
                    {OWNER_LABELS.shared}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {config.accountLabel}
              </label>
              <Select
                value={selectedAccountId || ""}
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
                <p className="text-xs text-destructive">
                  {errors.accountId.message}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tanggal</label>
              <Input
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setValue(
                    "date",
                    Timestamp.fromDate(new Date(e.target.value))
                  )
                }
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Catatan (opsional)
              </label>
              <Input
                placeholder="Catatan tambahan"
                {...register("note")}
              />
            </div>

            <Button
              type="submit"
              className={`w-full ${config.buttonClass}`}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Menyimpan..."
                : isEditing
                  ? config.buttonLabel.edit
                  : config.buttonLabel.create}
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
        categories={filteredCategories}
        selected={watch("categoryId") || null}
        onSelect={handleCategorySelect}
      />

      <CategoryForm
        open={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
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
