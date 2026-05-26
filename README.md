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

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18
- **Backend**: Firebase (Auth + Firestore + offline persistence)
- **Styling**: Tailwind CSS + shadcn/ui (new-york, base color zinc)
- **State**: Zustand (UI state only — server state via Firestore listeners)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Tests**: Vitest + fast-check (property-based)

## Documentation

- [`plan.md`](./plan.md) — high-level product plan dan domain model.
- [`docs/UI_UX_CRITIQUE_V2_PLAN.md`](./docs/UI_UX_CRITIQUE_V2_PLAN.md) — kritik UI/UX dan roadmap V2.
- [`.kiro/specs/`](./.kiro/specs/) — spec dokumen (requirements, design, tasks) per fitur.

---

> Private app for Arul & Fifi 💕
