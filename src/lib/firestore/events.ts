import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ScheduleEvent, CreateEventInput } from "@/types";

const COLLECTION = "events";

export const eventsService = {
  create: async (input: CreateEventInput): Promise<string> => {
    const ref = await addDoc(collection(db, COLLECTION), {
      ...input,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  update: async (
    id: string,
    data: Partial<
      Pick<
        ScheduleEvent,
        | "title"
        | "date"
        | "startTime"
        | "endTime"
        | "location"
        | "notes"
        | "owner"
      >
    >
  ): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, id), { ...data });
  },

  remove: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION, id));
  },
};
