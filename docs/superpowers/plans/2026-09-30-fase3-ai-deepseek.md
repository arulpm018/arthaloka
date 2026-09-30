# Fase 3 — Asisten AI DeepSeek (Teks Saja) di Vercel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prometheus jalan langsung sebagai API route Next.js di Vercel memakai DeepSeek (`deepseek-flash`, thinking dimatikan), hanya input teks, dengan 8 tool keuangan dan verifikasi token Firebase; service Python + Docker dibuang.

**Architecture:** `POST /api/ai/chat` memverifikasi ID token (firebase-admin) → loop agent (maks 5 putaran) antara DeepSeek (`fetch` OpenAI-compatible) dan eksekutor tool. Tool bicara ke interface `FinanceStore`; implementasi Firestore Admin untuk produksi, fake in-memory untuk test. Riwayat chat dikirim dari HP (server stateless).

**Tech Stack:** Next.js 14 route handler (runtime nodejs), firebase-admin (sudah terpasang di Fase 2), DeepSeek Chat Completions API, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-household-finance-redesign-design.md` (bagian "Fase 3")

**Prasyarat:** Fase 1 & 2 selesai (`firebase-admin` sudah ada di `package.json`).

## Global Constraints

- Endpoint DeepSeek: `https://api.deepseek.com/chat/completions`; model dari env `DEEPSEEK_MODEL`, default **`deepseek-flash`**; body wajib `thinking: { type: "disabled" }`. (`deepseek-chat` sudah dipensiunkan 2026-07-24.)
- Env server: `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` (opsional), `FIREBASE_SERVICE_ACCOUNT` (JSON satu baris), `ALLOWED_EMAILS` (fallback `NEXT_PUBLIC_ALLOWED_EMAILS`).
- `uid` HANYA dari ID token terverifikasi — tidak pernah dari body.
- Maks 5 putaran tool per pesan; maks 20 pesan riwayat; maks 2000 karakter per pesan.
- Zona waktu tanggal: WIB (UTC+7) — server Vercel berjalan di UTC.
- Transaksi dari AI: `owner` = pemilik rekening, `ownerUid` = uid token, saldo lewat batch + `FieldValue.increment` memakai `computeBalanceDelta`.
- Hindari `for…of` atas `Map`/`Set` dan spread `Set`/string (tsconfig tanpa `target` → error downlevelIteration); pakai `forEach`/array.
- Jangan baca/ubah `.env*`, kecuali menghapus `.env.production.example` (file contoh khusus Docker, tanpa rahasia) di Task 6.
- Setelah tiap task: `npm run lint && npm test && npm run build` hijau.
- Commit message gaya repo + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Satu balasan model berisi beberapa `tool_calls`** → setiap `tool_call_id` wajib dibalas pesan `role: "tool"` (kalau tidak, DeepSeek menolak 400 di putaran berikut). Dipin test agent "dua tool call sekaligus" (Task 4).
2. **Nominal dikirim model sebagai string** ("25rb", "Rp22.000", "1,5jt") → dinormalisasi, bukan error. Dipin test `normalizeAmount` (Task 2).
3. **Batch dengan satu item invalid** → tidak ada yang tersimpan, pesan "Gagal … item N" agar model memperbaiki. Dipin test tool (Task 3).
4. **"kemarin"/tanggal tanpa jam dihitung di WIB, bukan UTC** (Vercel UTC; 00:30 WIB = 17:30 UTC hari sebelumnya). Dipin test `parseDateInput` & `wib*` (Task 1, 2).
5. **Token kedaluwarsa / email di luar whitelist** → 401/403 dengan pesan Indonesia, sheet menampilkan pesan itu. Dipin test `verifyRequest` (Task 1).

---

### Task 1: Util WIB + Firebase Admin + verifikasi request

**Files:**
- Create: `src/lib/utils/wib.ts`, `src/lib/utils/__tests__/wib.test.ts`, `src/lib/server/firebaseAdmin.ts`, `src/lib/server/auth.ts`, `src/lib/server/__tests__/auth.test.ts`, `src/lib/authFetch.ts`

**Interfaces:**
- Produces:
  - `WIB_OFFSET_MS`, `MONTH_NAMES_ID: string[]`
  - `wibParts(instant: Date): { year; month /*0-11*/; day; hour; minute }`
  - `wibDate(year, month, day, hour = 0, minute = 0): Date`
  - `wibDayRange(instant): { start: Date; end: Date }` (end eksklusif)
  - `wibMonthRange(year, month): { start: Date; end: Date }` (month boleh overflow)
  - `wibMonthKey(instant): string` ("2026-09"), `wibIsoDate(instant): string` ("2026-09-30"), `wibPreviousMonth(instant): { year; month }`
  - `adminApp()`, `adminDb(): Firestore`, `adminAuth(): Auth`
  - `class AuthError extends Error { status: 401 | 403 }`, `interface AuthedUser { uid: string; email: string }`
  - `allowedEmails(): string[]`
  - `verifyRequest(req: Request, verify?: VerifyIdToken): Promise<AuthedUser>`
  - `authErrorResponse(error: unknown): NextResponse`
  - `authFetch(input: string, init?: RequestInit): Promise<Response>` (client, menambah header `Authorization: Bearer <idToken>`)

- [ ] **Step 1: Tulis test gagal — `src/lib/utils/__tests__/wib.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  wibDayRange,
  wibIsoDate,
  wibMonthKey,
  wibMonthRange,
  wibParts,
  wibPreviousMonth,
} from "@/lib/utils/wib";

describe("wib", () => {
  it("wibParts: 18:30 UTC = 01:30 WIB hari berikutnya", () => {
    expect(wibParts(new Date("2026-09-30T18:30:00Z"))).toEqual({
      year: 2026,
      month: 9,
      day: 1,
      hour: 1,
      minute: 30,
    });
  });

  it("wibDayRange: [00:00 WIB, 00:00 WIB besok)", () => {
    const { start, end } = wibDayRange(new Date("2026-09-30T18:30:00Z"));
    expect(start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-01T17:00:00.000Z");
  });

  it("wibMonthRange: September 2026 & overflow Desember", () => {
    const sep = wibMonthRange(2026, 8);
    expect(sep.start.toISOString()).toBe("2026-08-31T17:00:00.000Z");
    expect(sep.end.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(wibMonthRange(2026, 11).end.toISOString()).toBe("2026-12-31T17:00:00.000Z");
  });

  it("wibMonthKey & wibIsoDate memakai kalender WIB", () => {
    const instant = new Date("2026-09-30T17:00:00Z"); // 1 Okt 00:00 WIB
    expect(wibMonthKey(instant)).toBe("2026-10");
    expect(wibIsoDate(instant)).toBe("2026-10-01");
  });

  it("wibPreviousMonth melewati tahun", () => {
    expect(wibPreviousMonth(new Date("2027-01-05T03:00:00Z"))).toEqual({ year: 2026, month: 11 });
    expect(wibPreviousMonth(new Date("2026-10-01T03:00:00Z"))).toEqual({ year: 2026, month: 8 });
  });
});
```

- [ ] **Step 2: Tulis test gagal — `src/lib/server/__tests__/auth.test.ts`**

```ts
import { describe, it, expect, afterEach, vi } from "vitest";
import { AuthError, allowedEmails, verifyRequest } from "@/lib/server/auth";

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
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/utils/__tests__/wib.test.ts src/lib/server/__tests__/auth.test.ts`
Expected: FAIL — modul `@/lib/utils/wib` dan `@/lib/server/auth` tidak ditemukan.

- [ ] **Step 4: Implementasi `src/lib/utils/wib.ts`**

```ts
/**
 * Kalender WIB (UTC+7, tanpa DST). Server Vercel berjalan di UTC, jadi
 * batas hari/bulan untuk AI, notifikasi, dan cron dihitung lewat helper ini.
 */
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

export const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Komponen kalender WIB dari sebuah instant. `month` 0–11. */
export function wibParts(instant: Date) {
  const shifted = new Date(instant.getTime() + WIB_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** Instant untuk jam dinding WIB tertentu (argumen boleh overflow, mis. month 12). */
export function wibDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month, day, hour, minute) - WIB_OFFSET_MS);
}

/** [start, end) hari WIB yang memuat `instant`. */
export function wibDayRange(instant: Date): { start: Date; end: Date } {
  const { year, month, day } = wibParts(instant);
  const start = wibDate(year, month, day);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** [start, end) bulan WIB. `month` 0–11, boleh overflow. */
export function wibMonthRange(year: number, month: number): { start: Date; end: Date } {
  return { start: wibDate(year, month, 1), end: wibDate(year, month + 1, 1) };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-09" */
export function wibMonthKey(instant: Date): string {
  const { year, month } = wibParts(instant);
  return `${year}-${pad(month + 1)}`;
}

/** "2026-09-30" */
export function wibIsoDate(instant: Date): string {
  const { year, month, day } = wibParts(instant);
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** Bulan sebelum bulan WIB dari `instant`. */
export function wibPreviousMonth(instant: Date): { year: number; month: number } {
  const { year, month } = wibParts(instant);
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}
```

- [ ] **Step 5: Implementasi `src/lib/server/firebaseAdmin.ts`**

```ts
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin untuk route handler (bypass rules — selalu verifikasi user
 * dulu lewat `verifyRequest`). Kredensial: env FIREBASE_SERVICE_ACCOUNT berisi
 * JSON service account satu baris (`jq -c . sa.json`).
 */
function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT belum di-set");
  const parsed = JSON.parse(raw);
  // Beberapa dashboard env menyimpan newline private key sebagai "\\n" literal.
  if (typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  return parsed;
}

export function adminApp(): App {
  return getApps()[0] ?? initializeApp({ credential: cert(serviceAccount()) });
}

export const adminDb = () => getFirestore(adminApp());
export const adminAuth = () => getAuth(adminApp());
```

