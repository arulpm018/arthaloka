"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  wishlistItemSchema,
  WishlistItemFormValues,
  WishlistItemFormInput,
} from "@/lib/validations/wishlistItem.schema";
import { WishlistCategory, WishlistItem } from "@/types/wishlist";
import { useAppStore } from "@/store/useAppStore";
import { AmountInput } from "@/components/shared/AmountInput";
import { getCategoryIcon } from "@/lib/utils/categoryIcons";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { Trash2 } from "lucide-react";

interface WishlistItemFormProps {
  open: boolean;
  onClose: () => void;
  editingItem?: WishlistItem | null;
  categories: WishlistCategory[];
  onSubmit: (data: WishlistItemFormValues) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
  onAddCategory?: () => void;
}

const ownerOptions = [
  { value: "arul", label: OWNER_LABELS["arul"] },
  { value: "fifi", label: OWNER_LABELS["fifi"] },
  { value: "shared", label: OWNER_LABELS["shared"] },
];

export const WishlistItemForm = ({
  open,
  onClose,
  editingItem,
  categories,
  onSubmit,
  onDelete,
  onAddCategory,
}: WishlistItemFormProps) => {
  const currentUser = useAppStore((s) => s.currentUser);
  const defaultOwner = useAppStore((s) => s.defaultOwner);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<WishlistItemFormInput, unknown, WishlistItemFormValues>({
    resolver: zodResolver(wishlistItemSchema),
    defaultValues: {
      nama: "",
      harga: 0,
      lokasi: "",
      categoryId: "",
      owner: defaultOwner || "arul",
      createdBy: currentUser?.uid ?? "",
    },
  });

  useEffect(() => {
    if (editingItem) {
      reset({
        nama: editingItem.nama,
        harga: editingItem.harga,
        lokasi: editingItem.lokasi || "",
        categoryId: editingItem.categoryId,
        owner: editingItem.owner,
        createdBy: editingItem.createdBy,
      });
    } else {
      // Untuk item baru: kalau ada kategori, owner item ikut owner kategori default.
      // Fallback ke defaultOwner (dari context owner page) atau "arul".
      const defaultCategory = categories.length > 0 ? categories[0] : null;
      reset({
        nama: "",
        harga: 0,
        lokasi: "",
        categoryId: defaultCategory?.categoryId ?? "",
        owner: defaultCategory?.owner ?? defaultOwner ?? "arul",
        createdBy: currentUser?.uid ?? "",
      });
    }
  }, [editingItem, open, reset, currentUser, defaultOwner, categories]);

  const handleFormSubmit = async (data: WishlistItemFormValues) => {
    await onSubmit(data);
  };

  const handleDelete = async () => {
    if (!editingItem || !onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(editingItem.itemId);
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      console.error("Failed to delete wishlist item:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedOwner = watch("owner");
  const selectedCategoryId = watch("categoryId");

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              {editingItem ? "Edit Item" : "Tambah Item"}
            </SheetTitle>
            <SheetDescription>
              {editingItem
                ? "Ubah detail item wishlist"
                : "Tambahkan item baru ke wishlist"}
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="mt-4 space-y-4"
          >
            {/* Nama */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nama Item</label>
              <Input
                placeholder="Contoh: iPhone 16 Pro"
                {...register("nama")}
              />
              {errors.nama && (
                <p className="text-xs text-destructive">
                  {errors.nama.message}
                </p>
              )}
            </div>

            {/* Harga */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Harga (IDR)</label>
              <Controller
                name="harga"
                control={control}
                render={({ field }) => (
                  <AmountInput
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.harga && (
                <p className="text-xs text-destructive">
                  {errors.harga.message}
                </p>
              )}
            </div>

            {/* Lokasi */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Lokasi / Link (opsional)
              </label>
              <Input
                placeholder="Nama toko atau URL"
                {...register("lokasi")}
              />
              {errors.lokasi && (
                <p className="text-xs text-destructive">
                  {errors.lokasi.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Kategori</label>
                {onAddCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAddCategory();
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    + Tambah Kategori
                  </button>
                )}
              </div>
              {categories.length > 0 ? (
                <Select
                  value={selectedCategoryId}
                  onValueChange={(val) => {
                    setValue("categoryId", val, { shouldValidate: true });
                    // Auto-sync owner item ke owner kategori — kategori adalah
                    // sumber kebenaran (kategori "bareng" → item bareng, dst).
                    const picked = categories.find((c) => c.categoryId === val);
                    if (picked) {
                      setValue("owner", picked.owner, { shouldValidate: true });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => {
                      const CatIcon = getCategoryIcon(cat.icon);
                      return (
                        <SelectItem key={cat.categoryId} value={cat.categoryId}>
                          <span className="flex items-center gap-2">
                            <CatIcon className="h-4 w-4" />
                            <span>{cat.name}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  Belum ada kategori. Tambah kategori dulu sebelum menambah item.
                </p>
              )}
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
                  setValue("owner", val as "arul" | "fifi" | "shared")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pemilik" />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.owner && (
                <p className="text-xs text-destructive">
                  {errors.owner.message}
                </p>
              )}
            </div>

            {/* Hidden fields */}
            <input type="hidden" {...register("createdBy")} />

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? "Menyimpan..."
                : editingItem
                  ? "Simpan"
                  : "Tambah Item"}
            </Button>

            {/* Delete button (edit mode only) */}
            {editingItem && onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Hapus Item
              </Button>
            )}
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Item</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus &quot;{editingItem?.nama}&quot;?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
