"""FastAPI entrypoint — Asisten AI ArthaFiloka.

Endpoint:
  GET  /healthz        → status + daftar model
  POST /ai/chat        → {uid, role, owner_hint, display_name, message}
  POST /ai/voice       → multipart: audio + uid/role/owner_hint/display_name
Auth: header `X-AI-Service-Key` harus cocok dengan AI_SERVICE_KEY
(bila diset). Next.js proxy yang menambahkan header ini.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import config
from .agent_service import clear_history, run_agent
from .audio import transcribe

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("ai.service")

app = FastAPI(title="ArthaFiloka AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS + ["*"] if not config.AI_SERVICE_KEY else config.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _verify_key(x_ai_service_key: Optional[str]) -> None:
    if config.AI_SERVICE_KEY and x_ai_service_key != config.AI_SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Invalid X-AI-Service-Key")


class ChatRequest(BaseModel):
    uid: str
    role: str = "arul"
    owner_hint: str = ""
    display_name: str = ""
    message: str


@app.get("/healthz")
def healthz() -> dict:
    return {
        "ok": True,
        "agent_models": [config.AGENT_MODEL_PRIMARY, config.AGENT_MODEL_FALLBACK],
        "stt_model": config.STT_MODEL,
    }


@app.post("/ai/chat")
def chat(req: ChatRequest, x_ai_service_key: Optional[str] = Header(default=None)) -> dict:
    _verify_key(x_ai_service_key)
    if not req.uid or not req.message.strip():
        raise HTTPException(status_code=400, detail="uid dan message wajib diisi")
    try:
        reply, actions, model_id = run_agent(
            uid=req.uid,
            role=req.role,
            display_name=req.display_name,
            owner_hint=req.owner_hint,
            message=req.message.strip(),
        )
        return {"reply": reply, "actions": actions, "model": model_id}
    except Exception as e:  # noqa: BLE001
        logger.exception("chat gagal")
        raise HTTPException(status_code=502, detail=f"Agent error: {e}") from e


@app.post("/ai/voice")
def voice(
    audio: UploadFile = File(...),
    uid: str = Form(...),
    role: str = Form("arul"),
    owner_hint: str = Form(""),
    display_name: str = Form(""),
    x_ai_service_key: Optional[str] = Header(default=None),
) -> dict:
    _verify_key(x_ai_service_key)
    if not uid:
        raise HTTPException(status_code=400, detail="uid wajib diisi")

    audio_bytes = audio.file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="File audio kosong")
    mime = audio.content_type or "audio/webm"

    try:
        transcript = transcribe(audio_bytes, mime)
    except Exception as e:  # noqa: BLE001
        logger.exception("STT gagal")
        raise HTTPException(status_code=502, detail=f"STT error: {e}") from e

    try:
        reply, actions, model_id = run_agent(
            uid=uid, role=role, display_name=display_name,
            owner_hint=owner_hint, message=transcript,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("agent gagal")
        raise HTTPException(status_code=502, detail=f"Agent error: {e}") from e

    return {
        "transcript": transcript,
        "reply": reply,
        "actions": actions,
        "model": model_id,
    }


@app.post("/ai/reset")
def reset(req: ChatRequest, x_ai_service_key: Optional[str] = Header(default=None)) -> dict:
    _verify_key(x_ai_service_key)
    clear_history(req.uid)
    return {"ok": True}
