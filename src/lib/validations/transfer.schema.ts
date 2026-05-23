import { z } from "zod";

export const transferSchema = z
  .object({
    name: z.string().min(1, "Keterangan harus diisi"),
    amount: z.number().positive("Jumlah harus lebih dari 0"),
    fromAccountId: z.string().min(1, "Pilih akun asal"),
    fromAccountName: z.string().min(1),
    fromAccountOwner: z.enum(["arul", "fifi", "shared"]),
    toAccountId: z.string().min(1, "Pilih akun tujuan"),
    toAccountName: z.string().min(1),
    toAccountOwner: z.enum(["arul", "fifi", "shared"]),
    owner: z.enum(["arul", "fifi", "shared"]),
    ownerUid: z.string().min(1),
    date: z.any(), // Firestore Timestamp
    note: z.string().optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Akun asal dan tujuan tidak boleh sama",
    path: ["toAccountId"],
  });

export type TransferFormValues = z.infer<typeof transferSchema>;
