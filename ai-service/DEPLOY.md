# Deploy Asisten AI ke Production

> **Rekomendasi untuk app 2 orang: MONOLITH (Opsi 1)** — satu Docker image
> berisi Next.js + ai-service, satu container, satu URL. Tidak ada batasan
> serverless (timeout/cold start), state chat in-memory aman karena proses
> hidup terus, dan biaya cukup satu mesin kecil.

Prinsip: **service account & API key tidak pernah masuk repo** — hanya lewat
environment variable / file di luar repo. Browser hanya bicara dengan Next.js;
kredensial ai-service tidak pernah sampai ke client.

```
Browser ── HTTPS ── Next.js (:3000) ── AI_SERVICE_KEY ── ai-service (:8006, internal) ── Firestore (Admin SDK)
                    └─ satu container / satu mesin (monolith)
```

## Variabel environment ai-service

| Var | Isi prod |
| --- | --- |
| `GEMINI_API_KEY` | key AI Studio |
| `FIREBASE_SERVICE_ACCOUNT` | **JSON satu baris** (container) atau path file (VPS) — keduanya didukung |
| `AI_SERVICE_KEY` | string acak panjang (`openssl rand -hex 32`) |

Next.js butuh: `AI_SERVICE_URL` (default `http://127.0.0.1:8006` di image) +
`AI_SERVICE_KEY` (sama).

---

## Opsi 1 — Monolith Docker (rekomendasi)

Semua ada di repo: `Dockerfile`, `docker-start.sh`, `docker-compose.yml`.

1. Siapkan runtime secrets:

   ```bash
   cp .env.production.example .env.production
   # isi GEMINI_API_KEY, FIREBASE_SERVICE_ACCOUNT (JSON satu baris: jq -c . sa.json), AI_SERVICE_KEY
   ```

2. Build args `NEXT_PUBLIC_FIREBASE_*` dibaca otomatis dari `.env` oleh
   compose. Jalankan:

   ```bash
   docker compose up -d --build
   ```

3. Cek: `curl http://localhost:3000` → halaman login. Asisten AI aktif.

4. Kalau di VPS tanpa compose:

   ```bash
   docker build $(grep -v '^#' .env | sed 's/^/--build-arg /' | tr '\n' ' ') -t arthafiloka .
   docker run -d --restart unless-stopped -p 3000:3000 --env-file .env.production --name arthafiloka arthafiloka
   ```

5. HTTPS: arahkan reverse-proxy (Caddy/Nginx) ke `localhost:3000`, lalu
   tambahkan domain ke **Firebase Console → Authentication → Authorized domains**.

## Opsi 2 — VPS tanpa Docker (dua systemd service)

Detail unit file & langkah: lihat bagian "Opsi A" di riwayat dokumen ini —
intinya `next start` + `uvicorn` sebagai dua service systemd, ai-service bind
`127.0.0.1:8006`. Pakai ini kalau tidak mau Docker; perilaku sama dengan
monolith (satu mesin).

## Opsi 3 — Vercel (UI) + Render free (ai-service) ← teruji

Split paling hemat: Next.js di Vercel (auto-deploy tiap push), ai-service di
**Render Free** (512 MB RAM / 0.1 CPU — hasil ujung-ke-ujung service ini cuma
pakai ~110 MB dan CPU ~1%, aman). Browser hanya akses Vercel; Vercel proxy ke
Render memakai `X-Ai-Service-Key`.

### Render (ai-service)

1. render.com → **New → Web Service** → connect repo GitHub ini.
2. Settings:
   - **Root Directory**: `ai-service` (Render otomatis pakai `ai-service/Dockerfile`)
   - Region: Singapore (terdekat)
   - Instance Type: **Free**
   - **Health Check Path**: `/healthz`
3. Environment Variables:
   - `GEMINI_API_KEY` — key AI Studio
   - `FIREBASE_SERVICE_ACCOUNT` — **JSON service account satu baris** (`jq -c . file.json`)
   - `AI_SERVICE_KEY` — string acak panjang (`openssl rand -hex 32`)
4. Deploy → dapat URL `https://<nama>.onrender.com`.
   Verifikasi: `curl https://<nama>.onrender.com/ai/chat` tanpa header key → **401**.

### Vercel (Next.js)

Project Settings → Environment Variables:

