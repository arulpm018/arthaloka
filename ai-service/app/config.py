"""Konfigurasi AI service — dibaca dari environment / file .env."""

import os
from pathlib import Path

from dotenv import load_dotenv

# .env di ai-service/ dipakai kalau ada; .env di root repo juga dibaca
# (urutan: ai-service/.env menang karena dimuat terakhir... jadi dimuat dulu).
_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
if _ROOT_ENV.exists():
    load_dotenv(_ROOT_ENV)
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# --- Kredensial ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
# Path ke service-account JSON Firebase, ATAU isi JSON-nya langsung (satu baris).
# Kalau kosong, firebase-admin pakai GOOGLE_APPLICATION_CREDENTIALS.
FIREBASE_SERVICE_ACCOUNT = os.getenv("FIREBASE_SERVICE_ACCOUNT", "")

# Shared secret antara Next.js proxy dan service ini (header X-AI-Service-Key).
AI_SERVICE_KEY = os.getenv("AI_SERVICE_KEY", "")

# --- Model (fallback berurutan) ---
AGENT_MODEL_PRIMARY = os.getenv("AGENT_MODEL_PRIMARY", "gemma-4-31b-it")
AGENT_MODEL_FALLBACK = os.getenv("AGENT_MODEL_FALLBACK", "gemini-3.5-flash-lite")

# STT: model multimodal yang bisa terima audio. gemini-3.5-flash-lite murah &
# cepat, pas untuk transkripsi. (TTS tidak dipakai — input suara cukup
# ditranskrip, balasan ditampilkan sebagai teks.)
STT_MODEL = os.getenv("STT_MODEL", "gemini-3.5-flash-lite")

# --- Lain-lain ---
TIMEZONE = os.getenv("TIMEZONE", "Asia/Jakarta")
PORT = int(os.getenv("AI_SERVICE_PORT", "8006"))
# Origin Next.js dev/prod yang boleh akses langsung (proxy biasanya same-host).
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "AI_ALLOWED_ORIGINS", "http://localhost:1806,http://127.0.0.1:1806"
    ).split(",")
    if o.strip()
]
