"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Habit, CreateHabitInput } from "@/types";
import { habitsService } from "@/lib/firestore/habits";
import { useAppStore } from "@/store/useAppStore";

/**
 * Realtime hook untuk habit tracker. Habit scoped per-uid — panggil
 * dengan uid sendiri untuk mode editable, uid pasangan untuk mode
 * read-only (streak & progress tetap terlihat).
 */
export function useHabits(uid: string | undefined) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    const q = query(collection(db, "habits"), where("uid", "==", uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          habitId: doc.id,
        })) as Habit[];
        setHabits(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching habits:", err);
        setError("Gagal memuat habit. Coba lagi nanti.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return {
    habits,
    isLoading,
    error,
    create: (input: CreateHabitInput) => habitsService.create(input),
    update: (id: string, data: Parameters<typeof habitsService.update>[1]) =>
      habitsService.update(id, data),
    toggleDate: (id: string, date: string, done: boolean) =>
      habitsService.toggleDate(id, date, done),
    remove: (id: string) => habitsService.remove(id),
  };
}

/** Kemudahan akses uid sendiri + pasangan untuk tab Saya/Partner. */
export function useHabitOwners() {
  const currentUser = useAppStore((s) => s.currentUser);
  const partner = useAppStore((s) => s.partner);
  return { currentUser, partner };
}
