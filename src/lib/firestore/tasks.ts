import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, CreateTaskInput } from "@/types";

const COLLECTION = "tasks";

export const tasksService = {
  create: async (input: CreateTaskInput): Promise<string> => {
    const ref = await addDoc(collection(db, COLLECTION), {
      ...input,
      notes: input.notes ?? null,
      dueDate: input.dueDate ?? null,
      completed: false,
      completedAt: null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  update: async (
    id: string,
    data: Partial<Pick<Task, "title" | "notes" | "dueDate" | "owner">>
  ): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, id), { ...data });
  },

  setCompleted: async (id: string, completed: boolean): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, id), {
      completed,
      completedAt: completed ? serverTimestamp() : null,
    });
  },

  remove: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION, id));
  },
};
