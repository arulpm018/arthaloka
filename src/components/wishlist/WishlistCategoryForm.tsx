"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  wishlistCategorySchema,
  WishlistCategoryFormValues,
} from "@/lib/validations/wishlistCategory.schema";
import { WishlistCategory } from "@/types/wishlist";
import { useAppStore } from "@/store/useAppStore";
import { categoryIconOptions } from "@/lib/utils/categoryIcons";
import { cn } from "@/lib/utils/cn";
import { Trash2 } from "lucide-react";

interface WishlistCategoryFormProps {
  open: boolean;
  onClose: () => void;
  editingCategory?: WishlistCategory | null;
  onSubmit: (data: WishlistCategoryFormValues) => Promise<void>;
  isDuplicateName: (name: string, excludeId?: string) => boolean;
  onDelete?: (category: WishlistCategory) => void;
}

export const WishlistCategoryForm = ({
  open,
  onClose,
  editingCategory,
  onSubmit,
  isDuplicateName,
  onDelete,
}: WishlistCategoryFormProps) => {
  const currentUser = useAppStore((s) => s.currentUser);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WishlistCategoryFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(wishlistCategorySchema) as any,
    defaultValues: {
      name: "",
      icon: "heart",
      owner: "shared",
      isActive: true,
      createdBy: currentUser?.uid ?? "",
    },
  });

  useEffect(() => {
    if (editingCategory) {
      reset({
        name: editingCategory.name,
        icon: editingCategory.icon,
        owner: editingCategory.owner,
        isActive: editingCategory.isActive,
        createdBy: editingCategory.createdBy,
      });
    } else {
      reset({
        name: "",
        icon: "heart",
        owner: "shared",
        isActive: true,
        createdBy: currentUser?.uid ?? "",
      });
    }
  }, [editingCategory, open, reset, currentUser]);

  const handleFormSubmit = async (data: WishlistCategoryFormValues) => {
    const excludeId = editingCategory?.categoryId;
    if (isDuplicateName(data.name, excludeId)) {
      setError("name", {
        type: "manual",
        message: "Nama kategori sudah digunakan",
      });
      return;
    }

    await onSubmit(data);
  };

  // Subset of icons relevant for wishlist categories
  const wishlistIconOptions = categoryIconOptions.filter((opt) =>
    [
      "heart",
      "shopping-bag",
      "car",
      "phone",
      "home",
      "gift",
      "shirt",
      "utensils",
      "plane",
      "gamepad",
      "dumbbell",
      "baby",
      "wrench",
      "briefcase",
      "package",
    ].includes(opt.id)
  );

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>
            {editingCategory ? "Edit Kategori Wishlist" : "Tambah Kategori Wishlist"}
          </SheetTitle>
        </SheetHeader>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="mt-4 space-y-4"
        >
          {/* Name field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nama</label>
            <Input placeholder="Nama kategori" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Icon picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Icon</label>
            <div className="grid grid-cols-5 gap-2 max-h-[180px] overflow-y-auto rounded-lg border border-border p-2">
              {wishlistIconOptions.map((opt) => {
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
                    <Icon className="h-5 w-5" />
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.icon && (
              <p className="text-xs text-destructive">{errors.icon.message}</p>
            )}
          </div>

          {/* Owner field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pemilik</label>
            <Select
              value={watch("owner")}
              onValueChange={(val) =>
                setValue("owner", val as "arul" | "fifi" | "shared")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arul">Arul</SelectItem>
                <SelectItem value="fifi">Fifi</SelectItem>
                <SelectItem value="shared">Berdua</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hidden fields */}
          <input type="hidden" {...register("isActive")} />
          <input type="hidden" {...register("createdBy")} />

          <div className="flex gap-2">
            {editingCategory && onDelete && (
              <Button
                type="button"
                variant="destructive"
                className="flex-shrink-0"
                onClick={() => {
                  onDelete(editingCategory);
                  onClose();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting
                ? "Menyimpan..."
                : editingCategory
                  ? "Simpan"
                  : "Tambah Kategori"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
