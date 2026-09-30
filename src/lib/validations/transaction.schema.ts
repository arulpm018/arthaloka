import { z } from "zod";

/**
 * Form catat transaksi. `name` boleh kosong (diisi nama kategori saat simpan);
 * `owner` & `ownerUid` tidak ada di form — diturunkan dari rekening & user login.
 */
export const transactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  name: z.string(),
  amount: z.number().positive("Nominal harus lebih dari 0"),
  accountId: z.string().min(1, "Pilih rekening"),
  accountName: z.string().min(1),
  categoryId: z.string().min(1, "Pilih kategori"),
  categoryName: z.string().min(1),
  categoryIcon: z.string().min(1),
  date: z.any(), // Firestore Timestamp
  note: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
