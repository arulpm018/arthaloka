import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";

/**
 * Runtime Vercel menolak require() terhadap paket ESM-only (ERR_REQUIRE_ESM),
 * sementara Node lokal yang baru mengizinkannya. Simulasikan dengan
 * --no-experimental-require-module supaya dependency server yang
 * ESM-only ketahuan sebelum deploy.
 */
describe("dependency server bisa di-require tanpa require(esm)", () => {
  it.each(["firebase-admin/app", "firebase-admin/auth", "firebase-admin/firestore", "web-push"])("%s", (mod) => {
    const result = spawnSync(
      process.execPath,
      ["--no-experimental-require-module", "-e", `require(${JSON.stringify(mod)})`],
      { encoding: "utf8" }
    );
    expect(result.stderr).not.toMatch(/ERR_REQUIRE_ESM/);
    expect(result.status).toBe(0);
  });
});
