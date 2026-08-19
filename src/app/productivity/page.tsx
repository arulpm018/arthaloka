"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Clock,
  ListTodo,
  CalendarDays,
  Flame,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { useTasks } from "@/hooks/useTasks";
import { useEvents } from "@/hooks/useEvents";
import { useHabits } from "@/hooks/useHabits";
import { useAppStore } from "@/store/useAppStore";
import {
  addDays,
  dateKey,
  formatDateID,
  formatDueLabel,
  getHabitProgress,
  getHabitStreak,
  isHabitDueOn,
} from "@/lib/utils/productivity";
import { getHabitIcon } from "@/lib/utils/habitIcons";

const SectionLink = ({ href }: { href: string }) => (
  <Link
    href={href}
    aria-label="Lihat semua"
    className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
  >
    Lihat semua
    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
  </Link>
);

export default function TodayPage() {
  const { tasks, setCompleted } = useTasks();
  const { events } = useEvents();
  const uid = useAppStore((s) => s.currentUser?.uid);
  const { habits } = useHabits(uid);

  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const weekAheadKey = dateKey(addDays(today, 7));

  const openTasks = tasks.filter((t) => !t.completed);
  const focusTasks = openTasks
    .filter((t) => !t.dueDate || t.dueDate <= todayKey)
    .slice(0, 3);
  const overdueCount = openTasks.filter(
    (t) => t.dueDate && t.dueDate < todayKey
  ).length;

  const todayEvents = events.filter((e) => e.date === todayKey);
  const upcomingEvents = events.filter(
    (e) => e.date > todayKey && e.date <= weekAheadKey
  );

  const habitProgress = getHabitProgress(habits, today);
  const bestStreak = habits.reduce(
    (max, h) => Math.max(max, getHabitStreak(h, today)),
    0
  );

  return (
    <>
      <Header title="Hari Ini" />

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <p className="text-sm text-muted-foreground">{formatDateID(today)}</p>

        {/* Tugas */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <ListTodo className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Tugas
            </h2>
            <SectionLink href="/productivity/tasks" />
          </div>

          {focusTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {openTasks.length === 0
                ? "Tidak ada tugas aktif 🎉"
                : "Tidak ada tugas jatuh tempo — santai dulu."}
            </p>
          ) : (
            <div className="space-y-2.5">
              {focusTasks.map((task) => (
                <div key={task.taskId} className="flex items-start gap-2.5">
                  <Checkbox
                    checked={false}
                    onCheckedChange={(checked) =>
                      setCompleted(task.taskId, checked === true)
                    }
                    aria-label={`Tandai "${task.title}" selesai`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{task.title}</p>
                    {task.dueDate && (
                      <p
                        className={cn(
                          "text-xs",
                          task.dueDate < todayKey
                            ? "font-medium text-expense"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatDueLabel(task.dueDate, today)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {overdueCount > 0 && (
                <p className="text-xs text-expense">
                  {overdueCount} tugas terlambat
                </p>
              )}
            </div>
          )}
        </section>

        {/* Jadwal */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Jadwal
            </h2>
            <SectionLink href="/productivity/schedule" />
          </div>

          {[...todayEvents, ...upcomingEvents].length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Tidak ada acara minggu ini.
            </p>
          ) : (
            <div className="space-y-2.5">
              {[...todayEvents, ...upcomingEvents].slice(0, 3).map((event) => (
                <div key={event.eventId} className="flex items-start gap-2.5">
                  <Clock
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.date === todayKey
                        ? "Hari ini"
                        : formatDueLabel(event.date, today)}
                      {event.startTime ? ` · ${event.startTime}` : ""}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Habit */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Flame className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Habit
            </h2>
            <SectionLink href="/productivity/habits" />
          </div>

          {habitProgress.total === 0 ? (
            <p className="text-xs text-muted-foreground">
              Belum ada habit hari ini.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {habitProgress.done}/{habitProgress.total} selesai
                </span>
                {bestStreak > 0 && (
                  <span className="font-medium text-capybara">
                    🔥 streak {bestStreak} hari
                  </span>
                )}
              </div>
              <Progress
                value={
                  (habitProgress.done / habitProgress.total) * 100
                }
              />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {habits
                  .filter((h) => isHabitDueOn(h, today))
                  .map((h) => {
                    const Icon = getHabitIcon(h.icon);
                    return (
                      <span
                        key={h.habitId}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border",
                          h.completedDates.includes(todayKey)
                            ? "border-income/40 bg-income/10 text-income"
                            : "border-border text-muted-foreground"
                        )}
                        title={h.name}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    );
                  })}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
