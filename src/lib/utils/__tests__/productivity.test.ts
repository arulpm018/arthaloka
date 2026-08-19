import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import type { Habit, Task } from "@/types";
import {
  dateKey,
  parseDateKey,
  getWeekDates,
  getMonthGrid,
  groupTasks,
  sortTasks,
  isHabitDueOn,
  getHabitStreak,
  getHabitProgress,
  getEventOwner,
} from "@/lib/utils/productivity";

const makeTask = (partial: Partial<Task>): Task => ({
  taskId: Math.random().toString(36).slice(2),
  title: "Tugas",
  notes: null,
  dueDate: null,
  completed: false,
  completedAt: null,
  owner: "shared",
  createdBy: "uid",
  createdAt: Timestamp.fromMillis(0),
  ...partial,
});

const makeHabit = (partial: Partial<Habit>): Habit => ({
  habitId: Math.random().toString(36).slice(2),
  uid: "uid",
  name: "Habit",
  icon: "target",
  frequency: { type: "daily" },
  completedDates: [],
  createdAt: Timestamp.fromMillis(0),
  ...partial,
});

describe("dateKey / parseDateKey", () => {
  it("round-trip local date", () => {
    const d = new Date(2026, 7, 20); // 20 Agustus 2026
    expect(dateKey(d)).toBe("2026-08-20");
    expect(parseDateKey("2026-08-20")?.getTime()).toBe(d.getTime());
  });

  it("rejects invalid date strings", () => {
    expect(parseDateKey("2026-02-31")).toBeNull();
    expect(parseDateKey("bukan-tanggal")).toBeNull();
    expect(parseDateKey("2026-8-20")).toBeNull();
  });
});

describe("getWeekDates", () => {
  it("starts on Monday and spans 7 days", () => {
    // Kamis, 20 Agustus 2026 → minggu mulai Senin 17 Agustus
    const week = getWeekDates(new Date(2026, 7, 20));
    expect(week).toHaveLength(7);
    expect(week[0].getDay()).toBe(1);
    expect(dateKey(week[0])).toBe("2026-08-17");
    expect(dateKey(week[6])).toBe("2026-08-23");
  });

  it("handles Sunday as last day", () => {
    const week = getWeekDates(new Date(2026, 7, 23)); // Minggu
    expect(week[6].getDay()).toBe(0);
    expect(dateKey(week[6])).toBe("2026-08-23");
  });
});

describe("getMonthGrid", () => {
  it("builds full weeks for Agustus 2026 (starts Saturday)", () => {
    const grid = getMonthGrid(2026, 7);
    expect(grid[0][0].getDay()).toBe(1); // Senin
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid.flat().some((d) => isSameMonth(d, 7))).toBe(true);
  });
});

const isSameMonth = (d: Date, month: number) => d.getMonth() === month;

describe("groupTasks", () => {
  const today = "2026-08-20";

  it("buckets by due date relative to today", () => {
    const groups = groupTasks(
      [
        makeTask({ taskId: "overdue", dueDate: "2026-08-19" }),
        makeTask({ taskId: "today", dueDate: "2026-08-20" }),
        makeTask({ taskId: "upcoming", dueDate: "2026-08-21" }),
        makeTask({ taskId: "someday", dueDate: null }),
        makeTask({ taskId: "done", dueDate: "2026-08-19", completed: true }),
      ],
      today
    );
    expect(groups.overdue.map((t) => t.taskId)).toEqual(["overdue"]);
    expect(groups.today.map((t) => t.taskId)).toEqual(["today"]);
    expect(groups.upcoming.map((t) => t.taskId)).toEqual(["upcoming"]);
    expect(groups.someday.map((t) => t.taskId)).toEqual(["someday"]);
    expect(groups.completed.map((t) => t.taskId)).toEqual(["done"]);
  });
});

describe("sortTasks", () => {
  it("sorts by due date, no-due last", () => {
    const sorted = sortTasks([
      makeTask({ taskId: "none" }),
      makeTask({ taskId: "late", dueDate: "2026-09-02" }),
      makeTask({ taskId: "soon", dueDate: "2026-08-21" }),
    ]);
    expect(sorted.map((t) => t.taskId)).toEqual(["soon", "late", "none"]);
  });
});