- [ ] **Step 6: Implementasi `src/lib/server/auth.ts`**

```ts
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
```

- [ ] **Step 7: Implementasi `src/lib/authFetch.ts`**

```ts
"use client";

import { auth } from "@/lib/firebase";

/** `fetch` ke API internal dengan ID token Firebase user yang sedang login. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error("Belum login");
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
```

- [ ] **Step 8: Jalankan test, pastikan lulus**

Run: `npx vitest run src/lib/utils/__tests__/wib.test.ts src/lib/server/__tests__/auth.test.ts`
Expected: PASS.

- [ ] **Step 9: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "fondasi server: util kalender WIB, firebase-admin, verifikasi ID token + whitelist, authFetch client

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Parser input AI (nominal, tanggal, nama)

**Files:**
- Create: `src/lib/ai/parse.ts`, `src/lib/ai/__tests__/parse.test.ts`

**Interfaces:**
- Consumes: `wibDate`, `wibIsoDate` (Task 1).
- Produces:
  - `normalizeAmount(input: number | string): number` — bulat > 0, throw `Error` berbahasa Indonesia kalau tak terbaca.
  - `parseDateInput(value: string | undefined | null, now: Date): Date`
  - `pickByName<T extends { name: string }>(items: T[], name: string, kind: string): T` — exact → awalan → mengandung → nama item terkandung di input (≥3 huruf); throw kalau tidak ketemu (menyebut daftar yang ada).

- [ ] **Step 1: Tulis test gagal — `src/lib/ai/__tests__/parse.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { normalizeAmount, parseDateInput, pickByName } from "@/lib/ai/parse";

describe("normalizeAmount", () => {
  it.each([
    [25000, 25000],
    [22.4, 22],
    ["25000", 25000],
    ["25rb", 25000],
    ["25k", 25000],
    ["22 ribu", 22000],
    ["1,5jt", 1_500_000],
    ["1.5 juta", 1_500_000],
    ["Rp22.000", 22000],
    ["1.500.000", 1_500_000],
    ["22,000", 22000],
  ])("%s → %d", (input, expected) => {
    expect(normalizeAmount(input)).toBe(expected);
  });

  it.each([["abc"], [""], [0], [-5], ["0rb"]])("%s → error", (input) => {
    expect(() => normalizeAmount(input as number | string)).toThrow();
  });
});

describe("parseDateInput", () => {
  const now = new Date("2026-09-30T05:00:00Z"); // 30 Sep 12:00 WIB

  it("kosong / 'hari ini' → sekarang", () => {
    expect(parseDateInput(undefined, now)).toBe(now);
    expect(parseDateInput("hari ini", now)).toBe(now);
  });
  it("'kemarin' → 24 jam lalu", () => {
    expect(parseDateInput("kemarin", now).toISOString()).toBe("2026-09-29T05:00:00.000Z");
  });
  it("tanggal hari ini (WIB) → sekarang", () => {
    expect(parseDateInput("2026-09-30", now)).toBe(now);
  });
  it("tanggal lain → 12:00 WIB", () => {
    expect(parseDateInput("2026-09-28", now).toISOString()).toBe("2026-09-28T05:00:00.000Z");
  });
  it("tanggal + jam → jam WIB", () => {
    expect(parseDateInput("2026-09-28 19:30", now).toISOString()).toBe("2026-09-28T12:30:00.000Z");
  });
  it("tak dikenal → sekarang", () => {
    expect(parseDateInput("minggu depan kayaknya", now)).toBe(now);
  });
});

describe("pickByName", () => {
  const items = [{ name: "BCA" }, { name: "Bank Jago" }, { name: "Jago Bersama" }];

  it("exact (case-insensitive) diutamakan", () => {
    expect(pickByName(items, "bca", "Rekening").name).toBe("BCA");
  });
  it("awalan", () => {
    expect(pickByName(items, "bank", "Rekening").name).toBe("Bank Jago");
  });
  it("mengandung", () => {
    expect(pickByName(items, "bersama", "Rekening").name).toBe("Jago Bersama");
  });
  it("nama item terkandung di input", () => {
    expect(pickByName(items, "bca punya arul", "Rekening").name).toBe("BCA");
  });
  it("tidak ketemu → error menyebut daftar", () => {
    expect(() => pickByName(items, "mandiri", "Rekening")).toThrow(/Rekening 'mandiri' tidak ditemukan.*BCA/);
  });
  it("nama kosong → error", () => {
    expect(() => pickByName(items, "  ", "Rekening")).toThrow();
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/ai/__tests__/parse.test.ts`
Expected: FAIL — modul `@/lib/ai/parse` tidak ditemukan.

- [ ] **Step 3: Implementasi `src/lib/ai/parse.ts`**

```ts
import { wibDate, wibIsoDate } from "@/lib/utils/wib";

const DAY_MS = 86_400_000;

// Urutan penting: "juta" sebelum "jt", "ribu" sebelum "rb".
const AMOUNT_SUFFIXES: [string, number][] = [
  ["juta", 1_000_000],
  ["jt", 1_000_000],
  ["ribu", 1_000],
  ["rb", 1_000],
  ["k", 1_000],
  ["m", 1_000_000],
];

/**
 * Nominal Rupiah bulat dari angka atau teks bebas model:
 * "25rb", "25k", "22 ribu", "1,5jt", "Rp22.000", "1.500.000", "22,000".
 */
export function normalizeAmount(input: number | string): number {
  let value: number;

  if (typeof input === "number") {
    value = input;
  } else {
    let s = input.toLowerCase().replace(/rp/g, "").trim();
    let multiplier = 1;
    const suffix = AMOUNT_SUFFIXES.find(([suf]) => s.includes(suf));
    if (suffix) {
      s = s.split(suffix[0])[0].trim().replace(",", ".");
      multiplier = suffix[1];
    } else {
      s = s.replace(/\s/g, "");
      if (s.includes(",") && s.includes(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else if (s.includes(",")) {
        const parts = s.split(",");
        s = parts[parts.length - 1].length === 3 ? parts.join("") : s.replace(",", ".");
      } else if (s.includes(".")) {
        const parts = s.split(".");
        if (parts[parts.length - 1].length === 3) s = parts.join("");
      }
    }
    const parsed = s === "" ? NaN : Number(s);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Nominal '${input}' tidak bisa dibaca. Pakai angka Rupiah penuh, mis. 25000.`);
    }
    value = parsed * multiplier;
  }

  const rounded = Math.round(value);
  if (!(rounded > 0)) throw new Error("Nominal harus lebih dari 0.");
  return rounded;
}

/**
 * Tanggal dari model: "YYYY-MM-DD", "YYYY-MM-DD HH:MM" (WIB), "hari ini",
 * "kemarin", "kemarin lusa". Kosong/tak dikenal → `now` (lebih baik tanggal
 * default daripada pencatatan batal).
 */
export function parseDateInput(value: string | undefined | null, now: Date): Date {
  const v = (value ?? "").trim().toLowerCase();
  if (!v || v === "hari ini" || v === "sekarang") return now;
  if (v === "kemarin") return new Date(now.getTime() - DAY_MS);
  if (v === "kemarin lusa") return new Date(now.getTime() - 2 * DAY_MS);

  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ t](\d{2}):(\d{2}))?/.exec(v);
  if (!m) return now;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (m[4]) return wibDate(year, month, day, Number(m[4]), Number(m[5]));
  if (wibIsoDate(now) === `${m[1]}-${m[2]}-${m[3]}`) return now; // hari ini → momen sekarang
  return wibDate(year, month, day, 12); // tanggal lain → tengah hari WIB
}

/** Cocokkan nama: exact → awalan → mengandung → nama item terkandung di input. */
export function pickByName<T extends { name: string }>(items: T[], name: string, kind: string): T {
  const n = name.trim().toLowerCase();
  const lower = (item: T) => item.name.toLowerCase();
  const found = n
    ? items.find((i) => lower(i) === n) ??
      items.find((i) => lower(i).startsWith(n)) ??
      items.find((i) => lower(i).includes(n)) ??
      items.find((i) => lower(i).length >= 3 && n.includes(lower(i)))
    : undefined;
  if (!found) {
    const list = items.slice(0, 15).map((i) => i.name).join(", ") || "-";
    throw new Error(`${kind} '${name}' tidak ditemukan. Yang ada: ${list}`);
  }
  return found;
}
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/ai/__tests__/parse.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "parser input AI: normalisasi nominal rupiah, tanggal WIB, pencocokan nama toleran

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: FinanceStore + 8 tool keuangan

**Files:**
- Create: `src/lib/ai/types.ts`, `src/lib/ai/financeStore.ts`, `src/lib/ai/firestoreFinanceStore.ts`, `src/lib/ai/tools.ts`, `src/lib/ai/__tests__/fakeStore.ts`, `src/lib/ai/__tests__/tools.test.ts`

