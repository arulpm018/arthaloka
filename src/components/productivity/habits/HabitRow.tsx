"use client";

import { Check, Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Habit } from "@/types";
import {
  DAY_LABELS_SHORT,
  dateKey,
  getWeekDates,
  getHabitStreak,
  isHabitDueOn,
  isHabitDoneOn,
  isSameDay,
} from "@/lib/utils/productivity";
import { getHabitIcon } from "@/lib/utils/habitIcons";

interface HabitRowProps {
  habit: Habit;
  today: Date;
  /** false = mode lihat punya pasangan (tidak bisa centang) */
  editable: boolean;
  onToggleToday: (habit: Habit, done: boolean) => void;
  onEdit: (habit: Habit) => void;
}

export const HabitRow = ({
  habit,
  today,
  editable,
  onToggleToday,
  onEdit,
}: HabitRowProps) => {
  const week = getWeekDates(today);
  const streak = getHabitStreak(habit, today);
  const dueToday = isHabitDueOn(habit, today);
  const doneToday = isHabitDoneOn(habit, today);
  const Icon = getHabitIcon(habit.icon);

  return (
    <div
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onClick={editable ? () => onEdit(habit) : undefined}
      onKeyDown={
        editable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit(habit);
              }
            }
          : undefined
      }
      className={cn(
        "rounded-lg border border-border bg-card p-3.5",
        editable && "transition-colors hover:bg-accent/50 active:bg-accent"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{habit.name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {habit.frequency.type === "daily" ? (
              <span>Setiap hari</span>
            ) : (
              <span>
                {habit.frequency.days
                  .map((d) => DAY_LABELS_SHORT[d])
                  .join(", ")}
              </span>
            )}
            {streak > 0 && (
              <span className="inline-flex items-center gap-0.5 font-medium text-capybara">
                <Flame className="h-3 w-3" aria-hidden="true" />
                {streak}
              </span>
            )}
          </div>
        </div>

        {/* Check hari ini */}
        {dueToday ? (
          <button
            type="button"
            disabled={!editable}
            onClick={(e) => {
              e.stopPropagation();
              onToggleToday(habit, !doneToday);
            }}
            aria-label={
              doneToday
                ? `Batalkan "${habit.name}" hari ini`
                : `Centang "${habit.name}" hari ini`
            }
            aria-pressed={doneToday}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              doneToday
                ? "border-income bg-income text-white"
                : "border-border text-transparent hover:border-muted-foreground",
              !editable && "opacity-60"
            )}
          >
            <Check className="h-5 w-5" strokeWidth={3} />
          </button>
        ) : (
          <span className="w-10 shrink-0 text-center text-[10px] text-muted-foreground">
            —
          </span>
        )}
      </div>

      {/* Strip mingguan Sen–Min */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {week.map((date) => {
          const due = isHabitDueOn(habit, date);
          const done = isHabitDoneOn(habit, date);
          const isToday = isSameDay(date, today);
          return (
            <div key={dateKey(date)} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "text-[10px]",
                  isToday ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {DAY_LABELS_SHORT[date.getDay()]}
              </span>
              <span
                aria-label={`${dateKey(date)}: ${done ? "selesai" : due ? "belum" : "tidak terjadwal"}`}
                className={cn(
                  "h-2 w-2 rounded-full",
                  done
                    ? "bg-income"
                    : due
                      ? "border border-muted-foreground/40"
                      : "bg-transparent"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
