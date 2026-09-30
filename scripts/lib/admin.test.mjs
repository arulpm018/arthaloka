import { describe, it, expect } from "vitest";
import { createBatchWriter } from "./admin.mjs";

/** Fake Firestore: catat berapa operasi tiap batch yang di-commit. */
function fakeDb() {
  const committed = [];
  return {
    committed,
    batch() {
      const ops = [];
      return {
        update: (...args) => ops.push(args),
        commit: async () => committed.push(ops.length),
      };
    },
  };
}

describe("createBatchWriter", () => {
  it("commit tiap 450 operasi, sisanya saat flush", async () => {
    const db = fakeDb();
    const writer = createBatchWriter(db);
    for (let i = 0; i < 1000; i++) await writer.queue((b) => b.update(i));
    await writer.flush();
    expect(db.committed).toEqual([450, 450, 100]);
  });

  it("flush tanpa operasi tidak commit", async () => {
    const db = fakeDb();
    await createBatchWriter(db).flush();
    expect(db.committed).toEqual([]);
  });
});
