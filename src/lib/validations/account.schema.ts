import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(1, "Nama akun harus diisi"),
  type: z.enum(["bank", "cash", "e-wallet", "savings", "investment"]),
  category: z.enum(["personal", "shared"]),
  owner: z.enum(["arul", "fifi", "shared"]),
  ownerUid: z.string().min(1),
  balance: z.number().min(0, "Saldo awal tidak boleh negatif"),
  currency: z.literal("IDR"),
  color: z.string().min(1, "Warna harus dipilih"),
  icon: z.string().min(1, "Icon harus dipilih"),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  note: z.string().optional(),
});

export type AccountFormValues = z.infer<typeof accountSchema>;
