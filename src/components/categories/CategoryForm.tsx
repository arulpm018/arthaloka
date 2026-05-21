"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  categorySchema,
  CategoryFormValues,
} from "@/lib/validations/category.schema";
import { Category } from "@/types";
import { useCategories } from "@/hooks/useCategories";
import { useAppStore } from "@/store/useAppStore";
import { categoryIconOptions } from "@/lib/utils/categoryIcons";
import { cn } from "@/lib/utils/cn";

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  editingCategory?: Category | null;
}

export const CategoryForm = ({
  open,
  onClose,
  editingCategory,
}: CategoryFormProps) => {
  const { create, update } = useCategories();
  const currentUser = useAppStore((s) => s.currentUser);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      name: "",
      icon: "package",
      color: "#64748b",
      type: "expense",
      budgetAmount: 0,
      budgetScope: "each",
      isActive: true,
      order: 0,
      createdBy: currentUser?.uid ?? "",
    },
  });

  useEffect(() => {
    if (editingCategory) {
      reset({
        name: editingCategory.name,
        icon: editingCategory.icon,
        color: editingCategory.color,
        type: editingCategory.type,
        budgetAmount: editingCategory.budgetAmount,
        budgetScope: editingCategory.budgetScope,
        isActive: editingCategory.isActive,
        order: editingCategory.order,
        createdBy: editingCategory.createdBy,
      });
    } else {
      reset({
        name: "",
        icon: "package",
        color: "#64748b",
        type: "expense",
        budgetAmount: 0,
        budgetScope: "each",
        isActive: true,
        order: 0,
        createdBy: currentUser?.uid ?? "",
      });
    }
  }, [editingCategory, open, reset, currentUser]);

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      if (editingCategory) {
        await update(editingCategory.categoryId, data);
      } else {
        await create(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save category:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>
            {editingCategory ? "Edit Kategori" : "Tambah Kategori"}
          </SheetTitle>
          <SheetDescription>
            {editingCategory
              ? "Ubah detail kategori"
              : "Buat kategori baru"}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nama</label>
            <Input placeholder="Nama kategori" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Icon</label>
            <div className="grid grid-cols-6 gap-2 max-h-[180px] overflow-y-auto rounded-lg border border-border p-2">
              {categoryIconOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = watch("icon") === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setValue("icon", opt.id)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg p-2 transition-colors",
                      isSelected
                        ? "bg-accent ring-2 ring-ring"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tipe</label>
            <Select
              value={watch("type")}
              onValueChange={(val) =>
                setValue("type", val as "expense" | "income" | "both")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Pengeluaran</SelectItem>
                <SelectItem value="income">Pemasukan</SelectItem>
                <SelectItem value="both">Keduanya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Budget Bulanan (IDR)</label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              {...register("budgetAmount", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Scope Budget</label>
            <Select
              value={watch("budgetScope")}
              onValueChange={(val) =>
                setValue(
                  "budgetScope",
                  val as "arul" | "fifi" | "shared" | "each"
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="each">Masing-masing</SelectItem>
                <SelectItem value="arul">Arul</SelectItem>
                <SelectItem value="fifi">Fifi</SelectItem>
                <SelectItem value="shared">Together</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <input type="hidden" {...register("createdBy")} />
          <input type="hidden" {...register("isActive")} />
          <input
            type="hidden"
            {...register("order", { valueAsNumber: true })}
          />
          <input type="hidden" {...register("color")} />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? "Menyimpan..."
              : editingCategory
                ? "Simpan"
                : "Tambah Kategori"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
