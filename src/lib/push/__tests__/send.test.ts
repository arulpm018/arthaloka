import { describe, it, expect, vi } from "vitest";
import { sendToUids, type StoredSubscription, type SubscriptionRepo } from "@/lib/push/send";

const sub = (id: string, uid: string): StoredSubscription => ({
  id,
  uid,
  endpoint: `https://push.example/${id}`,
  keys: { p256dh: "p", auth: "a" },
});

const makeRepo = (subs: StoredSubscription[]) => {
  const removed: string[] = [];
  const repo: SubscriptionRepo = {
    listByUids: vi.fn(async (uids: string[]) => subs.filter((s) => uids.includes(s.uid))),
    remove: vi.fn(async (id: string) => {
      removed.push(id);
    }),
  };
  return { repo, removed };
};

const payload = { title: "T", body: "B", url: "/x" };

describe("sendToUids", () => {
  it("kirim ke semua HP milik uid target saja", async () => {
    const { repo } = makeRepo([sub("s1", "arul"), sub("s2", "arul"), sub("s3", "fifi")]);
    const send = vi.fn().mockResolvedValue({});
    const res = await sendToUids(repo, ["arul"], payload, send);
    expect(res).toEqual({ sent: 2, removed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(JSON.parse(send.mock.calls[0][1])).toEqual(payload);
  });

  it("410/404 → langganan dihapus, sisanya tetap terkirim", async () => {
    const { repo, removed } = makeRepo([sub("s1", "arul"), sub("s2", "arul")]);
    const send = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }))
      .mockResolvedValueOnce({});
    const res = await sendToUids(repo, ["arul"], payload, send);
    expect(res).toEqual({ sent: 1, removed: 1 });
    expect(removed).toEqual(["s1"]);
  });

  it("error lain → tidak dihapus, tidak throw", async () => {
    const { repo, removed } = makeRepo([sub("s1", "arul")]);
    const send = vi.fn().mockRejectedValue(Object.assign(new Error("timeout"), { statusCode: 500 }));
    await expect(sendToUids(repo, ["arul"], payload, send)).resolves.toEqual({ sent: 0, removed: 0 });
    expect(removed).toEqual([]);
  });

  it("VAPID belum di-set (send null) → dilewati", async () => {
    const { repo } = makeRepo([sub("s1", "arul")]);
    await expect(sendToUids(repo, ["arul"], payload, null)).resolves.toEqual({ sent: 0, removed: 0 });
    expect(repo.listByUids).not.toHaveBeenCalled();
  });

  it("tanpa target → tidak query", async () => {
    const { repo } = makeRepo([]);
    await sendToUids(repo, [], payload, vi.fn());
    expect(repo.listByUids).not.toHaveBeenCalled();
  });
});
