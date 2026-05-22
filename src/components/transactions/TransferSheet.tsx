"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp } from "firebase/firestore";
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
import { CreateTransferInput } from "@/types";

export const TransferSheet = () => {
  const { activeSheet, closeSheet, currentUser, defaultOwner } = useAppStore();
  const { accounts } = useAccounts();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isOpen = activeSheet === "transfer";

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TransferFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(transferSchema) as any,
    defaultValues: {
      name: "",
      amount: 0,
      fromAccountId: "",
      fromAccountName: "",
      toAccountId: "",
      toAccountName: "",
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
      const ownerDefault = defaultOwner || currentUser?.role || "arul";
      reset({
        name: "",
        amount: 0,
        fromAccountId: "",
        fromAccountName: "",
        toAccountId: "",
        toAccountName: "",
        owner: ownerDefault,
        ownerUid: currentUser?.uid || "",
        date: Timestamp.now(),
        note: "",
      });
    }
  }, [isOpen, currentUser, defaultOwner, reset]);

  const onSubmit = async (data: TransferFormValues) => {
    try {
      setSubmitError(null);
      await transfersService.create(data as unknown as CreateTransferInput);
      setSubmitSuccess(true);
      setTimeout(() => {
        closeSheet();
        setSubmitSuccess(false);
      }, 800);
    } catch (error) {
      console.error("Failed to save transfer:", error);
      setSubmitError("Gagal menyimpan. Coba lagi.");
    }
  };

  const handleFromAccount = (id: string) => {
    const acc = accounts.find((a) => a.accountId === id);
    if (acc) {
      setValue("fromAccountId", id);
      setValue("fromAccountName", acc.name);
    }
  };

  const handleToAccount = (id: string) => {
    const acc = accounts.find((a) => a.accountId === id);
    if (acc) {
      setValue("toAccountId", id);
      setValue("toAccountName", acc.name);
    }
  };

  const fromId = watch("fromAccountId");

  return (
    <Sheet open={isOpen} onOpenChange={() => closeSheet()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Transfer Antar Akun</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Jumlah</label>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <AmountInput value={field.value} onChange={field.onChange} autoFocus />
              )}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Keterangan</label>
            <Input placeholder="Top up, pindah dana, dll" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* From Account */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Dari Akun</label>
            <Select value={watch("fromAccountId")} onValueChange={handleFromAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih akun asal" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.accountId} value={acc.accountId}>
                    {acc.name}
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
            <label className="text-sm font-medium">Ke Akun</label>
            <Select value={watch("toAccountId")} onValueChange={handleToAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih akun tujuan" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.accountId !== fromId)
                  .map((acc) => (
                    <SelectItem key={acc.accountId} value={acc.accountId}>
                      {acc.name}
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
              defaultValue={new Date().toISOString().split("T")[0]}
              onChange={(e) =>
                setValue("date", Timestamp.fromDate(new Date(e.target.value)))
              }
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Catatan (opsional)</label>
            <Input placeholder="Catatan" {...register("note")} />
          </div>

          {/* Error message */}
          {submitError && (
            <p className="text-sm text-destructive text-center">{submitError}</p>
          )}

          {/* Success message */}
          {submitSuccess && (
            <p className="text-sm text-transfer text-center">Transfer berhasil ✓</p>
          )}

          <Button
            type="submit"
            className="w-full bg-transfer hover:bg-transfer/90 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Memproses..." : "Transfer"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
