import { Habit, Owner, ScheduleEvent, Task } from "@/types";

/**
 * Helper murni modul Produktivitas — tanggal, pengelompokan tugas,
 * penjadwalan & streak habit. Tanpa side-effect, gampang dites.
 *
 * Konvensi tanggal: string "YYYY-MM-DD" local (bukan UTC), sehingga
 * bisa dibandingkan secara lexical dan langsung dipakai input date.
 */

export const DAY_LABELS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const DAY_LABELS_FULL = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const MONTH_LABELS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTH_LABELS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Date → "YYYY-MM-DD" pakai komponen local. */
export const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** "YYYY-MM-DD" → Date local midnight. Return null kalau invalid. */
export const parseDateKey = (key: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Reject overflow (mis. 2026-02-31)
  if (
    d.getFullYear() !== Number(m[1]) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== Number(m[3])
  ) {
    return null;
  }
  return d;
};

export const addDays = (d: Date, days: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "Senin, 17 Agustus 2026" */
export const formatFullDate = (d: Date): string =>
  `${DAY_LABELS_FULL[d.getDay()]}, ${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;

/** "17 Agustus 2026" */
export const formatDateID = (d: Date): string =>
  `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;

/** "Agustus 2026" */
export const formatMonthYear = (d: Date): string =>
  `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;

/** Label pendek tenggat: "Hari ini", "Besok", "Kemarin", atau "17 Agu". */
export const formatDueLabel = (dueKey: string, today: Date): string => {
  const diffDays = Math.round(
    (parseDateKey(dueKey)!.getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000
  );
  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Besok";
  if (diffDays === -1) return "Kemarin";
  const d = parseDateKey(dueKey)!;
  const label = `${d.getDate()} ${MONTH_LABELS_SHORT[d.getMonth()]}`;
  return diffDays < 0 ? `${label} · lewat` : label;
};

/** Senin awal minggunya `d`. */
export const startOfWeekMonday = (d: Date): Date => {
  const day = d.getDay(); // 0 = Minggu
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
};

/** 7 Date Senin–Minggu dari minggu yang memuat `d`. */
export const getWeekDates = (d: Date): Date[] => {
  const start = startOfWeekMonday(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

/**
 * Grid kalender bulanan Senin-awal: array of minggu (7 Date).
 * Sel sebelum/sesudah bulan diisi Date bulan tetangga.
 */
export const getMonthGrid = (year: number, month: number): Date[][] => {
  const first = new Date(year, month, 1);
  const start = startOfWeekMonday(first);
  const weeks: Date[][] = [];
  let cursor = start;
  do {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  } while (cursor.getMonth() === month && cursor.getFullYear() === year);
  return weeks;
};

/* ---------------------------------- Task --------------------------------- */

export interface TaskGroups {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  someday: Task[];
  completed: Task[];
}

/** Kelompokkan tugas berdasarkan tenggat relatif ke `todayKey`. */
export const groupTasks = (tasks: Task[], todayKey: string): TaskGroups => {
  const groups: TaskGroups = {
    overdue: [],
    today: [],
    upcoming: [],
    someday: [],
    completed: [],
  };
  for (const task of tasks) {
    if (task.completed) {
      groups.completed.push(task);
      continue;
    }
    if (!task.dueDate) {
      groups.someday.push(task);
    } else if (task.dueDate < todayKey) {
      groups.overdue.push(task);
    } else if (task.dueDate === todayKey) {
      groups.today.push(task);
    } else {
      groups.upcoming.push(task);
    }
  }
  return groups;
};

/** Urutan tampil: overdue → today → upcoming → someday, masing-masing by due/created. */
export const sortTasks = (tasks: Task[]): Task[] =>
  [...tasks].sort((a, b) => {
    const aKey = a.dueDate ?? "9999-12-31";
    const bKey = b.dueDate ?? "9999-12-31";
    if (aKey !== bKey) return aKey < bKey ? -1 : 1;
    const aCreated = a.createdAt?.toMillis?.() ?? 0;
    const bCreated = b.createdAt?.toMillis?.() ?? 0;
    return aCreated - bCreated;
  });

/* --------------------------------- Habit --------------------------------- */

/** Apakah habit terjadwal pada `date`? */
export const isHabitDueOn = (habit: Habit, date: Date): boolean => {
  if (habit.frequency.type === "daily") return true;
  return habit.frequency.days.includes(date.getDay());
};

export const isHabitDoneOn = (habit: Habit, date: Date): boolean =>
  habit.completedDates.includes(dateKey(date));

/**
 * Streak berturut-turut sampai hari ini. Hari ini yang belum dicentang
 * tidak memutus streak — streak dihitung sampai kemarin.
 */
export const getHabitStreak = (habit: Habit, today: Date): number => {
  let streak = 0;
  let cursor = new Date(today);
  // Hari ini belum dilakukan ≠ putus; mundur ke kemarin dulu.
  if (isHabitDueOn(habit, cursor) && !isHabitDoneOn(habit, cursor)) {
    cursor = addDays(cursor, -1);
  }
  // Safety cap 10 tahun — frekuensi weekly minimal 1 hari/minggu.
  for (let i = 0; i < 3660; i++) {
    if (!isHabitDueOn(habit, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (isHabitDoneOn(habit, cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
};

/** Progress habit pada `date`: berapa due yang selesai. */
export const getHabitProgress = (
  habits: Habit[],
  date: Date
): { done: number; total: number } => {
  const due = habits.filter((h) => isHabitDueOn(h, date));
  return {
    done: due.filter((h) => isHabitDoneOn(h, date)).length,
    total: due.length,
  };
};

/**
 * Pemilik efektif sebuah acara. Field `owner` belum ada di event lama —
 * turunkan dari `createdBy` via peta uid→Owner; kalau tetap tidak ketemu
 * (pembuat bukan pasangan), anggap "shared".
 */
export const getEventOwner = (
  event: Pick<ScheduleEvent, "owner" | "createdBy">,
  uidToOwner: Record<string, Owner>
): Owner => event.owner ?? uidToOwner[event.createdBy] ?? "shared";
