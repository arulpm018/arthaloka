# Asisten AI — ai-service

Service Python ([Agno](https://docs.agno.com)) yang jadi otak **Asisten AI**
ArthaFiloka: input teks atau suara → tool calling → data langsung tertulis ke
Firestore dengan bentuk yang sama seperti input lewat tombol/form di app.

## Arsitektur

```
Browser (Next.js :1806)
  └─ /api/ai/chat, /api/ai/voice   (proxy + AI_SERVICE_KEY)
       └─ FastAPI :8006 (service ini)
            ├─ Agno Agent ── model gemma-4-31b-it
            │                 fallback: gemini-3.5-flash-lite
            ├─ Tools (18) ── Firestore Admin SDK ── database app
            └─ STT: gemini-3.5-flash-lite (audio → teks)
```

Karena app Next.js membaca Firestore lewat listener `onSnapshot`, data yang
ditulis asisten langsung muncul di UI tanpa refresh.

Yang bisa dilakukan asisten (semua via tool calling):

- **Keuangan**: catat pengeluaran/pemasukan (`add_transaction`), transfer antar
  akun (`add_transfer`), hapus transaksi (`delete_transaction`), buat akun
  (`create_account`), buat kategori (`create_category`), lihat akun/kategori,
  ringkasan bulanan (`get_monthly_summary`).
- **Produktivitas**: buat/selesaikan/lihat tugas, buat/lihat jadwal,
  buat/centang/lihat habit.
- **Wishlist**: tambah item inceran.

## Setup

1. **API key Gemini** — ambil di [Google AI Studio](https://aistudio.google.com/apikey).
2. **Service account Firebase** — Firebase Console → Project settings →
   Service accounts → *Generate new private key* → simpan JSON.
3. Copy env:

   ```bash
   cp ai-service/.env.example ai-service/.env
   # isi GEMINI_API_KEY, FIREBASE_SERVICE_ACCOUNT (path file JSON), AI_SERVICE_KEY
   ```

4. Install & jalankan:

   ```bash
   cd ai-service
   uv venv .venv --python 3.11        # atau python3 -m venv .venv
   uv pip install --python .venv/bin/python -r requirements.txt
   # tanpa uv: .venv/bin/pip install -r requirements.txt

   .venv/bin/uvicorn app.main:app --port 8006
   ```

5. Di root repo, tambahkan ke `.env` (Next.js):

   ```env
   AI_SERVICE_URL=http://127.0.0.1:8006
   AI_SERVICE_KEY=<sama dengan ai-service/.env>
   ```

6. Cek: `curl http://127.0.0.1:8006/healthz` → daftar model aktif.

## Endpoint

| Endpoint | Keterangan |
| --- | --- |
| `GET /healthz` | status + daftar model |
| `POST /ai/chat` | `{uid, role, owner_hint, display_name, message}` → `{reply, actions, model}` |
| `POST /ai/voice` | multipart `audio` + field sama → `{transcript, reply, actions}` (STT saja, tanpa TTS) |
| `POST /ai/reset` | hapus riwayat chat in-memory per uid |

Semua endpoint (kecuali healthz) butuh header `X-AI-Service-Key` bila
`AI_SERVICE_KEY` diset — otomatis ditambahkan proxy Next.js.

## Catatan keamanan

- Service ini menulis ke Firestore **melewati security rules** (Admin SDK).
  Jangan ekspos port 8006 ke publik — cukup localhost, akses hanya via proxy.
- Riwayat chat disimpan in-memory per uid (hilang saat restart, tidak sensitif).

## Model & fallback

| Peran | Utama | Fallback |
| --- | --- | --- |
| Agent (tool calling) | `gemma-4-31b-it` | `gemini-3.5-flash-lite` |
| STT (suara → teks) | `gemini-3.5-flash-lite` | — |

TTS tidak dipakai — input suara cukup ditranskrip, balasan tampil sebagai teks.

Fallback agent dipicu otomatis saat model error (quota/key/unavailable —
Agno 2.9 menelan error sebagai teks, jadi kami deteksi via marker lalu pindah
model). Ubah daftar model via env `AGENT_MODEL_*`, `STT_MODEL`, dst.
