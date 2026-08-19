import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid");

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam tidak valid (HH:mm)");

export const eventSchema = z
  .object({
    title: z
      .string()
      .min(1, "Judul acara harus diisi")
      .max(120, "Judul maksimal 120 karakter")
      .transform((val) => val.trim()),
    date: isoDate,
    startTime: hhmm.nullable().default(null),
    endTime: hhmm.nullable().default(null),
    location: z
      .string()
      .max(200, "Lokasi maksimal 200 karakter")
      .transform((val) => val.trim())
      .nullable()
      .default(null),
    notes: z
      .string()
      .max(500, "Catatan maksimal 500 karakter")
      .transform((val) => val.trim())
      .nullable()
      .default(null),
    owner: z.enum(["arul", "fifi", "shared"]),
  })
  .refine(
    (val) =>
      !val.startTime || !val.endTime || val.startTime <= val.endTime,
    {
      message: "Jam selesai tidak boleh sebelum jam mulai",
      path: ["endTime"],
    }
  );

export type EventFormValues = z.infer<typeof eventSchema>;
