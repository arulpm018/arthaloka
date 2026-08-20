"""Speech-to-text via Gemini API (input suara → teks).

TTS dihilangkan sesuai kebutuhan: input suara cukup ditranskrip lalu
diproses agent sebagai teks; balasan dibaca user sebagai teks di UI.
"""

from __future__ import annotations

import logging
from typing import Optional

from google import genai
from google.genai import types

from . import config

logger = logging.getLogger("ai.audio")

_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=config.GEMINI_API_KEY)
    return _client


def transcribe(audio_bytes: bytes, mime_type: str) -> str:
    """Transkrip ucapan (Bahasa Indonesia) jadi teks."""
    # Buang suffix ";codecs=..." (mis. audio/webm;codecs=opus) — Gemini cukup
    # menerima mime dasarnya.
    mime = (mime_type or "audio/webm").split(";")[0].strip() or "audio/webm"
    part = types.Part.from_bytes(data=audio_bytes, mime_type=mime)
    response = _get_client().models.generate_content(
        model=config.STT_MODEL,
        contents=[
            "Transkrip ucapan Bahasa Indonesia berikut ke teks. Balas HANYA transkripnya saja, tanpa komentar.",
            part,
        ],
    )
    text = (response.text or "").strip()
    if not text:
        raise RuntimeError("STT mengembalikan teks kosong")
    return text
