import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

type Handler = (event: unknown) => void;

/** Jalankan public/sw.js di sandbox dengan `self` tiruan. */
function loadServiceWorker() {
  const handlers: Record<string, Handler> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const self = {
    addEventListener: (type: string, fn: Handler) => {
      handlers[type] = fn;
    },
    registration: { showNotification },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    location: { origin: "https://app.test" },
  };
  const source = readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf8");
  vm.runInNewContext(source, { self, URL });
  return { handlers, showNotification };
}

async function dispatchPush(handlers: Record<string, Handler>, data: unknown) {
  let pending: Promise<unknown> | undefined;
  handlers.push({
    data: { json: () => data, text: () => JSON.stringify(data) },
    waitUntil: (p: Promise<unknown>) => {
      pending = p;
    },
  });
  await pending;
}

describe("service worker push", () => {
  it("notif bertag tetap berbunyi saat menggantikan notif lama (renotify)", async () => {
    const { handlers, showNotification } = loadServiceWorker();
    await dispatchPush(handlers, { title: "Makan lewat budget", body: "x", url: "/budget", tag: "budget-c1" });
    expect(showNotification).toHaveBeenCalledWith(
      "Makan lewat budget",
      expect.objectContaining({ tag: "budget-c1", renotify: true, data: { url: "/budget" } })
    );
  });

  it("tanpa tag → renotify false (Chrome menolak renotify tanpa tag)", async () => {
    const { handlers, showNotification } = loadServiceWorker();
    await dispatchPush(handlers, { title: "Halo", body: "x", url: "/dashboard" });
    expect(showNotification).toHaveBeenCalledWith("Halo", expect.objectContaining({ renotify: false }));
  });
});
