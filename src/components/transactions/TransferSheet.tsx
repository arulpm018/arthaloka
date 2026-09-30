"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp } from "firebase/firestore";
import { Trash2 } from "lucide-react";
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
import { transferSchema, TransferFormValues } from "@/lib/validations/transfer.schema";
import { transfersService } from "@/lib/firestore/transfers";
import { useAccounts } from "@/hooks/useAccounts";
import { useAppStore } from "@/store/useAppStore";
import { AmountInput } from "@/components/shared/AmountInput";
import { DeleteTransferDialog } from "@/components/transactions/DeleteTransferDialog";
import { EntryTypeTabs } from "@/components/transactions/EntryTypeTabs";
import { readLastAccountId } from "@/lib/utils/entryDefaults";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { CreateTransferInput } from "@/types";

export const TransferSheet = () => {
  const { activeSheet, closeSheet, currentUser, editingTransfer } = useAppStore();
  const { accounts } = useAccounts();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOpen = activeSheet === "transfer";
  const isEditing = !!editingTransfer;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      name: "",
      amount: 0,
      fromAccountId: "",
      fromAccountName: "",
      fromAccountOwner: "shared",
      toAccountId: "",
      toAccountName: "",
      toAccountOwner: "shared",
      owner: "shared",
      ownerUid: currentUser?.uid || "",
      date: Timestamp.now(),
      note: "",
    },
  });

  // Reset hanya saat dibuka / ganti target edit (bukan tiap snapshot rekening).
  const initKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      initKeyRef.current = null;
      return;
    }
    const key = editingTransfer?.transferId ?? "new";
    if (initKeyRef.current === key) return;
    if (!isEditing && accounts.length === 0) return; // tunggu rekening termuat
    initKeyRef.current = key;

    if (isEditing && editingTransfer) {
      reset({
        name: editingTransfer.name,
        amount: editingTransfer.amount,
        fromAccountId: editingTransfer.fromAccountId,
        fromAccountName: editingTransfer.fromAccountName,
        fromAccountOwner: editingTransfer.fromAccountOwner,
        toAccountId: editingTransfer.toAccountId,
        toAccountName: editingTransfer.toAccountName,
        toAccountOwner: editingTransfer.toAccountOwner,
        owner: editingTransfer.owner,
        ownerUid: editingTransfer.ownerUid,
        date: editingTransfer.date,
        note: editingTransfer.note || "",
      });
      return;
    }

    const lastId = readLastAccountId();
    const from = accounts.find((a) => a.accountId === lastId);
    reset({
      name: "",
      amount: 0,
      fromAccountId: from?.accountId ?? "",
      fromAccountName: from?.name ?? "",
      fromAccountOwner: from?.owner ?? "shared",
      toAccountId: "",
      toAccountName: "",
      toAccountOwner: "shared",
      owner: from?.owner ?? "shared",
      ownerUid: currentUser?.uid || "",
      date: Timestamp.now(),
      note: "",
    });
  }, [isOpen, isEditing, editingTransfer, accounts, currentUser, reset]);

  const onSubmit = async (data: TransferFormValues) => {
    const payload = { ...data, name: data.name.trim() || "Transfer" };
    try {
      if (isEditing && editingTransfer) {
        await transfersService.update(
          editingTransfer.transferId,
          editingTransfer,
          payload as unknown as CreateTransferInput
        );
        toast.success("Perubahan tersimpan");
      } else {
        await transfersService.create(payload as unknown as CreateTransferInput);
        toast.success("Transfer tersimpan");
      }
      closeSheet();
    } catch (error) {
      console.error("Failed to save transfer:", error);
      toast.error("Gagal menyimpan. Coba lagi.");
      // Sheet stays open with form data preserved
    }
  };

  const handleDelete = async () => {
    if (!editingTransfer) return;
    setIsDeleting(true);
    try {
      await transfersService.delete(editingTransfer);
      toast.success("Transfer dihapus");
      setDeleteDialogOpen(false);
      closeSheet();
    } catch (error) {
      console.error("Failed to delete transfer:", error);
      toast.error("Gagal menghapus. Coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFromAccount = (id: string) => {
    const acc = accounts.find((a) => a.accountId === id);
    if (acc) {
      setValue("fromAccountId", id);
      setValue("fromAccountName", acc.name);
      setValue("fromAccountOwner", acc.owner);
      setValue("owner", acc.owner);
    }
  };

  const handleToAccount = (id: string) => {
    const acc = accounts.find((a) => a.accountId === id);
    if (acc) {
      setValue("toAccountId", id);
      setValue("toAccountName", acc.name);
      setValue("toAccountOwner", acc.owner);
    }
  };

  const getOwnerLabel = (owner: string) => {
    switch (owner) {
      case "arul": return OWNER_LABELS["arul"];
      case "fifi": return OWNER_LABELS["fifi"];
      case "shared": return OWNER_LABELS["shared"];
      default: return "";
    }
  };

  const fromId = watch("fromAccountId");

  return (
    <>
      <Sheet open={isOpen} onOpenChange={() => closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isEditing ? "Edit Transfer" : "Catat Transfer"}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
            {!isEditing && <EntryTypeTabs value="transfer" />}

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Jumlah</label>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <AmountInput value={field.value} onChange={field.onChange} autoFocus={!isEditing} />
                )}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Input placeholder="Catatan (opsional)" aria-label="Catatan" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* From Account */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Dari rekening</label>
              <Select value={watch("fromAccountId")} onValueChange={handleFromAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rekening asal" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.accountId} value={acc.accountId}>
                      <span className="flex items-center gap-2">
                        {acc.name}
                        <span className="text-xs text-muted-foreground">
                          ({getOwnerLabel(acc.owner)})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fromAccountId && (
                <p className="text-xs text-destructive">{errors.fromAccountId.message}</p>
              )}
            </div>

            {/* To Account */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ke rekening</label>
              <Select value={watch("toAccountId")} onValueChange={handleToAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rekening tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.accountId !== fromId)
                    .map((acc) => (
                      <SelectItem key={acc.accountId} value={acc.accountId}>
                        <span className="flex items-center gap-2">
                          {acc.name}
                          <span className="text-xs text-muted-foreground">
                            ({getOwnerLabel(acc.owner)})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.toAccountId && (
                <p className="text-xs text-destructive">{errors.toAccountId.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tanggal</label>
              <Input
                type="date"
                defaultValue={
                  isEditing && editingTransfer
                    ? editingTransfer.date.toDate().toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0]
                }
                onChange={(e) =>
                  setValue("date", Timestamp.fromDate(new Date(e.target.value)))
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-transfer hover:bg-transfer/90 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Menyimpan..."
                : isEditing
                  ? "Simpan Perubahan"
                  : "Simpan"}
            </Button>

            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus Transfer
              </Button>
            )}
          </form>
        </SheetContent>
      </Sheet>

      <DeleteTransferDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        transferName={editingTransfer?.name || ""}
        isLoading={isDeleting}
      />
    </>
  );
};
