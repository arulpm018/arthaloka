"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, CreateTaskInput } from "@/types";
import { tasksService } from "@/lib/firestore/tasks";
import { useAppStore } from "@/store/useAppStore";
import { sortTasks } from "@/lib/utils/productivity";

/**
 * Realtime hook untuk to-do list. Hanya mengambil tugas milik sendiri
 * (owner = role) + tugas "shared" — tugas pribadi pasangan tidak pernah
 * terkirim ke client.
 */
export function useTasks() {
  const role = useAppStore((s) => s.currentUser?.role);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!role) return;

    const q = query(
      collection(db, "tasks"),
      where("owner", "in", [role, "shared"])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          taskId: doc.id,
        })) as Task[];
        setTasks(sortTasks(data));
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching tasks:", err);
        setError("Gagal memuat tugas. Coba lagi nanti.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [role]);

  return {
    tasks,
    isLoading,
    error,
    create: (input: CreateTaskInput) => tasksService.create(input),
    update: (id: string, data: Parameters<typeof tasksService.update>[1]) =>
      tasksService.update(id, data),
    setCompleted: (id: string, completed: boolean) =>
      tasksService.setCompleted(id, completed),
    remove: (id: string) => tasksService.remove(id),
  };
}
