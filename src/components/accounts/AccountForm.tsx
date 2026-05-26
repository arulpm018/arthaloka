"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp } from "firebase/firestore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import { AmountInput } from "@/components/shared/AmountInput";
import { accountSchema, AccountFormValues, AccountFormInput } from "@/lib/validations/account.schema";
import { Account } from "@/types";
import { useAccounts } from "@/hooks/useAccounts";
import { useAppStore } from "@/store/useAppStore";
import { OWNER_LABELS } from "@/lib/constants/labels";

const timestampToDateInputValue = (ts: Timestamp | undefined): string | undefined => {
  if (!ts) return undefined;
  const date = ts.toDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  editingAccount?: Account | null;
}

const accountTypes = [
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "e-wallet", label: "E-Wallet" },
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
];

const ownerOptions = [
  { value: "arul", label: OWNER_LABELS["arul"] },
  { value: "fifi", label: OWNER_LABELS["fifi"] },
  { value: "shared", label: OWNER_LABELS["shared"] },
];

const colors = [
  "#64748b", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
];

export const AccountForm = ({ open, onClose, editingAccount }: AccountFormProps) => {
  const { create, update } = useAccounts();
  const currentUser = useAppStore((s) => s.currentUser);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormInput, unknown, AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "bank",
      category: "personal",
      owner: "arul",
      ownerUid: currentUser?.uid ?? "",
      balance: 0,
      currency: "IDR",
      color: colors[0],
      icon: "wallet",
      isActive: true,
      order: 0,
      note: "",
      savingTarget: undefined,
      targetDate: undefined,
    },
  });

  useEffect(() => {
    if (editingAccount) {
      reset({
        name: editingAccount.name,
        type: editingAccount.type,
        category: editingAccount.category,
        owner: editingAccount.owner,
        ownerUid: editingAccount.ownerUid,
        balance: editingAccount.balance,
        currency: "IDR",
        color: editingAccount.color,
        icon: editingAccount.icon,
        isActive: editingAccount.isActive,
        order: editingAccount.order,
        note: editingAccount.note ?? "",
        savingTarget: editingAccount.savingTarget,
        targetDate: editingAccount.targetDate,
      });
    } else {
      reset({
        name: "",
        type: "bank",
        category: "personal",
        owner: currentUser?.role ?? "arul",
        ownerUid: currentUser?.uid ?? "",
        balance: 0,
        currency: "IDR",
        color: colors[0],
        icon: "wallet",
        isActive: true,
        order: 0,
        note: "",
        savingTarget: undefined,
        targetDate: undefined,
      });
    }
  }, [editingAccount, open, reset, currentUser]);

  const onSubmit = async (data: AccountFormValues) => {
    try {
      const category = data.owner === "shared" ? "shared" : "personal";

      if (editingAccount) {
        await update(editingAccount.accountId, { ...data, category });
      } else {
        await create({ ...data, category });
      }
      onClose();
    } catch (error) {
      console.error("Failed to save account:", error);
    }
  };

  const selectedType = watch("type");
  const selectedOwner = watch("owner");
  const selectedColor = watch("color");

  // Reset savings-only fields when type changes away from "savings"
  useEffect(() => {
    if (selectedType !== "savings") {
      setValue("savingTarget", undefined);
      setValue("targetDate", undefined);
    }
  }, [selectedType, setValue]);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="rounded-t-sheet max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {editingAccount ? "Edit Akun" : "Tambah Akun"}
          </SheetTitle>
          <SheetDescription>
            {editingAccount
              ? "Ubah detail akun keuangan"
              : "Tambahkan akun keuangan baru"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nama Akun</label>
            <Input
              placeholder="Contoh: Bank Mandiri"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tipe</label>
            <Select
              value={selectedType}
              onValueChange={(val) => setValue("type", val as AccountFormValues["type"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe akun" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Owner */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pemilik</label>
            <Select
              value={selectedOwner}
              onValueChange={(val) => {
                setValue("owner", val as AccountFormValues["owner"]);
                setValue("category", val === "shared" ? "shared" : "personal");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih pemilik" />
              </SelectTrigger>
              <SelectContent>
                {ownerOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Balance - only show when adding new account */}
          {!editingAccount && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Saldo Awal</label>
              <AmountInput
                value={watch("balance")}
                onChange={(val) => setValue("balance", val, { shouldValidate: true })}
                prefix=""
              />
              {errors.balance && (
                <p className="text-xs text-destructive">{errors.balance.message}</p>
              )}
            </div>
          )}

          {/* Savings-only fields */}
          {selectedType === "savings" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Target Tabungan (opsional)</label>
                <AmountInput
                  value={watch("savingTarget") ?? 0}
                  onChange={(val) =>
                    setValue("savingTarget", val > 0 ? val : undefined, {
                      shouldValidate: true,
                    })
                  }
                  prefix="Rp"
                />
                {errors.savingTarget && (
                  <p className="text-xs text-destructive">
                    {errors.savingTarget.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Target Tanggal (opsional)</label>
                <Input
                  type="date"
                  value={timestampToDateInputValue(watch("targetDate")) ?? ""}
                  onChange={(e) => {
                    const dateStr = e.target.value;
                    if (!dateStr) {
                      setValue("targetDate", undefined, { shouldValidate: true });
                      return;
                    }
                    const [year, month, day] = dateStr.split("-").map(Number);
                    const date = new Date(year, month - 1, day);
                    setValue("targetDate", Timestamp.fromDate(date), {
                      shouldValidate: true,
                    });
                  }}
                />
              </div>
            </>
          )}

          {/* Color Picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Warna</label>
            <div className="grid grid-cols-8 gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("color", c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    selectedColor === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Catatan (opsional)</label>
            <Input
              placeholder="Catatan tambahan"
              {...register("note")}
            />
          </div>

          {/* Hidden fields */}
          <input type="hidden" {...register("ownerUid")} />
          <input type="hidden" {...register("currency")} />
          <input type="hidden" {...register("isActive")} />
          <input type="hidden" {...register("order", { valueAsNumber: true })} />
          <input type="hidden" {...register("icon")} />

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Menyimpan..."
              : editingAccount
                ? "Simpan Perubahan"
                : "Tambah Akun"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
