"""Agno agent — model utama gemma-4-31b-it, fallback gemini-3.5-flash-lite.

Riwayat percakapan disimpan in-memory per uid (ringan, cukup untuk app
pribadi) lalu disuntikkan ke instructions supaya agent punya konteks
multi-turn tanpa dependensi DB tambahan.
"""

from __future__ import annotations

import logging
import threading
from typing import Dict, List, Optional, Tuple

from agno.agent import Agent
from agno.models.google import Gemini

from . import config
from .tools import ALL_TOOLS

logger = logging.getLogger("ai.agent")

INSTRUCTIONS = """Kamu adalah "Asisten ArthaFiloka" — asisten AI untuk app keuangan & produktivitas pasangan (Arul & Fifi).

ATURAN UTAMA:
1. Bahasa: Indonesia santai tapi jelas. Jawab RINGKAS maksimal 3 kalimat (input user sering via suara→teks, jadi balasan singkat lebih nyaman dibaca di HP).
2. Kamu bisa memanggil tool untuk membaca/menulis data. JANGAN menebak isi data — kalau butuh nama akun/kategori/tugas yang valid, panggil tool list_* dulu.
3. Aksi pencatatan langsung eksekusi tanpa minta konfirmasi (nominal & item sudah jelas). Lalu laporkan singkat apa yang tersimpan. Kalau ada ambiguitas penting (mis. nominal tidak disebut), tanya dulu.
4. Uang: Rupiah, angka bulat tanpa simbol di parameter tool. Normalisasi: "25rb/25k" = 25000, "1,5jt" = 1500000, "50" dalam konteks belanja harian = 50000 HANYA kalau user bilang "ribu" — kalau ragu, tanya.
5. Tanggal: selalu konversi ke 'YYYY-MM-DD'. "hari ini" pakai tanggal hari ini yang tertera di bawah. "kemarin" = hari ini -1, "minggu lalu" = 7 hari lalu, dst.
6. owner/pemilik: 'arul', 'fifi', atau 'shared' (bareng). Default ikut pemilik aktif yang tertera di bawah. Kalau user menyebut nama ("arul punya...", "buat fifi..."), pakai itu.
7. Jangan mengarang tool yang tidak ada. Tool yang tersedia: catat transaksi (pengeluaran/pemasukan), catat BEBERAPA transaksi sekaligus dari daftar (add_transactions_bulk), transfer antar akun, hapus transaksi, buat akun, buat kategori, lihat akun/kategori/ringkasan bulanan, tugas (buat/selesaikan/lihat), jadwal (buat/lihat), habit (buat/centang/lihat), wishlist (tambah).
8. Setelah aksi tulis berhasil, sebutkan hasilnya (mis. "Oke, makan siang 25 ribu tercatat di Cash Wallet kategori Makanan.").
9. Kalau user memberikan BEBERAPA transaksi sekaligus (daftar per tanggal / cerita panjang banyak item), WAJIB pakai add_transactions_bulk SEKALI untuk semua item — bukan add_transaction berulang. Ekstrak tiap item: tanggal, nama, nominal (normalisasi "22k"→22000), type (expense/income), akun. Item tanpa akun → isi parameter account default.
10. Kalau sebuah tool mengembalikan pesan "Gagal ...", JANGAN langsung minta maaf — perbaiki argumenmu (nominal HARUS angka penuh mis. 22000 bukan "22k"; tanggal format 'YYYY-MM-DD'; jam format 'HH:MM') lalu panggil tool yang sama lagi. Ulangi maksimal 2 kali; kalau tetap gagal, baru sampaikan maaf + inti errornya secara singkat.

GEMMA NOTE: Kamu menjalankan tool lewat function calling. Panggil tool dengan argumen JSON yang valid sesuai deskripsi fungsinya."""


# --- Riwayat in-memory per uid ---------------------------------------------

_histories: Dict[str, List[Tuple[str, str]]] = {}
_hist_lock = threading.Lock()
_MAX_HISTORY = 8  # pasangan (user, assistant) terakhir