describe("isHabitDueOn", () => {
  it("daily habit is due every day", () => {
    const habit = makeHabit({ frequency: { type: "daily" } });
    expect(isHabitDueOn(habit, new Date(2026, 7, 20))).toBe(true);
  });

  it("weekly habit only on selected days", () => {
    // 20 Agustus 2026 = Kamis (4)
    const habit = makeHabit({
      frequency: { type: "weekly", days: [1, 4] }, // Senin & Kamis
    });
    expect(isHabitDueOn(habit, new Date(2026, 7, 20))).toBe(true); // Kamis
    expect(isHabitDueOn(habit, new Date(2026, 7, 21))).toBe(false); // Jumat
  });
});

describe("getHabitStreak", () => {
  it("counts consecutive done days ending today", () => {
    const habit = makeHabit({
      completedDates: ["2026-08-18", "2026-08-19", "2026-08-20"],
    });
    expect(getHabitStreak(habit, new Date(2026, 7, 20))).toBe(3);
  });

  it("today not yet done does not break the streak", () => {
    const habit = makeHabit({
      completedDates: ["2026-08-18", "2026-08-19"],
    });
    expect(getHabitStreak(habit, new Date(2026, 7, 20))).toBe(2);
  });

  it("gap breaks the streak", () => {
    const habit = makeHabit({
      completedDates: ["2026-08-16", "2026-08-19", "2026-08-20"],
    });
    expect(getHabitStreak(habit, new Date(2026, 7, 20))).toBe(2);
  });

  it("skips non-scheduled days without breaking (weekly)", () => {
    // Senin & Kamis saja; hari ini Jumat 21 Agustus 2026
    const habit = makeHabit({
      frequency: { type: "weekly", days: [1, 4] },
      completedDates: ["2026-08-17", "2026-08-20"], // Senin, Kamis
    });
    expect(getHabitStreak(habit, new Date(2026, 7, 21))).toBe(2);
  });

  it("zero when nothing done", () => {
    const habit = makeHabit({ completedDates: [] });
    expect(getHabitStreak(habit, new Date(2026, 7, 20))).toBe(0);
  });
});

describe("getHabitProgress", () => {
  it("counts only habits scheduled today", () => {
    // 20 Agustus 2026 = Kamis (4)
    const habits = [
      makeHabit({ habitId: "daily-done", completedDates: ["2026-08-20"] }),
      makeHabit({ habitId: "daily-todo", completedDates: [] }),
      makeHabit({
        habitId: "monday-only",
        frequency: { type: "weekly", days: [1] },
        completedDates: ["2026-08-17"],
      }),
    ];
    expect(getHabitProgress(habits, new Date(2026, 7, 20))).toEqual({
      done: 1,
      total: 2,
    });
  });
});

describe("getEventOwner", () => {
  const uidToOwner = { "uid-arul": "arul", "uid-fifi": "fifi" } as const;

  it("memakai field owner kalau ada (event baru)", () => {
    expect(
      getEventOwner({ owner: "shared", createdBy: "uid-arul" }, uidToOwner)
    ).toBe("shared");
    expect(
      getEventOwner({ owner: "fifi", createdBy: "uid-arul" }, uidToOwner)
    ).toBe("fifi");
  });

  it("menurunkan owner dari createdBy untuk event lama tanpa field owner", () => {
    expect(getEventOwner({ createdBy: "uid-fifi" }, uidToOwner)).toBe("fifi");
    expect(getEventOwner({ createdBy: "uid-arul" }, uidToOwner)).toBe("arul");
  });

  it("fallback ke shared kalau pembuat tidak dikenal", () => {
    expect(getEventOwner({ createdBy: "uid-lain" }, uidToOwner)).toBe("shared");
    expect(getEventOwner({ createdBy: "uid-lain" }, {})).toBe("shared");
  });
});