**Interfaces:**
- Consumes: `normalizeAmount`, `parseDateInput`, `pickByName` (Task 2); `wibParts`, `wibMonthRange`, `MONTH_NAMES_ID` (Task 1); `computeBalanceDelta` (`@/lib/firestore/helpers`); `OWNER_LABELS`; `formatCurrency`.
- Produces:
  - `types.ts`: `AiAction { tool; label; detail }`, `ChatTurn { role: "user" | "assistant"; content }`, `AiChatResponse { reply; actions; model }`
  - `financeStore.ts`: `StoreAccount`, `StoreCategory`, `StoreTransaction`, `NewTransaction`, `NewTransfer`, `interface FinanceStore` (lihat kode)
  - `firestoreFinanceStore.ts`: `createFirestoreFinanceStore(db: Firestore): FinanceStore`
  - `tools.ts`: `interface ToolContext { store; uid; role: Owner; now: Date; actions: AiAction[]; createdTransactionIds: string[] }`, `TOOL_DEFINITIONS` (array skema function OpenAI), `executeTool(name: string, rawArgs: string, ctx: ToolContext): Promise<string>` (tidak pernah throw; error jadi teks "Gagal …")
  - `__tests__/fakeStore.ts`: `class FakeStore implements FinanceStore` + `makeCtx(store, overrides?)`

- [ ] **Step 1: Buat `src/lib/ai/types.ts`**

```ts
/** Kontrak data chat Prometheus — dipakai client & server. */
export interface AiAction {
  tool: string;
  label: string;
  detail: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatResponse {
  reply: string;
  actions: AiAction[];
  model: string;
}
```

- [ ] **Step 2: Buat `src/lib/ai/financeStore.ts`**

```ts
import type { AccountType, CategoryType, Owner, TransactionType } from "@/types";

export interface StoreAccount {
  id: string;
  name: string;
  owner: Owner;
  type: AccountType;
  balance: number;
  order: number;
}

export interface StoreCategory {
  id: string;
  name: string;
  icon: string;
  type: CategoryType;
  budgetAmount: number;
  order: number;
}

export interface StoreTransaction {
  id: string;
  type: TransactionType;
  name: string;
  amount: number;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  date: Date;
}

export interface NewTransaction {
  type: TransactionType;
  name: string;
  amount: number;
  account: StoreAccount;
  category: StoreCategory;
  date: Date;
}

export interface NewTransfer {
  name: string;
  amount: number;
  from: StoreAccount;
  to: StoreAccount;
  date: Date;
}

/** Akses data keuangan untuk tool AI — Firestore Admin (produksi) & fake (test). */
export interface FinanceStore {
  listAccounts(): Promise<StoreAccount[]>;
  listCategories(): Promise<StoreCategory[]>;
  /** Transaksi dengan `date` di [start, end), terbaru dulu. */
  listTransactions(start: Date, end: Date): Promise<StoreTransaction[]>;
  createCategory(input: { name: string; type: CategoryType; budgetAmount: number }, uid: string): Promise<StoreCategory>;
  createAccount(input: { name: string; type: AccountType; owner: Owner; balance: number }, uid: string): Promise<StoreAccount>;
  /** Simpan transaksi + update saldo rekening secara atomik. Mengembalikan id baru. */
  addTransactions(items: NewTransaction[], uid: string): Promise<string[]>;
  addTransfer(input: NewTransfer, uid: string): Promise<string>;
  /** Hapus transaksi + kembalikan saldo rekening. */
  deleteTransaction(tx: StoreTransaction): Promise<void>;
}
```

- [ ] **Step 3: Buat `src/lib/ai/firestoreFinanceStore.ts`**

```ts
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { computeBalanceDelta } from "@/lib/firestore/helpers";
import type { AccountType } from "@/types";
import type { FinanceStore, StoreAccount, StoreCategory, StoreTransaction } from "./financeStore";

const ACCOUNT_ICONS: Record<AccountType, string> = {
  bank: "building-2",
  cash: "wallet",
  "e-wallet": "smartphone",
  savings: "piggy-bank",
  investment: "trending-up",
};

const COLORS = ["#2383E2", "#0F9B58", "#D9730D", "#E03E3E", "#9B59B6", "#00BCD4", "#795548", "#607D8B"];
const colorFor = (seed: string) =>
  COLORS[seed.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % COLORS.length];

const toDate = (value: unknown): Date =>
  value instanceof Timestamp ? value.toDate() : new Date(value as string);

/** Implementasi FinanceStore dengan Firestore Admin SDK (mengikuti skema app). */
export function createFirestoreFinanceStore(db: Firestore): FinanceStore {
  const listAccounts = async (): Promise<StoreAccount[]> => {
    const snap = await db.collection("accounts").where("isActive", "==", true).get();
    return snap.docs
      .map((d) => ({
        id: d.id,
        name: d.get("name") as string,
        owner: d.get("owner"),
        type: d.get("type"),
        balance: (d.get("balance") as number) ?? 0,
        order: (d.get("order") as number) ?? 0,
      }))
      .sort((a, b) => a.order - b.order);
  };

  const listCategories = async (): Promise<StoreCategory[]> => {
    const snap = await db.collection("categories").where("isActive", "==", true).get();
    return snap.docs
      .map((d) => ({
        id: d.id,
        name: d.get("name") as string,
        icon: (d.get("icon") as string) ?? "package",
        type: d.get("type"),
        budgetAmount: (d.get("budgetAmount") as number) ?? 0,
        order: (d.get("order") as number) ?? 0,
      }))
      .sort((a, b) => a.order - b.order);
  };

  return {
    listAccounts,
    listCategories,

    async listTransactions(start, end): Promise<StoreTransaction[]> {
      const snap = await db
        .collection("transactions")
        .where("date", ">=", Timestamp.fromDate(start))
        .where("date", "<", Timestamp.fromDate(end))
        .orderBy("date", "desc")
        .get();
      return snap.docs.map((d) => ({
        id: d.id,
        type: d.get("type"),
        name: d.get("name"),
        amount: d.get("amount"),
        accountId: d.get("accountId"),
        accountName: d.get("accountName"),
        categoryId: d.get("categoryId"),
        categoryName: d.get("categoryName"),
        date: toDate(d.get("date")),
      }));
    },

    async createCategory(input, uid) {
      const existing = await listCategories();
      const order = existing.reduce((max, c) => Math.max(max, c.order), -1) + 1;
      const ref = db.collection("categories").doc();
      const icon = "package";
      await ref.set({
        name: input.name,
        icon,
        color: colorFor(input.name),
        type: input.type,
        budgetAmount: input.budgetAmount,
        budgetScope: "shared",
        isActive: true,
        order,
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { id: ref.id, name: input.name, icon, type: input.type, budgetAmount: input.budgetAmount, order };
    },

    async createAccount(input, uid) {
      const existing = await listAccounts();
      const order = existing.reduce((max, a) => Math.max(max, a.order), -1) + 1;
      const ref = db.collection("accounts").doc();
      await ref.set({
        name: input.name,
        type: input.type,
        category: input.owner === "shared" ? "shared" : "personal",
        owner: input.owner,
        ownerUid: uid,
        balance: input.balance,
        currency: "IDR",
        color: colorFor(input.name),
        icon: ACCOUNT_ICONS[input.type],
        isActive: true,
        order,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: ref.id, name: input.name, owner: input.owner, type: input.type, balance: input.balance, order };
    },

    async addTransactions(items, uid) {
      const batch = db.batch();
      const ids: string[] = [];
      const deltas = new Map<string, number>();

      items.forEach((item) => {
        const ref = db.collection("transactions").doc();
        ids.push(ref.id);
        batch.set(ref, {
          type: item.type,
          name: item.name,
          amount: item.amount,
          accountId: item.account.id,
          accountName: item.account.name,
          categoryId: item.category.id,
          categoryName: item.category.name,
          categoryIcon: item.category.icon,
          owner: item.account.owner,
          ownerUid: uid,
          date: Timestamp.fromDate(item.date),
          note: "",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        deltas.set(item.account.id, (deltas.get(item.account.id) ?? 0) + computeBalanceDelta(item.type, item.amount));
      });

      deltas.forEach((delta, accountId) => {
        batch.update(db.collection("accounts").doc(accountId), {
          balance: FieldValue.increment(delta),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      return ids;
    },

    async addTransfer(input, uid) {
      const batch = db.batch();
      const ref = db.collection("transfers").doc();
      batch.set(ref, {
        name: input.name,
        amount: input.amount,
        fromAccountId: input.from.id,
        fromAccountName: input.from.name,
        fromAccountOwner: input.from.owner,
        toAccountId: input.to.id,
        toAccountName: input.to.name,
        toAccountOwner: input.to.owner,
        owner: input.from.owner,
        ownerUid: uid,
        date: Timestamp.fromDate(input.date),
        note: "",
        createdAt: FieldValue.serverTimestamp(),
      });
      batch.update(db.collection("accounts").doc(input.from.id), {
        balance: FieldValue.increment(-input.amount),
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.update(db.collection("accounts").doc(input.to.id), {
        balance: FieldValue.increment(input.amount),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
      return ref.id;
    },

    async deleteTransaction(tx) {
      const batch = db.batch();
      batch.delete(db.collection("transactions").doc(tx.id));
      batch.update(db.collection("accounts").doc(tx.accountId), {
        balance: FieldValue.increment(-computeBalanceDelta(tx.type, tx.amount)),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
    },
  };
}
```

- [ ] **Step 4: Buat fake store untuk test — `src/lib/ai/__tests__/fakeStore.ts`**