```env
AI_SERVICE_URL=https://<nama>.onrender.com
AI_SERVICE_KEY=<sama persis dengan di Render>
```

Kedua sisi auto-deploy pada setiap `git push`.

### Cloud Run (alternatif gratis, teruji cocok)

> **Tidak perlu repo terpisah.** Cloud Run mendukung monorepo lewat *Root
> Directory* = `ai-service` — konteks build dan Dockerfile diambil dari folder
> itu saja. Satu `git push` = Vercel redeploy UI + Cloud Run redeploy ai-service
> secara bersamaan, dan kontrak data (bentuk dokumen Firestore) tetap sinkron
> di satu repo.
>
> Tips (opsional): setelah trigger dibuat, edit di **Cloud Build → Triggers** →
> tambahkan *Included files filter* `ai-service/**` supaya push yang hanya
> menyentuh frontend tidak memicu rebuild ai-service (tanpa filter pun aman —
> free tier Cloud Build 2.500 build-menit/bulan jauh lebih dari cukup).

Cloud Run paket gratis (penagihan berbasis permintaan): **180.000 vCPU-detik,
360.000 GiB-detik, dan 2 juta request per bulan** — dan hanya ditagih saat
instance menangani request (scale-to-zero, idle gratis).

Hitungan pemakaian 2 orang (asumsi berat: 100 request AI/hari × 20 detik):

| Resource | Pakai | Gratis | Terpakai |
| --- | --- | --- | --- |
| CPU (1 vCPU) | ~60.000 vCPU-dtk/bln | 180.000 | 33% |
| RAM (512MiB) | ~30.000 GiB-dtk/bln | 360.000 | 8% |
| Request | ~3.000/bln | 2 juta | 0,15% |

Cara deploy paling simpel (tanpa install gcloud): **Google Cloud Console →
Cloud Run → Create Service → Deploy continuously from GitHub repo ini**,
dengan setting: *Root directory* `ai-service` (Dockerfile terdeteksi),
region `asia-southeast2` (Jakarta), CPU 1, Memory 512Mi, Concurrency 4,
**Max instances 1** (batas biaya kalau URL bocor), Request timeout 300s,
Ingress: All. Env vars: `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT` (JSON
satu baris), `AI_SERVICE_KEY`. Dapat URL `https://…run.app` → set
`AI_SERVICE_URL` + `AI_SERVICE_KEY` di Vercel. Push berikutnya = auto redeploy.

Catatan:
- Perlu akun penagihan GCP (kartu dipasang walau tagihan $0). Bonus: bisa satu
  project dengan Firebase-nya, akses Firestore same-region.
- Region Indonesia/Singapura adalah harga Tier 2 — paket gratis berlaku sebagai
  diskon setara harga Tier 1, jadi kuota efektif sedikit lebih kecil, tetap
  jauh di bawah pemakaian kita.
- Build dari source memakai Cloud Build + Artifact Registry (masing-masing
  punya free tier sendiri; image ai-service ±150MB terkompresi < 500MB gratis).
- Cold start ±3–10 detik (lebih ringan dari spin-down Render free ±30–60 dtk).

### Catatan khas Render free tier

- **Spin down setelah ±15 menit idle** → request pertama berikutnya menunggu
  cold start ±30–60 detik. Solusi opsional: ping `/healthz` tiap 10 menit
  pakai UptimeRobot (gratis) supaya tetap warm.
- Riwayat chat in-memory hilang saat spin down/restart — agent tetap jalan,
  hanya konteks percakapan lama tidak tersimpan (aman untuk data transaksi).
- 0.1 CPU tidak masalah: semua pemrosesan berat terjadi di server Gemini.
- URL Render bersifat publik — keamanannya adalah `AI_SERVICE_KEY`; jangan
  bagikan URL-nya.

## Checklist keamanan

- [ ] Service account JSON tidak ada di repo (`.env*` & pola service-account sudah di-`.gitignore`). Kalau pernah ter-commit: revoke & generate ulang di Firebase Console.
- [ ] `AI_SERVICE_KEY` panjang & acak.
- [ ] Port 8006 tidak di-expose keluar container/mesin (hanya 3000 yang diproxy HTTPS).
- [ ] Domain prod ditambahkan ke Firebase Authorized domains.

