import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Habit, CreateHabitInput } from "@/types";

const COLLECTION = "habits";

export const habitsService = {
  create: async (input: CreateHabitInput): Promise<string> => {
    const ref = await addDoc(collection(db, COLLECTION), {
      ...input,
      completedDates: [],
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  update: async (
    id: string,
    data: Partial<Pick<Habit, "name" | "icon" | "frequency">>
  ): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, id), { ...data });
  },

  /** Centang/batal centang satu tanggal tanpa menimpa array dari client. */
  toggleDate: async (
    id: string,
    date: string,
    done: boolean
  ): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, id), {
      completedDates: done ? arrayUnion(date) : arrayRemove(date),
    });
  },

  remove: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION, id));
  },
};