```ts
import type {
  FinanceStore,
  NewTransaction,
  NewTransfer,
  StoreAccount,
  StoreCategory,
  StoreTransaction,
} from "@/lib/ai/financeStore";
import type { ToolContext } from "@/lib/ai/tools";

export class FakeStore implements FinanceStore {
  seq = 0;
  accounts: StoreAccount[] = [
    { id: "a-arul", name: "BCA", owner: "arul", type: "bank", balance: 1_000_000, order: 0 },
    { id: "a-fifi", name: "BRI", owner: "fifi", type: "bank", balance: 500_000, order: 1 },
    { id: "a-shared", name: "Jago Bersama", owner: "shared", type: "bank", balance: 0, order: 2 },
  ];
  categories: StoreCategory[] = [
    { id: "c-makan", name: "Makan", icon: "utensils", type: "expense", budgetAmount: 2_000_000, order: 0 },
    { id: "c-gaji", name: "Gaji", icon: "briefcase", type: "income", budgetAmount: 0, order: 1 },
  ];
  transactions: (StoreTransaction & { ownerUid: string })[] = [];
  transfers: NewTransfer[] = [];

  async listAccounts() {
    return this.accounts;
  }
  async listCategories() {
    return this.categories;
  }
  async listTransactions(start: Date, end: Date) {
    return this.transactions
      .filter((t) => t.date >= start && t.date < end)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
  async createCategory(input: { name: string; type: StoreCategory["type"]; budgetAmount: number }) {
    const category = { id: `c-${++this.seq}`, icon: "package", order: 99, ...input };
    this.categories.push(category);
    return category;
  }
  async createAccount(input: { name: string; type: StoreAccount["type"]; owner: StoreAccount["owner"]; balance: number }) {
    const account = { id: `a-${++this.seq}`, order: 99, ...input };
    this.accounts.push(account);
    return account;
  }
  async addTransactions(items: NewTransaction[], uid: string) {
    return items.map((item) => {
      const id = `t-${++this.seq}`;
      this.transactions.push({
        id,
        type: item.type,
        name: item.name,
        amount: item.amount,
        accountId: item.account.id,
        accountName: item.account.name,
        categoryId: item.category.id,
        categoryName: item.category.name,
        date: item.date,
        ownerUid: uid,
      });
      item.account.balance += item.type === "income" ? item.amount : -item.amount;
      return id;
    });
  }
  async addTransfer(input: NewTransfer) {
    this.transfers.push(input);
    return `tf-${++this.seq}`;
  }
  async deleteTransaction(tx: StoreTransaction) {
    this.transactions = this.transactions.filter((t) => t.id !== tx.id);
  }
}

export const NOW = new Date("2026-09-30T05:00:00Z"); // 30 Sep 2026 12:00 WIB

export function makeCtx(store: FakeStore, overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    store,
    uid: "u-arul",
    role: "arul",
    now: NOW,
    actions: [],
    createdTransactionIds: [],
    ...overrides,
  };
}
```

- [ ] **Step 5: Tulis test gagal — `src/lib/ai/__tests__/tools.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { executeTool, TOOL_DEFINITIONS } from "@/lib/ai/tools";
import { FakeStore, makeCtx } from "./fakeStore";

let store: FakeStore;
beforeEach(() => {
  store = new FakeStore();
});

const run = (name: string, args: unknown, ctx = makeCtx(store)) =>
  executeTool(name, JSON.stringify(args), ctx).then((result) => ({ result, ctx }));

describe("TOOL_DEFINITIONS", () => {
  it("berisi 8 tool keuangan", () => {
    expect(TOOL_DEFINITIONS.map((t) => t.function.name).sort()).toEqual([
      "add_transactions",
      "add_transfer",
      "create_account",
      "create_category",
      "delete_transaction",
      "get_monthly_summary",
      "list_accounts",
      "list_categories",
    ]);
  });
});

describe("add_transactions", () => {
  it("rekening default = rekening pertama milik user, nama default = kategori, nominal string dinormalisasi", async () => {
    const { result, ctx } = await run("add_transactions", {
      items: [{ type: "expense", amount: "25rb", category: "makan siang" }],
    });
    expect(result).toContain("Tersimpan");
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0]).toMatchObject({
      name: "Makan",
      amount: 25_000,
      accountId: "a-arul",
      categoryId: "c-makan",
      ownerUid: "u-arul",
    });
    expect(ctx.createdTransactionIds).toEqual([store.transactions[0].id]);
    expect(ctx.actions).toHaveLength(1);
    expect(store.accounts[0].balance).toBe(975_000);
  });

  it("rekening disebut & pemasukan", async () => {
    await run("add_transactions", {
      items: [{ type: "income", amount: 5_000_000, category: "Gaji", account: "bri", name: "Gaji September" }],
    });
    expect(store.transactions[0]).toMatchObject({ accountId: "a-fifi", categoryId: "c-gaji", name: "Gaji September" });
  });

  it("kategori belum ada → dibuat otomatis", async () => {
    const { ctx } = await run("add_transactions", {
      items: [{ type: "expense", amount: 5000, category: "Parkir" }],
    });
    expect(store.categories.map((c) => c.name)).toContain("Parkir");
    expect(ctx.actions.map((a) => a.tool)).toEqual(["create_category", "add_transactions"]);
  });

  it("satu item invalid → tidak ada yang disimpan", async () => {
    const { result } = await run("add_transactions", {
      items: [
        { type: "expense", amount: 10_000, category: "Makan" },
        { type: "expense", amount: "abc", category: "Makan" },
      ],
    });
    expect(result).toMatch(/^Gagal add_transactions: .*item 2/);
    expect(store.transactions).toHaveLength(0);
  });

  it("banyak item → satu ringkasan total", async () => {
    const { result } = await run("add_transactions", {
      items: [
        { type: "expense", amount: 10_000, category: "Makan" },
        { type: "expense", amount: 15_000, category: "Makan", date: "2026-09-29" },
      ],
    });
    expect(result).toContain("2 transaksi");
    expect(store.transactions).toHaveLength(2);
  });
});

describe("add_transfer", () => {
  it("memindah antar rekening", async () => {
    const { result } = await run("add_transfer", { amount: "500rb", from: "bca", to: "jago bersama" });
    expect(result).toContain("Transfer");
    expect(store.transfers[0]).toMatchObject({ amount: 500_000, name: "Transfer" });
    expect(store.transfers[0].from.id).toBe("a-arul");
    expect(store.transfers[0].to.id).toBe("a-shared");
  });
  it("asal = tujuan → gagal", async () => {
    const { result } = await run("add_transfer", { amount: 1000, from: "BCA", to: "BCA" });
    expect(result).toMatch(/^Gagal add_transfer/);
  });
});

describe("delete_transaction", () => {
  it("hapus yang cocok nama & nominal", async () => {
    await run("add_transactions", { items: [{ type: "expense", amount: 22_000, category: "Makan", name: "Kopi" }] });
    const { result } = await run("delete_transaction", { name: "kopi", amount: 22000 });
    expect(result).toContain("Dihapus");
    expect(store.transactions).toHaveLength(0);
  });
  it("tanpa kriteria → gagal", async () => {
    const { result } = await run("delete_transaction", {});
    expect(result).toMatch(/^Gagal delete_transaction/);
  });
});

describe("baca data", () => {
  it("list_accounts menyebut pemilik", async () => {
    const { result } = await run("list_accounts", {});
    expect(result).toContain("BCA (Arul)");
    expect(result).toContain("Jago Bersama (Bersama)");
  });
  it("get_monthly_summary bulan berjalan", async () => {
    await run("add_transactions", { items: [{ type: "expense", amount: 50_000, category: "Makan" }] });
    const { result } = await run("get_monthly_summary", {});
    expect(result).toContain("September 2026");
    expect(result).toContain("Makan");
  });
});

describe("create_account & create_category", () => {
  it("create_account", async () => {
    await run("create_account", { name: "Dana", type: "e-wallet", owner: "fifi", balance: "100rb" });
    expect(store.accounts.at(-1)).toMatchObject({ name: "Dana", owner: "fifi", balance: 100_000 });
  });
  it("create_category dengan limit", async () => {
    await run("create_category", { name: "Hiburan", type: "expense", budget: "300rb" });
    expect(store.categories.at(-1)).toMatchObject({ name: "Hiburan", budgetAmount: 300_000 });
  });
});

describe("executeTool robust", () => {
  it("tool tak dikenal", async () => {
    expect(await executeTool("hapus_semua", "{}", makeCtx(store))).toBe("Tool 'hapus_semua' tidak ada.");
  });
  it("argumen bukan JSON", async () => {
    expect(await executeTool("list_accounts", "{oops", makeCtx(store))).toMatch(/^Gagal list_accounts/);
  });
});
```

- [ ] **Step 6: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/ai/__tests__/tools.test.ts`
Expected: FAIL — modul `@/lib/ai/tools` tidak ditemukan.

- [ ] **Step 7: Implementasi `src/lib/ai/tools.ts`**

```ts
import { OWNER_LABELS } from "@/lib/constants/labels";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { MONTH_NAMES_ID, wibMonthRange, wibParts } from "@/lib/utils/wib";
import type { AccountType, CategoryType, Owner, TransactionType } from "@/types";
import type { FinanceStore, NewTransaction, StoreAccount, StoreCategory } from "./financeStore";
import { normalizeAmount, parseDateInput, pickByName } from "./parse";
import type { AiAction } from "./types";

export interface ToolContext {
  store: FinanceStore;
  uid: string;
  /** Role user login — menentukan rekening default. */
  role: Owner;
  now: Date;
  /** Diisi tool: ringkasan aksi untuk ditampilkan di chat. */
  actions: AiAction[];
  /** Diisi tool: id transaksi baru (untuk notifikasi). */
  createdTransactionIds: string[];
}

const DAY_MS = 86_400_000;
const ACCOUNT_TYPES: AccountType[] = ["bank", "cash", "e-wallet", "savings", "investment"];
const OWNERS: Owner[] = ["arul", "fifi", "shared"];
const CATEGORY_TYPES: CategoryType[] = ["expense", "income", "both"];

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) => ({
  type: "function" as const,
  function: { name, description, parameters: { type: "object", properties, required } },
});

