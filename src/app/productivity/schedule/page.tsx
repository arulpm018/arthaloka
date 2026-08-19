"use client";

import { useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, MapPin, CalendarDays, Clock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { CalendarGrid } from "@/components/productivity/schedule/CalendarGrid";
import { EventSheet } from "@/components/productivity/schedule/EventSheet";
import { useEvents } from "@/hooks/useEvents";
import { useAppStore } from "@/store/useAppStore";
import { ScheduleEvent } from "@/types";
import { dateKey, formatFullDate } from "@/lib/utils/productivity";

export default function SchedulePage() {
  const { events, isLoading, error, create, update, remove } = useEvents();
  const uid = useAppStore((s) => s.currentUser?.uid);

  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selected, setSelected] = useState<Date>(today);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  const selectedKey = dateKey(selected);
  const dayEvents = events.filter((e) => e.date === selectedKey);

  const prevMonth = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  const openCreate = () => {
    setEditingEvent(null);
    setSheetOpen(true);
  };

  const openEdit = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setSheetOpen(true);
  };

  const handleSheetSubmit = async (values: {
    title: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    notes: string | null;
  }) => {
    if (editingEvent) {
      await update(editingEvent.eventId, values);
    } else if (uid) {
      await create({ ...values, createdBy: uid });
    }
  };

  return (
    <>
      <Header title="Jadwal">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </Header>

      <div className="mx-auto max-w-2xl p-4">
        {/* Navigasi bulan */}
        <div className="mb-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Bulan sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-medium capitalize">
            {viewMonth.toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Bulan berikutnya">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <CalendarGrid
          year={viewMonth.getFullYear()}
          month={viewMonth.getMonth()}
          events={events}
          selected={selected}
          today={today}
          onSelect={setSelected}
        />

        {error && <p className="mt-4 text-xs text-destructive">{error}</p>}

        {/* Agenda hari terpilih */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium">
            {formatFullDate(selected)}
          </h2>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat jadwal…</p>
          ) : dayEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Tidak ada acara"
              description="Tanggal ini kosong — tambah acara baru?"
            />
          ) : (
            <div className="space-y-2">
              {dayEvents.map((event) => (
                <button
                  key={event.eventId}
                  type="button"
                  onClick={() => openEdit(event)}
                  className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3.5 text-left transition-colors hover:bg-accent/50 active:bg-accent"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">
                      {event.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {event.startTime && (
                        <span className="tabular-nums">
                          {event.startTime}
                          {event.endTime ? `–${event.endTime}` : ""}
                        </span>
                      )}
                      {event.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    {event.notes && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {event.notes}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <EventSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        event={editingEvent}
        defaultDate={selectedKey}
        onSubmit={handleSheetSubmit}
        onDelete={(event) => remove(event.eventId)}
      />
    </>
  );
}
