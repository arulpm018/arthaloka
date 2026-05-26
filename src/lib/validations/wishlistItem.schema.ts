import { z } from "zod";

export const wishlistItemSchema = z.object({
  nama: z.string()
    .min(1, "Nama item harus diisi")
    .max(100, "Nama item maksimal 100 karakter"),
  harga: z.number()
    .int("Harga harus bilangan bulat")
    .min(1, "Harga minimal Rp 1")
    .max(999_999_999_999, "Harga maksimal Rp 999.999.999.999"),
  lokasi: z.string()
    .max(500, "Lokasi/link maksimal 500 karakter")
    .optional()
    .default(""),
  categoryId: z.string().min(1, "Kategori harus dipilih"),
  owner: z.enum(["arul", "fifi", "shared"]),
  linkedTransactionId: z.string().optional(),
  createdBy: z.string().min(1),
});

export type WishlistItemFormValues = z.infer<typeof wishlistItemSchema>;
export type WishlistItemFormInput = z.input<typeof wishlistItemSchema>;