const AMOUNT = { type: "number", description: "Rupiah penuh, mis. 25000" };
const DATE = { type: "string", description: "YYYY-MM-DD atau 'YYYY-MM-DD HH:MM' (WIB). Kosong = sekarang." };

export const TOOL_DEFINITIONS = [
  fn("list_accounts", "Daftar rekening aktif beserta pemilik & saldo.", {}),
  fn("list_categories", "Daftar kategori beserta tipe & limit budget bulanan.", {
    type: { type: "string", enum: ["expense", "income"], description: "Filter tipe (opsional)" },
  }),
  fn("get_monthly_summary", "Ringkasan pemasukan/pengeluaran satu bulan + pengeluaran per kategori.", {
    month: { type: "string", description: "Format YYYY-MM. Kosong = bulan ini." },
  }),
  fn(
    "add_transactions",
    "Catat satu atau beberapa transaksi pengeluaran/pemasukan sekaligus.",
    {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["expense", "income"] },
            amount: AMOUNT,
            category: { type: "string", description: "Nama kategori; dibuat otomatis kalau belum ada" },
            account: { type: "string", description: "Nama rekening; kosong = rekening default user" },
            name: { type: "string", description: "Keterangan singkat (opsional)" },
            date: DATE,
          },
          required: ["type", "amount", "category"],
        },
      },
    },
    ["items"]
  ),
  fn(
    "add_transfer",
    "Pindah uang antar rekening.",
    {
      amount: AMOUNT,
      from: { type: "string", description: "Nama rekening asal" },
      to: { type: "string", description: "Nama rekening tujuan" },
      name: { type: "string", description: "Keterangan (opsional)" },
      date: DATE,
    },
    ["amount", "from", "to"]
  ),
  fn("delete_transaction", "Hapus transaksi terbaru (60 hari terakhir) yang cocok dengan nama dan/atau nominal.", {
    name: { type: "string", description: "Sebagian nama/kategori transaksi" },
    amount: AMOUNT,
  }),
  fn(
    "create_account",
    "Buat rekening baru.",
    {
      name: { type: "string" },
      type: { type: "string", enum: ACCOUNT_TYPES },
      owner: { type: "string", enum: OWNERS, description: "Pemilik rekening: arul, fifi, atau shared (bersama)" },
      balance: { type: "number", description: "Saldo awal (opsional)" },
    },
    ["name", "type", "owner"]
  ),
  fn(
    "create_category",
    "Buat kategori baru.",
    {
      name: { type: "string" },
      type: { type: "string", enum: CATEGORY_TYPES },
      budget: { type: "number", description: "Limit pengeluaran per bulan (opsional)" },
    },
    ["name", "type"]
  ),
];

type Args = Record<string, unknown>;
type Handler = (args: Args, ctx: ToolContext) => Promise<string>;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isBlankAmount = (v: unknown) => v === undefined || v === null || v === "" || v === 0;
const matchesType = (c: StoreCategory, type: TransactionType) => c.type === type || c.type === "both";

function defaultAccount(accounts: StoreAccount[], role: Owner): StoreAccount {
  const account = accounts.find((a) => a.owner === role) ?? accounts[0];
  if (!account) throw new Error("belum ada rekening. Buat rekening dulu.");
  return account;
}

function findCategory(categories: StoreCategory[], name: string, type: TransactionType): StoreCategory | undefined {
  try {
    return pickByName(categories.filter((c) => matchesType(c, type)), name, "Kategori");
  } catch {
    return undefined;
  }
}

const list_accounts: Handler = async (_args, ctx) => {
  const accounts = await ctx.store.listAccounts();
  if (accounts.length === 0) return "Belum ada rekening.";
  return accounts.map((a) => `- ${a.name} (${OWNER_LABELS[a.owner]}): ${formatCurrency(a.balance)}`).join("\n");
};

const list_categories: Handler = async (args, ctx) => {
  const type = str(args.type);
  const categories = (await ctx.store.listCategories()).filter(
    (c) => !type || matchesType(c, type as TransactionType)
  );
  if (categories.length === 0) return "Belum ada kategori.";
  return categories
    .map((c) => `- ${c.name} [${c.type}]${c.budgetAmount > 0 ? ` limit ${formatCurrency(c.budgetAmount)}/bulan` : ""}`)
    .join("\n");
};

const get_monthly_summary: Handler = async (args, ctx) => {
  const m = /^(\d{4})-(\d{2})$/.exec(str(args.month));
  const { year, month } = m ? { year: Number(m[1]), month: Number(m[2]) - 1 } : wibParts(ctx.now);
  const { start, end } = wibMonthRange(year, month);
  const transactions = await ctx.store.listTransactions(start, end);

  let income = 0;
  let expense = 0;
  const byCategory: Record<string, number> = {};
  transactions.forEach((t) => {
    if (t.type === "income") {
      income += t.amount;
    } else {
      expense += t.amount;
      byCategory[t.categoryName] = (byCategory[t.categoryName] ?? 0) + t.amount;
    }
  });

  const lines = [
    `${MONTH_NAMES_ID[month]} ${year}: masuk ${formatCurrency(income)}, keluar ${formatCurrency(expense)}, selisih ${formatCurrency(income - expense)} (${transactions.length} transaksi).`,
  ];
  const top = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (top.length > 0) {
    lines.push("Pengeluaran per kategori:", ...top.map(([name, total]) => `- ${name}: ${formatCurrency(total)}`));
  }
  return lines.join("\n");
};

const add_transactions: Handler = async (args, ctx) => {
  const rawItems = Array.isArray(args.items) ? (args.items as Args[]) : [];
  if (rawItems.length === 0) throw new Error("items kosong.");
  if (rawItems.length > 50) throw new Error("maksimal 50 transaksi sekali catat.");

  const [accounts, categories] = await Promise.all([ctx.store.listAccounts(), ctx.store.listCategories()]);

  // Validasi semua dulu — kalau ada yang salah, tidak ada yang disimpan.
  const problems: string[] = [];
  const pending: { type: TransactionType; amount: number; account: StoreAccount; categoryName: string; name: string; date: Date }[] = [];
  rawItems.forEach((raw, index) => {
    try {
      const type = raw.type === "income" || raw.type === "expense" ? (raw.type as TransactionType) : null;
      if (!type) throw new Error("type harus 'expense' atau 'income'");
      const amount = normalizeAmount(raw.amount as number | string);
      const accountName = str(raw.account);
      const account = accountName ? pickByName(accounts, accountName, "Rekening") : defaultAccount(accounts, ctx.role);
      const categoryName = str(raw.category);
      if (!categoryName) throw new Error("kategori wajib diisi");
      pending.push({ type, amount, account, categoryName, name: str(raw.name), date: parseDateInput(str(raw.date), ctx.now) });
    } catch (e) {
      problems.push(`item ${index + 1}: ${(e as Error).message}`);
    }
  });
  if (problems.length > 0) throw new Error(`tidak ada yang disimpan. ${problems.join("; ")}`);

  const known = categories.slice();
  const items: NewTransaction[] = [];
  for (const p of pending) {
    let category = findCategory(known, p.categoryName, p.type);
    if (!category) {
      category = await ctx.store.createCategory({ name: p.categoryName, type: p.type, budgetAmount: 0 }, ctx.uid);
      known.push(category);
      ctx.actions.push({ tool: "create_category", label: `Kategori baru: ${category.name}`, detail: "" });
    }
    items.push({ type: p.type, amount: p.amount, account: p.account, category, name: p.name || category.name, date: p.date });
  }

  const ids = await ctx.store.addTransactions(items, ctx.uid);
  ctx.createdTransactionIds.push(...ids);
  items.forEach((it) =>
    ctx.actions.push({
      tool: "add_transactions",
      label: `${it.type === "income" ? "Pemasukan" : "Pengeluaran"} ${formatCurrency(it.amount)} · ${it.category.name}`,
      detail: `${it.name} · ${it.account.name}`,
    })
  );

  if (items.length === 1) {
    const [it] = items;
    return `Tersimpan: ${it.name} ${formatCurrency(it.amount)} di ${it.account.name} (kategori ${it.category.name}).`;
  }
  const total = items.reduce((sum, it) => sum + it.amount, 0);
  return `Tersimpan ${items.length} transaksi, total ${formatCurrency(total)}.`;
};

const add_transfer: Handler = async (args, ctx) => {
  const accounts = await ctx.store.listAccounts();
  const amount = normalizeAmount(args.amount as number | string);
  const from = pickByName(accounts, str(args.from), "Rekening asal");
  const to = pickByName(accounts, str(args.to), "Rekening tujuan");
  if (from.id === to.id) throw new Error("rekening asal dan tujuan sama.");
  const name = str(args.name) || "Transfer";
  await ctx.store.addTransfer({ name, amount, from, to, date: parseDateInput(str(args.date), ctx.now) }, ctx.uid);
  ctx.actions.push({ tool: "add_transfer", label: `Transfer ${formatCurrency(amount)}`, detail: `${from.name} → ${to.name}` });
  return `Transfer ${formatCurrency(amount)} dari ${from.name} ke ${to.name} tersimpan.`;
};