def _history_block(uid: str) -> str:
    with _hist_lock:
        turns = _histories.get(uid, [])
    if not turns:
        return ""
    lines = [f"user: {u}\nassistant: {a}" for u, a in turns[-_MAX_HISTORY:]]
    return "\n\n[Riwayat percakapan terbaru — hanya untuk konteks:\n" + "\n---\n".join(lines) + "\n]"


def _remember(uid: str, user_msg: str, assistant_msg: str) -> None:
    with _hist_lock:
        _histories.setdefault(uid, []).append((user_msg, assistant_msg))
        if len(_histories[uid]) > 40:
            _histories[uid] = _histories[uid][-20:]


def clear_history(uid: str) -> None:
    with _hist_lock:
        _histories.pop(uid, None)


# --- Runner dengan fallback model ------------------------------------------

def _build_agent(model_id: str, dynamic_instructions: str) -> Agent:
    return Agent(
        model=Gemini(id=model_id, api_key=config.GEMINI_API_KEY),
        tools=list(ALL_TOOLS),
        instructions=dynamic_instructions,
        markdown=False,
    )


# Agno 2.9 menelan exception dari model dan mengembalikan teks errornya
# sebagai `content` — jadi fallback kami deteksi lewat marker di teks.
_ERROR_MARKERS = (
    "no api key was provided",
    "api key not valid",
    "api_key_invalid",
    "permission denied",
    "permission_denied",
    "resource exhausted",
    "quota",
    "rate limit",
    "unavailable",
    "overloaded",
    "deadline exceeded",
    "model not found",
    "not found for api version",
    "internal error",
    "failed to connect",
)


def _looks_like_model_error(reply: str) -> bool:
    lowered = reply.lower()
    return any(marker in lowered for marker in _ERROR_MARKERS)


def run_agent(
    uid: str,
    role: str,
    display_name: str,
    owner_hint: str,
    message: str,
) -> Tuple[str, List[dict], str]:
    """Jalankan agent: coba model utama, fallback kalau error.

    Return: (reply, actions, model_id).
    """
    from datetime import datetime
    from zoneinfo import ZoneInfo

    tz = ZoneInfo(config.TIMEZONE)
    now = datetime.now(tz)
    today = now.strftime("%Y-%m-%d")
    owner_hint = owner_hint or role or "arul"

    dynamic = (
        f"{INSTRUCTIONS}\n\n"
        f"KONTEKS SAAT INI:\n"
        f"- Tanggal & waktu hari ini: {now.strftime('%A, %Y-%m-%d %H:%M')} ({config.TIMEZONE})\n"
        f"- Tanggal hari ini (ISO): {today}\n"
        f"- Pengguna: {display_name or uid} (uid: {uid}, role: {role or 'arul'})\n"
        f"- Pemilik default untuk data baru: {owner_hint}\n"
        f"{_history_block(uid)}"
    )

    session_state = {
        "uid": uid,
        "role": role or "arul",
        "owner_hint": owner_hint,
        "display_name": display_name or "",
        "actions": [],
    }

    last_error: Optional[Exception] = None
    for model_id in (config.AGENT_MODEL_PRIMARY, config.AGENT_MODEL_FALLBACK):
        try:
            agent = _build_agent(model_id, dynamic)
            response = agent.run(input=message, session_state=session_state)

            # Log tool call + hasilnya untuk diagnosis (args mentah dari model).
            for m in getattr(response, "messages", None) or []:
                if getattr(m, "tool_name", None):
                    logger.info(
                        "TOOL %s args=%s error=%s",
                        m.tool_name,
                        getattr(m, "tool_args", None),
                        getattr(m, "tool_call_error", False),
                    )

            reply = (getattr(response, "content", None) or "").strip()
            if not reply:
                raise RuntimeError("model mengembalikan jawaban kosong")
            if _looks_like_model_error(reply):
                raise RuntimeError(f"model error: {reply[:200]}")
            # Tools memutasi session_state (dict yang sama) — baca dari situ.
            actions = session_state.get("actions", [])
            _remember(uid, message, reply)
            return reply, actions, model_id
        except Exception as e:  # noqa: BLE001 — fallback untuk semua error model
            last_error = e
            logger.warning("Model %s gagal: %s — mencoba fallback", model_id, e)

    raise RuntimeError(f"Semua model gagal. Error terakhir: {last_error}")
