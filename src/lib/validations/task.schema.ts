import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid");

export const taskSchema = z.object({
  title: z
    .string()
    .min(1, "Judul tugas harus diisi")
    .max(120, "Judul maksimal 120 karakter")
    .transform((val) => val.trim()),
  notes: z
    .string()
    .max(500, "Catatan maksimal 500 karakter")
    .transform((val) => val.trim())
    .nullable()
    .default(null),
  dueDate: isoDate.nullable().default(null),
  owner: z.enum(["arul", "fifi", "shared"]),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