const delete_transaction: Handler = async (args, ctx) => {
  const name = str(args.name).toLowerCase();
  const amount = isBlankAmount(args.amount) ? null : normalizeAmount(args.amount as number | string);
  if (!name && amount === null) throw new Error("sebutkan nama atau nominal transaksi yang mau dihapus.");

  const transactions = await ctx.store.listTransactions(
    new Date(ctx.now.getTime() - 60 * DAY_MS),
    new Date(ctx.now.getTime() + DAY_MS)
  );
  const target = transactions.find(
    (t) =>
      (!name || t.name.toLowerCase().includes(name) || t.categoryName.toLowerCase().includes(name)) &&
      (amount === null || t.amount === amount)
  );
  if (!target) throw new Error("transaksi yang cocok tidak ditemukan (60 hari terakhir).");

  await ctx.store.deleteTransaction(target);
  ctx.actions.push({
    tool: "delete_transaction",
    label: `Dihapus: ${target.name} ${formatCurrency(target.amount)}`,
    detail: target.accountName,
  });
  return `Dihapus: ${target.name} ${formatCurrency(target.amount)} (${target.accountName}).`;
};

const create_account: Handler = async (args, ctx) => {
  const name = str(args.name);
  if (!name) throw new Error("nama rekening wajib diisi.");
  const type = ACCOUNT_TYPES.includes(args.type as AccountType) ? (args.type as AccountType) : "bank";
  const owner = OWNERS.includes(args.owner as Owner) ? (args.owner as Owner) : ctx.role;
  const balance = isBlankAmount(args.balance) ? 0 : normalizeAmount(args.balance as number | string);
  const account = await ctx.store.createAccount({ name, type, owner, balance }, ctx.uid);
  ctx.actions.push({
    tool: "create_account",
    label: `Rekening baru: ${account.name}`,
    detail: `${OWNER_LABELS[owner]} · ${formatCurrency(balance)}`,
  });
  return `Rekening ${account.name} (${OWNER_LABELS[owner]}) dibuat dengan saldo ${formatCurrency(balance)}.`;
};

const create_category: Handler = async (args, ctx) => {
  const name = str(args.name);
  if (!name) throw new Error("nama kategori wajib diisi.");
  const type = CATEGORY_TYPES.includes(args.type as CategoryType) ? (args.type as CategoryType) : "expense";
  const budgetAmount = isBlankAmount(args.budget) ? 0 : normalizeAmount(args.budget as number | string);
  const existing = (await ctx.store.listCategories()).find(
    (c) => c.name.toLowerCase() === name.toLowerCase() && c.type === type
  );
  if (existing) return `Kategori ${existing.name} sudah ada.`;
  const category = await ctx.store.createCategory({ name, type, budgetAmount }, ctx.uid);
  const limit = budgetAmount > 0 ? ` dengan limit ${formatCurrency(budgetAmount)}/bulan` : "";
  ctx.actions.push({ tool: "create_category", label: `Kategori baru: ${category.name}`, detail: limit.trim() });
  return `Kategori ${category.name} dibuat${limit}.`;
};

const HANDLERS: Record<string, Handler> = {
  list_accounts,
  list_categories,
  get_monthly_summary,
  add_transactions,
  add_transfer,
  delete_transaction,
  create_account,
  create_category,
};

/** Jalankan tool dari model. Tidak pernah throw — error dikembalikan sebagai teks "Gagal …". */
export async function executeTool(name: string, rawArgs: string, ctx: ToolContext): Promise<string> {
  const handler = HANDLERS[name];
  if (!handler) return `Tool '${name}' tidak ada.`;
  let args: Args;
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Args) : {};
  } catch {
    return `Gagal ${name}: argumen bukan JSON valid.`;
  }
  try {
    return await handler(args, ctx);
  } catch (e) {
    return `Gagal ${name}: ${e instanceof Error ? e.message : String(e)}`;
  }
}
```

- [ ] **Step 8: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/ai/__tests__/tools.test.ts`
Expected: PASS.

- [ ] **Step 9: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "tool AI keuangan (8) di typescript: finance store firestore-admin + fake untuk test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Klien DeepSeek + loop agent

**Files:**
- Create: `src/lib/ai/deepseek.ts`, `src/lib/ai/agent.ts`, `src/lib/ai/__tests__/agent.test.ts`

**Interfaces:**
- Consumes: `executeTool`, `TOOL_DEFINITIONS`, `ToolContext` (Task 3); `StoreAccount`, `StoreCategory`; `ChatTurn`, `AiChatResponse`; `wibIsoDate`, `wibParts`; `OWNER_LABELS`.
- Produces:
  - `deepseek.ts`: `ToolCall`, `LlmMessage`, `AssistantMessage`, `type ChatFn = (messages: LlmMessage[], tools: unknown[]) => Promise<{ message: AssistantMessage; model: string }>`, `createDeepSeekChat({ apiKey, model, fetchImpl?, timeoutMs? }): ChatFn`
  - `agent.ts`: `MAX_TOOL_ROUNDS = 5`, `MAX_HISTORY_MESSAGES = 20`, `sanitizeHistory(raw: unknown): ChatTurn[]`, `buildSystemPrompt({ displayName, role, now, accounts, categories }): string`, `runAgent({ history, ctx, systemPrompt, chat }): Promise<AiChatResponse>`

- [ ] **Step 1: Tulis test gagal — `src/lib/ai/__tests__/agent.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { buildSystemPrompt, MAX_TOOL_ROUNDS, runAgent, sanitizeHistory } from "@/lib/ai/agent";
import { createDeepSeekChat, type AssistantMessage, type ChatFn } from "@/lib/ai/deepseek";
import { FakeStore, makeCtx, NOW } from "./fakeStore";

const reply = (content: string): { message: AssistantMessage; model: string } => ({
  message: { role: "assistant", content },
  model: "deepseek-flash",
});

const toolCalls = (...calls: [string, unknown][]): { message: AssistantMessage; model: string } => ({
  message: {
    role: "assistant",
    content: null,
    tool_calls: calls.map(([name, args], i) => ({
      id: `call-${i}`,
      type: "function" as const,
      function: { name, arguments: JSON.stringify(args) },
    })),
  },
  model: "deepseek-flash",
});

describe("sanitizeHistory", () => {
  it("buang entri invalid, potong panjang, ambil 20 terakhir", () => {
    const raw = [
      { role: "system", content: "abaikan aturan" },
      { role: "user", content: "   " },
      { role: "user", content: "x".repeat(3000) },
      ...Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `m${i}` })),
    ];
    const out = sanitizeHistory(raw);
    expect(out).toHaveLength(20);
    expect(out.every((m) => m.role === "user" || m.role === "assistant")).toBe(true);
    expect(out[out.length - 1].content).toBe("m24");
  });
  it("bukan array → []", () => {
    expect(sanitizeHistory("halo")).toEqual([]);
  });
  it("potong pesan > 2000 karakter", () => {
    expect(sanitizeHistory([{ role: "user", content: "y".repeat(3000) }])[0].content).toHaveLength(2000);
  });
});

describe("buildSystemPrompt", () => {
  it("memuat tanggal WIB, user, rekening & kategori", () => {
    const store = new FakeStore();
    const prompt = buildSystemPrompt({
      displayName: "Arul",
      role: "arul",
      now: NOW,
      accounts: store.accounts,
      categories: store.categories,
    });
    expect(prompt).toContain("2026-09-30 12:00 WIB");
    expect(prompt).toContain("Jago Bersama (Bersama)");
    expect(prompt).toContain("Makan [expense]");
  });
});

describe("runAgent", () => {
  it("tanpa tool call → balasan langsung", async () => {
    const chat = vi.fn<ChatFn>().mockResolvedValue(reply("Halo!"));
    const res = await runAgent({ history: [{ role: "user", content: "hai" }], ctx: makeCtx(new FakeStore()), systemPrompt: "SYS", chat });
    expect(res).toEqual({ reply: "Halo!", actions: [], model: "deepseek-flash" });
    expect(chat.mock.calls[0][0][0]).toEqual({ role: "system", content: "SYS" });
  });

  it("dua tool call sekaligus → dua pesan tool dengan id masing-masing", async () => {
    const store = new FakeStore();
    const chat = vi
      .fn<ChatFn>()
      .mockResolvedValueOnce(
        toolCalls(
          ["add_transactions", { items: [{ type: "expense", amount: 25000, category: "Makan" }] }],
          ["list_accounts", {}]
        )
      )
      .mockResolvedValueOnce(reply("Oke, makan 25 ribu tercatat."));

    const res = await runAgent({ history: [{ role: "user", content: "makan 25rb" }], ctx: makeCtx(store), systemPrompt: "SYS", chat });

    expect(res.reply).toBe("Oke, makan 25 ribu tercatat.");
    expect(res.actions).toHaveLength(1);
    const secondCallMessages = chat.mock.calls[1][0];
    const toolMessages = secondCallMessages.filter((m) => m.role === "tool");
    expect(toolMessages.map((m) => (m as { tool_call_id: string }).tool_call_id)).toEqual(["call-0", "call-1"]);
    expect(toolMessages[0].content).toContain("Tersimpan");
  });

  it("berhenti setelah MAX_TOOL_ROUNDS", async () => {
    const chat = vi.fn<ChatFn>().mockResolvedValue(toolCalls(["list_accounts", {}]));
    const res = await runAgent({ history: [{ role: "user", content: "loop" }], ctx: makeCtx(new FakeStore()), systemPrompt: "SYS", chat });
    expect(chat).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
    expect(res.reply).toMatch(/kepanjangan/);
  });
});

describe("createDeepSeekChat", () => {
  it("kirim model, tools & thinking disabled; parse tool_calls", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "deepseek-flash",
          choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "list_accounts", arguments: "{}" } }] } }],
        }),
        { status: 200 }
      )
    );
    const chat = createDeepSeekChat({ apiKey: "sk-test", model: "deepseek-flash", fetchImpl });
    const res = await chat([{ role: "user", content: "hai" }], [{ type: "function" }]);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer sk-test");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: "deepseek-flash", thinking: { type: "disabled" } });
    expect(body.tools).toHaveLength(1);
    expect(res.message.tool_calls?.[0].function.name).toBe("list_accounts");
  });

  it("status non-2xx → error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 }));
    const chat = createDeepSeekChat({ apiKey: "k", model: "deepseek-flash", fetchImpl });
    await expect(chat([{ role: "user", content: "x" }], [])).rejects.toThrow(/DeepSeek 429/);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/ai/__tests__/agent.test.ts`
