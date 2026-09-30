# Arthafiloka

> Arthafiloka — couple finance tracker untuk Arul & Fifi.

Aplikasi Next.js untuk mencatat pengeluaran, pemasukan, transfer antar akun, budget per kategori, plus wishlist barang. Didesain mobile-first dengan realtime sync via Firestore + offline persistence.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` ke `.env.local`, lalu isi credentials Firebase project + daftar email yang di-whitelist:

   ```bash
   cp .env.example .env.local
   ```

   Field yang perlu diisi:
   - `NEXT_PUBLIC_FIREBASE_*` — ambil dari Firebase Console > Project Settings > General > Your apps > Web app.
   - `NEXT_PUBLIC_ALLOWED_EMAILS` — comma-separated list email yang boleh login (Google sign-in whitelist).

3. Login Firebase CLI (untuk deploy rules / indexes):

   ```bash
   firebase login
   ```

4. Jalankan dev server di port 1806:

   ```bash
   npm run dev
   ```

   Buka [http://localhost:1806](http://localhost:1806).

## Scripts

| Command | Deskripsi |
|---|---|
| `npm run dev` | Dev server di port 1806 dengan hot reload. |
| `npm run build` | Production build (Next.js). |
| `npm start` | Jalankan production build. |
| `npm run lint` | ESLint check. |
| `npm test` | Jalankan vitest sekali (unit + property tests). |
| `npm run test:watch` | Vitest watch mode. |

## Rapikan kategori duplikat (sekali, setelah redesign rumah tangga)

Dulu kategori dibuat per pemilik, jadi bisa ada "Makan" versi Arul & Fifi.
Script ini menggabungkannya (transaksi dipindah, limit ambil yang terbesar):

```bash
FIREBASE_SERVICE_ACCOUNT=/path/ke/service-account.json node scripts/merge-duplicate-categories.mjs
FIREBASE_SERVICE_ACCOUNT=/path/ke/service-account.json node scripts/merge-duplicate-categories.mjs --apply
```

Jalankan dry-run dulu, cek daftar, baru `--apply`.

## Gabungkan rekening (mis. "Pacaran" → Jago Bersama)

Transaksi & transfer rekening asal dipindah ke rekening tujuan, saldo
dijumlah, lalu rekening asal dinonaktifkan (hilang dari app). Transfer antar
kedua rekening itu dihapus karena jadi transfer ke diri sendiri.

```bash
# 1. Lihat daftar rekening (id, nama, pemilik, saldo)
FIREBASE_SERVICE_ACCOUNT=/path/ke/service-account.json node scripts/merge-accounts.mjs
# 2. Dry-run — tampilkan rencana
FIREBASE_SERVICE_ACCOUNT=/path/ke/service-account.json node scripts/merge-accounts.mjs --from "Pacaran (Jago)" --to "Jago Bersama" --to-owner shared
# 3. Eksekusi
FIREBASE_SERVICE_ACCOUNT=/path/ke/service-account.json node scripts/merge-accounts.mjs --from "Pacaran (Jago)" --to "Jago Bersama" --to-owner shared --apply
```

`--to-owner` opsional (arul/fifi/shared) — pakai kalau rekening tujuan belum
berstatus Bersama. Jangan mencatat transaksi di app selama `--apply` berjalan.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18
- **Backend**: Firebase (Auth + Firestore + offline persistence)
- **Styling**: Tailwind CSS + shadcn/ui (new-york, base color zinc)
- **State**: Zustand (UI state only — server state via Firestore listeners)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Tests**: Vitest + fast-check (property-based)

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
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key VAPID (Web Push) |
| `VAPID_PRIVATE_KEY` | Private key VAPID |
| `VAPID_SUBJECT` | `mailto:arulpm010@gmail.com` |
| `CRON_SECRET` | String acak (`openssl rand -hex 32`) — dipakai Vercel Cron |

Variabel `AI_SERVICE_URL`, `AI_SERVICE_KEY`, dan `GEMINI_API_KEY` tidak dipakai lagi — boleh dihapus dari Vercel.

### Push notification

Generate kunci VAPID sekali:

```bash
npx web-push generate-vapid-keys
```

Lalu di tiap HP: buka app (Android: dari ikon hasil "Install app" Chrome; iPhone iOS ≥16.4: Share → Add to Home Screen, buka dari ikon) → Pengaturan → nyalakan **Notifikasi di HP ini**.

Jadwal (Vercel Cron, `vercel.json`): pengingat 21:00 WIB setiap hari, rekap bulanan tanggal 1 pukul 08:00 WIB. Di paket Hobby jam eksekusi bisa bergeser dalam jam yang sama.

## Documentation

- [`plan.md`](./plan.md) — high-level product plan dan domain model.
- [`docs/UI_UX_CRITIQUE_V2_PLAN.md`](./docs/UI_UX_CRITIQUE_V2_PLAN.md) — kritik UI/UX dan roadmap V2.
- [`.kiro/specs/`](./.kiro/specs/) — spec dokumen (requirements, design, tasks) per fitur.

---

> Private app for Arul & Fifi 💕
