import { describe, it, expect, afterEach, vi } from "vitest";
import { AuthError, allowedEmails, verifyRequest } from "@/lib/server/auth";
import { AdminConfigError } from "@/lib/server/firebaseAdmin";

const req = (authorization?: string) =>
  new Request("http://localhost/api/x", {
    headers: authorization ? { authorization } : {},
  });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("allowedEmails", () => {
  it("ALLOWED_EMAILS diutamakan, lowercase & trim", () => {
    vi.stubEnv("ALLOWED_EMAILS", " A@x.com , b@x.com ");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAILS", "lain@x.com");
    expect(allowedEmails()).toEqual(["a@x.com", "b@x.com"]);
  });
  it("fallback ke NEXT_PUBLIC_ALLOWED_EMAILS", () => {
    vi.stubEnv("ALLOWED_EMAILS", "");
    vi.stubEnv("NEXT_PUBLIC_ALLOWED_EMAILS", "c@x.com");
    expect(allowedEmails()).toEqual(["c@x.com"]);
  });
});

describe("verifyRequest", () => {
  it("tanpa header → 401", async () => {
    await expect(verifyRequest(req(), vi.fn())).rejects.toMatchObject({ status: 401 });
  });

  it("token tidak valid → 401", async () => {
    const verify = vi.fn().mockRejectedValue(new Error("expired"));
    const err = await verifyRequest(req("Bearer abc"), verify).catch((e) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.status).toBe(401);
  });

  it("server belum dikonfigurasi → error konfigurasi, bukan 401", async () => {
    const verify = vi.fn().mockRejectedValue(new AdminConfigError("FIREBASE_SERVICE_ACCOUNT belum di-set"));
    const err = await verifyRequest(req("Bearer abc"), verify).catch((e) => e);
    expect(err).toBeInstanceOf(AdminConfigError);
    expect(err).not.toBeInstanceOf(AuthError);
  });

  it("email di luar whitelist → 403", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "arul@x.com");
    const verify = vi.fn().mockResolvedValue({ uid: "u1", email: "orang@x.com" });
    await expect(verifyRequest(req("Bearer abc"), verify)).rejects.toMatchObject({ status: 403 });
  });

  it("valid → uid & email (case-insensitive)", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "arul@x.com");
    const verify = vi.fn().mockResolvedValue({ uid: "u1", email: "Arul@X.com" });
    await expect(verifyRequest(req("Bearer abc"), verify)).resolves.toEqual({
      uid: "u1",
      email: "arul@x.com",
    });
    expect(verify).toHaveBeenCalledWith("abc");
  });
});
