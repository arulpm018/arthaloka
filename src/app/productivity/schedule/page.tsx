"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin, CalendarDays, Clock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { FAB } from "@/components/layout/FAB";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { CalendarGrid } from "@/components/productivity/schedule/CalendarGrid";
import { EventSheet } from "@/components/productivity/schedule/EventSheet";
import { useEvents } from "@/hooks/useEvents";
import { useAppStore } from "@/store/useAppStore";
import { Owner, ScheduleEvent } from "@/types";
import { OWNER_COLORS, OWNER_LABELS } from "@/lib/constants/labels";
import { cn } from "@/lib/utils/cn";
import { dateKey, formatFullDate, getEventOwner } from "@/lib/utils/productivity";

type OwnerFilter = Owner | "all";

const ownerFilters: { value: OwnerFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "arul", label: OWNER_LABELS.arul },
  { value: "fifi", label: OWNER_LABELS.fifi },
  { value: "shared", label: OWNER_LABELS.shared },
];

/** Suspense wajib untuk useSearchParams pada prerender statis (pola halaman transactions). */
export default function SchedulePage() {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <SchedulePageContent />
    </Suspense>
  );
}

function SchedulePageContent() {
  const { events, isLoading, error, create, update, remove } = useEvents();
  const currentUser = useAppStore((s) => s.currentUser);
  const partner = useAppStore((s) => s.partner);
  const uid = currentUser?.uid;
  const myOwner: Owner = currentUser?.role === "fifi" ? "fifi" : "arul";

  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selected, setSelected] = useState<Date>(today);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  // uid → Owner untuk menurunkan pemilik event lama yang belum punya field owner.
  const uidToOwner = useMemo(() => {
    const map: Record<string, Owner> = {};
    if (currentUser?.uid) map[currentUser.uid] = myOwner;
    if (partner?.uid && partner.role !== currentUser?.role) {
      map[partner.uid] = partner.role === "fifi" ? "fifi" : "arul";
    }
    return map;
  }, [currentUser, partner, myOwner]);

  const resolvedEvents = useMemo(
    () => events.map((e) => ({ ...e, owner: getEventOwner(e, uidToOwner) })),
    [events, uidToOwner]
  );

  const visibleEvents =
    ownerFilter === "all"
      ? resolvedEvents
      : resolvedEvents.filter((e) => e.owner === ownerFilter);

  const selectedKey = dateKey(selected);
  const dayEvents = visibleEvents.filter((e) => e.date === selectedKey);

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

  // Deep-link ?add=1 dari FAB halaman "Hari Ini" — buka sheet lalu bersihkan URL
  // supaya refresh tidak membuka sheet lagi.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      openCreate();
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSheetSubmit = async (values: {
    title: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    notes: string | null;
    owner: Owner;
  }) => {
    if (editingEvent) {
      await update(editingEvent.eventId, values);
    } else if (uid) {
      await create({ ...values, createdBy: uid });
    }
  };

  return (
    <>
      {/* Tambah via FAB kanan bawah — tombol header dihapus biar tidak redundan */}
      <Header title="Jadwal" />

      <div className="mx-auto w-full max-w-2xl p-4 md:max-w-5xl md:p-6">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
          <div>
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

            {/* Filter pemilik — sekaligus legenda warna kalender */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {ownerFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setOwnerFilter(filter.value)}
                  aria-pressed={ownerFilter === filter.value}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    ownerFilter === filter.value
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  {filter.value !== "all" && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: OWNER_COLORS[filter.value] }}
                      aria-hidden="true"
                    />
                  )}
                  {filter.label}
                </button>
              ))}
            </div>

            <CalendarGrid
              year={viewMonth.getFullYear()}
              month={viewMonth.getMonth()}
              events={visibleEvents}
              selected={selected}
              today={today}
              onSelect={setSelected}
            />

            {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
          </div>

          {/* Agenda hari terpilih */}
          <section className="mt-8 lg:mt-0 lg:sticky lg:top-6">
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
              {dayEvents.map((event) => {
                const ownerColor = OWNER_COLORS[event.owner ?? "shared"];
                return (
                  <button
                    key={event.eventId}
                    type="button"
                    onClick={() => openEdit(event)}
                    className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3.5 text-left transition-colors hover:bg-accent/50 active:bg-accent"
                    style={{ borderLeft: `3px solid ${ownerColor}` }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${ownerColor}1A`, color: ownerColor }}
                    >
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        {event.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-medium text-foreground/70">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: ownerColor }}
                            aria-hidden="true"
                          />
                          {OWNER_LABELS[event.owner ?? "shared"]}
                        </span>
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
                );
              })}
            </div>
          )}
        </section>
        </div>
      </div>

      <EventSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        event={editingEvent}
        defaultDate={selectedKey}
        defaultOwner={myOwner}
        onSubmit={handleSheetSubmit}
        onDelete={(event) => remove(event.eventId)}
      />

      {/* FAB tambah — konsisten dengan modul keuangan */}
      <FAB showOnDesktop ariaLabel="Tambah acara" onClick={openCreate} />
    </>
  );
}