Expected: FAIL — modul `@/lib/ai/agent` / `@/lib/ai/deepseek` tidak ditemukan.

- [ ] **Step 3: Implementasi `src/lib/ai/deepseek.ts`**

```ts
export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface AssistantMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
}

export type LlmMessage =
  | { role: "system" | "user"; content: string }
  | AssistantMessage
  | { role: "tool"; tool_call_id: string; content: string };

export type ChatFn = (
  messages: LlmMessage[],
  tools: unknown[]
) => Promise<{ message: AssistantMessage; model: string }>;

/**
 * Chat Completions DeepSeek (OpenAI-compatible) via fetch biasa.
 * Thinking mode dimatikan supaya latensi minimum.
 */
export function createDeepSeekChat(opts: {
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): ChatFn {
  const fetchImpl = opts.fetchImpl ?? fetch;
  return async (messages, tools) => {
    const res = await fetchImpl(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        tools,
        thinking: { type: "disabled" },
        temperature: 0.3,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`DeepSeek ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const message = data?.choices?.[0]?.message;
    if (!message) throw new Error("DeepSeek: respons tanpa pesan");
    return {
      message: {
        role: "assistant",
        content: message.content ?? null,
        tool_calls: message.tool_calls?.length ? message.tool_calls : undefined,
      },
      model: data.model ?? opts.model,
    };
  };
}
```

- [ ] **Step 4: Implementasi `src/lib/ai/agent.ts`**

```ts
import { OWNER_LABELS } from "@/lib/constants/labels";
import { wibIsoDate, wibParts } from "@/lib/utils/wib";
import type { ChatFn, LlmMessage } from "./deepseek";
import type { StoreAccount, StoreCategory } from "./financeStore";
import { executeTool, TOOL_DEFINITIONS, type ToolContext } from "./tools";
import type { AiChatResponse, ChatTurn } from "./types";

export const MAX_TOOL_ROUNDS = 5;
export const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;

/** Riwayat dari client: hanya user/assistant, teks non-kosong, dipotong. */
export function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is ChatTurn => {
      const turn = m as Partial<ChatTurn> | null;
      return (
        !!turn &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.trim().length > 0
      );
    })
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
    .slice(-MAX_HISTORY_MESSAGES);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function buildSystemPrompt(input: {
  displayName: string;
  role: "arul" | "fifi";
  now: Date;
  accounts: StoreAccount[];
  categories: StoreCategory[];
}): string {
  const { hour, minute } = wibParts(input.now);
  const userName = input.displayName || OWNER_LABELS[input.role];
  const accounts = input.accounts.map((a) => `${a.name} (${OWNER_LABELS[a.owner]})`).join(", ") || "-";
  const categories = input.categories.map((c) => `${c.name} [${c.type}]`).join(", ") || "-";

  // Bagian statis di depan supaya prefix cache DeepSeek kena; konteks dinamis di akhir.
  return `Kamu "Prometheus", asisten keuangan rumah tangga Arul & Fifi (satu rumah tangga; rekening dibedakan pemiliknya: Arul, Fifi, atau Bersama).

ATURAN:
1. Bahasa Indonesia santai, ringkas (maksimal 3 kalimat).
2. Pakai tool untuk membaca/menulis data. Jangan mengarang data.
3. Pencatatan langsung dieksekusi tanpa konfirmasi kalau nominal jelas; kalau nominal tidak disebut, tanya dulu.
4. Nominal di tool: angka Rupiah penuh (25rb = 25000, 1,5jt = 1500000).
5. Tanggal di tool: 'YYYY-MM-DD' (WIB). "kemarin" = hari ini - 1.
6. Beberapa transaksi sekaligus → SATU panggilan add_transactions berisi semua item.
7. Rekening tidak disebut → kosongkan 'account' (otomatis rekening default user).
8. Kalau tool membalas "Gagal ...", perbaiki argumen lalu coba lagi (maks 2 kali); kalau tetap gagal, minta maaf singkat + inti errornya.
9. Setelah berhasil, sebutkan singkat apa yang tersimpan.

KONTEKS:
- User: ${userName} (${OWNER_LABELS[input.role]})
- Sekarang: ${wibIsoDate(input.now)} ${pad(hour)}:${pad(minute)} WIB
- Rekening: ${accounts}
- Kategori: ${categories}`;
}

/** Loop model ↔ tool sampai model membalas teks (maks MAX_TOOL_ROUNDS putaran). */
export async function runAgent(params: {
  history: ChatTurn[];
  ctx: ToolContext;
  systemPrompt: string;
  chat: ChatFn;
}): Promise<AiChatResponse> {
  const messages: LlmMessage[] = [
    { role: "system", content: params.systemPrompt },
    ...params.history.map((m): LlmMessage => ({ role: m.role, content: m.content })),
  ];
  let model = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const { message, model: usedModel } = await params.chat(messages, TOOL_DEFINITIONS);
    model = usedModel;
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { reply: message.content?.trim() || "Oke.", actions: params.ctx.actions, model };
    }

    // Setiap tool_call WAJIB dibalas satu pesan tool dengan id yang sama.
    for (const call of message.tool_calls) {
      const result = await executeTool(call.function.name, call.function.arguments, params.ctx);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  return {
    reply: "Maaf, prosesnya kepanjangan. Coba pecah perintahnya jadi lebih pendek.",
    actions: params.ctx.actions,
    model,
  };
}
```

- [ ] **Step 5: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/ai/__tests__/agent.test.ts`
Expected: PASS.

- [ ] **Step 6: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "agent prometheus: klien deepseek (thinking off) + loop tool maks 5 putaran

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Route `/api/ai/chat`, client, dan sheet teks-saja

**Files:**
- Replace: `src/app/api/ai/chat/route.ts`, `src/lib/ai/client.ts`, `src/components/ai/AiAssistantSheet.tsx`
- Delete: `src/app/api/ai/voice/`, `src/app/api/ai/reset/`, `src/app/api/ai/ping/`, `src/lib/ai/service.ts`

**Interfaces:**
- Consumes: `verifyRequest`, `authErrorResponse`, `AuthedUser`, `adminDb` (Task 1); `createFirestoreFinanceStore`, `ToolContext` (Task 3); `runAgent`, `sanitizeHistory`, `buildSystemPrompt`, `createDeepSeekChat` (Task 4); `authFetch` (Task 1).
- Produces:
  - `POST /api/ai/chat` body `{ messages: ChatTurn[] }` (pesan terakhir harus `user`) → `200 AiChatResponse` | `400/401/403/500/502 { error }`.
  - Client `sendChat(messages: ChatTurn[]): Promise<AiChatResponse>`; re-export `AiAction`, `AiChatResponse`, `ChatTurn`.
  - Fase 4 menambahkan pemanggilan notifikasi di route ini (setelah `runAgent`).

- [ ] **Step 1: Hapus route & service lama**

```bash
git rm -r -q src/app/api/ai/voice src/app/api/ai/reset src/app/api/ai/ping src/lib/ai/service.ts
```

- [ ] **Step 2: Ganti isi `src/app/api/ai/chat/route.ts`**

```ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { authErrorResponse, verifyRequest, type AuthedUser } from "@/lib/server/auth";
import { buildSystemPrompt, runAgent, sanitizeHistory } from "@/lib/ai/agent";
import { createDeepSeekChat } from "@/lib/ai/deepseek";
import { createFirestoreFinanceStore } from "@/lib/ai/firestoreFinanceStore";
import type { ToolContext } from "@/lib/ai/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let user: AuthedUser;
  try {
    user = await verifyRequest(req);
  } catch (error) {
    return authErrorResponse(error);
  }

  const body = await req.json().catch(() => null);
  const history = sanitizeHistory(body?.messages);
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DEEPSEEK_API_KEY belum di-set di server" }, { status: 500 });
  }

  try {
    const db = adminDb();
    const store = createFirestoreFinanceStore(db);
    const [profile, accounts, categories] = await Promise.all([
      db.collection("users").doc(user.uid).get(),
      store.listAccounts(),
      store.listCategories(),
    ]);
    const role: "arul" | "fifi" = profile.get("role") === "fifi" ? "fifi" : "arul";
    const displayName = (profile.get("displayName") as string | undefined) ?? "";
    const now = new Date();

    const ctx: ToolContext = { store, uid: user.uid, role, now, actions: [], createdTransactionIds: [] };
    const result = await runAgent({
      history,
      ctx,
      systemPrompt: buildSystemPrompt({ displayName, role, now, accounts, categories }),
      chat: createDeepSeekChat({ apiKey, model: process.env.DEEPSEEK_MODEL || "deepseek-flash" }),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ai/chat]", error);
    return NextResponse.json({ error: "Prometheus lagi gangguan, coba lagi sebentar." }, { status: 502 });
  }
}
```

- [ ] **Step 3: Ganti isi `src/lib/ai/client.ts`**

