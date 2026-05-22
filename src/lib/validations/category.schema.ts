import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori harus diisi"),
  icon: z.string().min(1, "Icon harus dipilih"),
  color: z.string().min(1, "Warna harus dipilih"),
  type: z.enum(["expense", "income", "both"]),
  budgetAmount: z.number().min(0, "Budget tidak boleh negatif").default(0),
  budgetScope: z.enum(["arul", "fifi", "shared"]).default("arul"),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  createdBy: z.string().min(1),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
