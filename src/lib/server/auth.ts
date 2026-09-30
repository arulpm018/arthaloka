import { NextResponse } from "next/server";
import { adminAuth } from "./firebaseAdmin";

export interface AuthedUser {
  uid: string;
  email: string;
}

export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export type VerifyIdToken = (token: string) => Promise<{ uid: string; email?: string }>;

/** Whitelist email (lowercase). ALLOWED_EMAILS (server) diutamakan. */
export function allowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS || process.env.NEXT_PUBLIC_ALLOWED_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Verifikasi `Authorization: Bearer <Firebase ID token>` + whitelist email. */
export async function verifyRequest(
  req: Request,
  verify: VerifyIdToken = (token) => adminAuth().verifyIdToken(token)
): Promise<AuthedUser> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new AuthError(401, "Belum login");

  let decoded: { uid: string; email?: string };
  try {
    decoded = await verify(token);
  } catch {
    throw new AuthError(401, "Sesi login tidak valid, coba login ulang");
  }

  const email = (decoded.email ?? "").toLowerCase();
  if (!email || !allowedEmails().includes(email)) {
    throw new AuthError(403, "Akun ini tidak diizinkan");
  }
  return { uid: decoded.uid, email };
}

/** Ubah error dari `verifyRequest` jadi respons JSON. */
export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[auth]", error);
  return NextResponse.json({ error: "Gagal memverifikasi login" }, { status: 500 });
}
