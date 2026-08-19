"use client";

import { cn } from "@/lib/utils/cn";
import { Owner, ScheduleEvent } from "@/types";
import { OWNER_COLORS } from "@/lib/constants/labels";
import {
  DAY_LABELS_SHORT,
  dateKey,
  getMonthGrid,
  isSameDay,
} from "@/lib/utils/productivity";

interface CalendarGridProps {
  year: number;
  month: number;
  /** Event dengan `owner` sudah di-resolve oleh pemanggil */
  events: ScheduleEvent[];
  selected: Date;
  today: Date;
  onSelect: (date: Date) => void;
}

const MAX_DOTS = 3;

export const CalendarGrid = ({
  year,
  month,
  events,
  selected,
  today,
  onSelect,
}: CalendarGridProps) => {
  // Pemilik acara per tanggal — menentukan warna titik (ala Google Calendar).
  const ownersByDate = new Map<string, Owner[]>();
  for (const event of events) {
    const list = ownersByDate.get(event.date) ?? [];
    list.push(event.owner ?? "shared");
    ownersByDate.set(event.date, list);
  }

  const weeks = getMonthGrid(year, month);

  return (
    <div>
      {/* Header hari — Senin awal */}
      <div className="mb-1 grid grid-cols-7">
        {DAY_LABELS_SHORT.slice(1).concat(DAY_LABELS_SHORT[0]).map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[11px] font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((date) => {
          const key = dateKey(date);
          const owners = ownersByDate.get(key) ?? [];
          const count = owners.length;
          const isCurrentMonth = date.getMonth() === month;
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selected);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(date)}
              aria-label={`Pilih tanggal ${key}${count > 0 ? `, ${count} acara` : ""}`}
              aria-pressed={isSelected}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors",
                !isCurrentMonth && "text-muted-foreground/40",
                isCurrentMonth && "text-foreground",
                isSelected
                  ? "bg-accent font-semibold"
                  : "hover:bg-accent/50",
                isToday && !isSelected && "font-semibold"
              )}
            >
              {isToday && !isSelected && (
                <span className="sr-only">Hari ini</span>
              )}
              <span className={cn(isToday && "underline underline-offset-4")}>
                {date.getDate()}
              </span>
              {count > 0 && (
                <span className="flex h-1 items-center gap-0.5" aria-hidden="true">
                  {owners.slice(0, MAX_DOTS).map((owner, i) => (
                    <span
                      key={i}
                      className="h-1 w-1 rounded-full"
                      style={{
                        backgroundColor: OWNER_COLORS[owner],
                        opacity: isCurrentMonth ? 1 : 0.4,
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
