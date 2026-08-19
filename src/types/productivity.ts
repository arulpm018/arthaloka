import { Timestamp } from "firebase/firestore";
import { Owner } from "./account";

/**
 * Modul Produktivitas — to-do list, jadwal, habit tracker.
 *
 * Scope data:
 * - Task: owner pribadi (role pembuat) atau "shared" (berdua).
 * - ScheduleEvent: shared flat — satu kalender bareng.
 * - Habit: per-uid, streak personal (pasangan bisa lihat, read-only).
 *
 * Tanggal tanggal-only disimpan sebagai string "YYYY-MM-DD" (local)
 * supaya konsisten dengan input date & bucketing hari-ini/terlambat.
 */

export interface Task {
  taskId: string;
  title: string;
  notes: string | null;
  /** "YYYY-MM-DD", null = tanpa tenggat */
  dueDate: string | null;
  completed: boolean;
  completedAt: Timestamp | null;
  owner: Owner;
  createdBy: string;
  createdAt: Timestamp;
}

export type CreateTaskInput = Omit<
  Task,
  "taskId" | "createdAt" | "completed" | "completedAt"
>;

export interface ScheduleEvent {
  eventId: string;
  title: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" */
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Timestamp;
}

export type CreateEventInput = Omit<ScheduleEvent, "eventId" | "createdAt">;

/** 0 = Minggu … 6 = Sabtu (mengikuti Date.getDay()) */
export type HabitFrequency =
  | { type: "daily" }
  | { type: "weekly"; days: number[] };

export interface Habit {
  habitId: string;
  /** Pemilik habit — streak personal per user */
  uid: string;
  name: string;
  /** ID ikon lucide — lihat habitIconOptions di lib/utils/habitIcons */
  icon: string;
  frequency: HabitFrequency;
  /** Daftar tanggal "YYYY-MM-DD" yang sudah dicentang */
  completedDates: string[];
  createdAt: Timestamp;
}

export type CreateHabitInput = Omit<
  Habit,
  "habitId" | "createdAt" | "completedDates"
>;