```ts
"use client";

import { authFetch } from "@/lib/authFetch";
import type { AiChatResponse, ChatTurn } from "./types";

export type { AiAction, AiChatResponse, ChatTurn } from "./types";

/** Kirim riwayat chat (maks 20 pesan terakhir) ke Prometheus. */
export async function sendChat(messages: ChatTurn[]): Promise<AiChatResponse> {
  const res = await authFetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Prometheus tidak bisa dihubungi");
  return data as AiChatResponse;
}
```

- [ ] **Step 4: Ganti isi `src/components/ai/AiAssistantSheet.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, CheckCircle2, RotateCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PrometheusMascot } from "@/components/ai/PrometheusMascot";
import { useAppStore } from "@/store/useAppStore";
import { sendChat, type AiAction, type ChatTurn } from "@/lib/ai/client";
import { cn } from "@/lib/utils/cn";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: AiAction[];
  /** Pesan error lokal — tidak dikirim balik ke model. */
  isError?: boolean;
}

const SUGGESTIONS = [
  "Catat makan siang 25rb",
  "Kopi 22rb pakai BCA",
  "Transfer 500rb ke rekening bersama",
  "Sisa budget makan bulan ini?",
  "Rekap bulan ini",
];

const HISTORY_LIMIT = 20;

let msgSeq = 0;
const nextId = () => `ai-msg-${++msgSeq}`;

export const AiAssistantSheet = () => {
  const open = useAppStore((s) => s.aiAssistantOpen);
  const closeAiAssistant = useAppStore((s) => s.closeAiAssistant);
  const currentUser = useAppStore((s) => s.currentUser);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  /** Posisi baca user — auto-scroll cuma jalan kalau memang sedang di dasar. */
  const atBottomRef = useRef(true);

  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (force) atBottomRef.current = true;
    if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      setShowScrollDown(false);
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
    atBottomRef.current = atBottom;
    setShowScrollDown(!atBottom);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, scrollToBottom]);

  const runAssistant = useCallback(
    async (text: string) => {
      if (!currentUser || isThinking) return;
      atBottomRef.current = true;
      const userMsg: ChatMessage = { id: nextId(), role: "user", text };
      const history: ChatTurn[] = [...messages, userMsg]
        .filter((m) => !m.isError)
        .map((m) => ({ role: m.role, content: m.text }))
        .slice(-HISTORY_LIMIT);

      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);
      try {
        const res = await sendChat(history);
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: res.reply, actions: res.actions }]);
      } catch (e) {
        const errText = e instanceof Error ? e.message : "Prometheus error";
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: `⚠️ ${errText}`, isError: true }]);
        toast.error(errText);
      } finally {
        setIsThinking(false);
      }
    },
    [currentUser, isThinking, messages]
  );

  const handleSend = () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput("");
    void runAssistant(text);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeAiAssistant()}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex h-[88dvh] flex-col rounded-t-sheet p-0 sm:mx-auto sm:max-w-2xl md:h-[82dvh]"
      >
        <SheetHeader className="flex-row items-center gap-3 space-y-0 border-b border-border bg-gradient-to-b from-capybara/10 to-transparent px-4 py-3">
          <div className="relative shrink-0">
            <PrometheusMascot className="h-11 w-11 rounded-2xl shadow-sm-custom" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-income" />
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-base font-semibold leading-tight">Prometheus</SheetTitle>
            <p className="truncate text-xs text-muted-foreground">
              {isThinking ? "Sedang berpikir…" : "Asisten keuanganmu — tulis saja"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setMessages([])}
              disabled={isThinking || messages.length === 0}
              aria-label="Reset percakapan"
              title="Reset percakapan"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={closeAiAssistant}
              aria-label="Tutup"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !isThinking && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
              <PrometheusMascot className="h-24 w-24 animate-bounce-soft rounded-3xl shadow-md-custom" />
              <div className="space-y-1">
                <p className="text-base font-semibold">Halo, aku Prometheus!</p>
                <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Catat transaksi, transfer, cek budget & rekap — cukup tulis, langsung kusimpan.
                </p>
              </div>
              <div className="flex max-w-sm flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void runAssistant(s)}
                    className="rounded-full border border-border bg-accent px-3 py-1.5 text-xs transition-colors hover:border-capybara/40 hover:bg-capybara/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
                m.role === "user" ? "justify-end" : "items-end justify-start gap-2"
              )}
            >
              {m.role === "assistant" && <PrometheusMascot className="h-7 w-7 shrink-0 rounded-lg" />}
              <div
                className={cn(
                  "max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-accent"
                )}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.actions && m.actions.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    {m.actions.map((a, i) => (
                      <div
                        key={`${m.id}-action-${i}`}
                        className="flex items-start gap-2 rounded-lg bg-background/80 px-2.5 py-1.5 text-xs"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-income" />
                        <span className="min-w-0">
                          <span className="font-medium">{a.label}</span>
                          {a.detail && <span className="block text-muted-foreground">{a.detail}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-end justify-start gap-2">
              <PrometheusMascot className="h-7 w-7 shrink-0 animate-bounce-soft rounded-lg" />
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-accent px-4 py-3.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
                <span className="sr-only">Berpikir</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="relative">
            {showScrollDown && (
              <button
                onClick={() => scrollToBottom(true)}
                className="absolute -top-11 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md transition-colors hover:bg-accent"
                aria-label="Scroll ke pesan terbaru"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            )}
            <div
              className={cn(
                "flex items-end gap-1 rounded-2xl border border-border bg-accent/40 p-1.5",
                "transition-colors focus-within:border-ring focus-within:bg-background"
              )}
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tulis perintah…"
                rows={1}
                className="max-h-28 min-h-[38px] flex-1 resize-none border-0 bg-transparent px-2.5 py-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isThinking || !currentUser}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl"
                onClick={handleSend}
                disabled={!input.trim() || isThinking || !currentUser}
                aria-label="Kirim"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Enter kirim • Shift+Enter baris baru</p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
```

- [ ] **Step 5: Grep sisa referensi**

Run: `grep -rnE "sendVoice|resetChat|aiServiceTarget|proxyAiChat|AI_SERVICE|MediaRecorder|owner_hint" src`
Expected: tidak ada output.

- [ ] **Step 6: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

Manual (butuh `DEEPSEEK_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `ALLOWED_EMAILS` di env lokal — minta user mengisi `.env.local`; JANGAN diisi sendiri): `npm run dev` → buka Prometheus dari header → "catat kopi 22rb" → balasan < ~3 detik, kartu aksi "Pengeluaran Rp 22.000 · …", transaksi muncul di daftar. Tanpa login (curl tanpa header) → `{"error":"Belum login"}` status 401:

```bash
curl -s -o /dev/stdout -w "\n%{http_code}\n" -X POST http://localhost:1806/api/ai/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"hai"}]}'
```

Expected: `{"error":"Belum login"}` lalu `401`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "prometheus pindah ke vercel: route chat deepseek dengan verifikasi token, sheet teks saja (tanpa suara)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Buang ai-service Python, Docker, dan dokumentasi lama

**Files:**
- Delete: `ai-service/`, `Dockerfile`, `docker-compose.yml`, `docker-start.sh`, `.dockerignore`, `.env.production.example`
- Modify: `next.config.mjs`, `.gitignore`, `README.md`

**Interfaces:** —

- [ ] **Step 1: Hapus file**

```bash
git rm -r -q ai-service Dockerfile docker-compose.yml docker-start.sh .dockerignore .env.production.example
rm -rf ai-service
```

(`rm -rf` membersihkan file yang tidak ter-track seperti `ai-service/.venv` / `__pycache__`.)

- [ ] **Step 2: `next.config.mjs`** — hapus komentar "Bundle mandiri untuk Docker monolith …" beserta baris `output: "standalone",`.

- [ ] **Step 3: `.gitignore`** — hapus blok:

```
# ai-service (Python)
ai-service/.venv/
ai-service/.env
__pycache__/
*.pyc
ai-service/data/
```

(Blok "Service account Firebase — JANGAN pernah di-commit" TETAP dipertahankan.)

- [ ] **Step 4: `README.md`** — ganti seluruh bagian `## Asisten AI (opsional)` (sampai sebelum `## Documentation`) dengan:

````markdown
## Asisten AI (Prometheus)

Chat teks untuk mencatat transaksi, transfer, membuat rekening/kategori, dan
menanyakan ringkasan bulanan. Berjalan sebagai API route Next.js
(`/api/ai/chat`) yang memanggil DeepSeek (`deepseek-flash`, thinking mode
dimatikan) dengan tool calling, lalu menulis ke Firestore lewat Admin SDK.

## Environment server (Vercel → Project Settings → Environment Variables)

| Variabel | Isi |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account satu baris (`jq -c . service-account.json`) |
| `ALLOWED_EMAILS` | Email yang boleh memakai API, dipisah koma |
| `DEEPSEEK_API_KEY` | API key dari platform.deepseek.com |
| `DEEPSEEK_MODEL` | Opsional, default `deepseek-flash` |

Variabel `AI_SERVICE_URL`, `AI_SERVICE_KEY`, dan `GEMINI_API_KEY` tidak dipakai lagi — boleh dihapus dari Vercel.
````

- [ ] **Step 5: Grep**

Run: `grep -rniE "ai-service|agno|gemma|gemini|docker|standalone" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude-dir=docs --exclude-dir=.kiro --exclude=README.md --exclude=package-lock.json --exclude=plan.md .`
Expected: tidak ada output. (Dikecualikan: dokumen historis `docs/`, `.kiro/`, `plan.md`; README sengaja menyebut `GEMINI_API_KEY` sebagai env yang boleh dihapus.)

- [ ] **Step 6: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "hapus ai-service python, docker monolith & env lama; readme env vercel untuk prometheus

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
