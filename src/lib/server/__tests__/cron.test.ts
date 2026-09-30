import { describe, it, expect } from "vitest";
import { isCronAuthorized } from "@/lib/server/cron";

const req = (authorization?: string) =>
  new Request("http://localhost/api/cron/x", { headers: authorization ? { authorization } : {} });

describe("isCronAuthorized", () => {
  it("secret cocok → true", () => {
    expect(isCronAuthorized(req("Bearer s3cret"), "s3cret")).toBe(true);
  });
  it("secret salah / tanpa header → false", () => {
    expect(isCronAuthorized(req("Bearer lain"), "s3cret")).toBe(false);
    expect(isCronAuthorized(req(), "s3cret")).toBe(false);
  });
  it("CRON_SECRET belum di-set → selalu false", () => {
    expect(isCronAuthorized(req("Bearer undefined"), undefined)).toBe(false);
    expect(isCronAuthorized(req("Bearer "), "")).toBe(false);
  });
});
