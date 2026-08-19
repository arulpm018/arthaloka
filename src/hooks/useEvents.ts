"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ScheduleEvent, CreateEventInput } from "@/types";
import { eventsService } from "@/lib/firestore/events";

/**
 * Realtime hook untuk jadwal — kalender shared, semua acara kelihatan
 * berdua. Filtering per bulan/hari dilakukan di komponen (skala kecil).
 */
export function useEvents() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "events"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          eventId: doc.id,
        })) as ScheduleEvent[];
        // Urutkan per tanggal lalu jam mulai (nulls last).
        data.sort((a, b) => {
          if (a.date !== b.date) return a.date < b.date ? -1 : 1;
          return (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99");
        });
        setEvents(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching events:", err);
        setError("Gagal memuat jadwal. Coba lagi nanti.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return {
    events,
    isLoading,
    error,
    create: (input: CreateEventInput) => eventsService.create(input),
    update: (id: string, data: Parameters<typeof eventsService.update>[1]) =>
      eventsService.update(id, data),
    remove: (id: string) => eventsService.remove(id),
  };
}
