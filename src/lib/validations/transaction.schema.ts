import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  name: z.string().min(1, "Nama transaksi harus diisi"),
  amount: z.number().positive("Jumlah harus lebih dari 0"),
  accountId: z.string().min(1, "Pilih akun"),
  accountName: z.string().min(1),
  categoryId: z.string().min(1, "Pilih kategori"),
  categoryName: z.string().min(1),
  categoryIcon: z.string().min(1),
  owner: z.enum(["arul", "fifi", "shared"]),
  ownerUid: z.string().min(1),
  date: z.any(), // Firestore Timestamp
  note: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
