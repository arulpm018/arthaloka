import { z } from "zod";

export const wishlistCategorySchema = z.object({
  name: z.string()
    .min(1, "Nama kategori harus diisi")
    .max(50, "Nama kategori maksimal 50 karakter")
    .transform((val) => val.trim()),
  icon: z.string().min(1, "Icon harus dipilih"),
  owner: z.enum(["arul", "fifi", "shared"]),
  isActive: z.boolean().default(true),
  createdBy: z.string().min(1),
});

export type WishlistCategoryFormValues = z.infer<typeof wishlistCategorySchema>;
export type WishlistCategoryFormInput = z.input<typeof wishlistCategorySchema>;
