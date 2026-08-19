import { z } from "zod";

export const habitSchema = z
  .object({
    name: z
      .string()
      .min(1, "Nama habit harus diisi")
      .max(60, "Nama habit maksimal 60 karakter")
      .transform((val) => val.trim()),
    icon: z.string().min(1, "Ikon harus dipilih").max(40),
    frequency: z.discriminatedUnion("type", [
      z.object({ type: z.literal("daily") }),
      z.object({
        type: z.literal("weekly"),
        days: z
          .array(z.number().int().min(0).max(6))
          .min(1, "Pilih minimal satu hari"),
      }),
    ]),
  })
  .refine((val) => val.frequency.type !== "weekly" || val.frequency.days.length > 0, {
    message: "Pilih minimal satu hari",
    path: ["frequency"],
  });

export type HabitFormValues = z.infer<typeof habitSchema>;
