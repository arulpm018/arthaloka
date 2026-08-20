"""Firestore client (Admin SDK) — bypass security rules, dipakai oleh AI tools.

Semua write meniru perilaku `src/lib/firestore/*` di app Next.js supaya data
yang dibuat AI identik dengan yang dibuat lewat form (denormalisasi nama/ikon,
update saldo via Increment, server timestamp).
"""

from __future__ import annotations

import json
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore

from . import config


@lru_cache(maxsize=1)
def get_firestore() -> firestore.Client:
    """Inisialisasi firebase-admin sekali per proses."""
    if not firebase_admin._apps:
        if config.FIREBASE_SERVICE_ACCOUNT:
            raw = config.FIREBASE_SERVICE_ACCOUNT.strip()
            if raw.startswith("{"):
                info = json.loads(raw)
            else:
                with open(raw, encoding="utf-8") as f:
                    info = json.load(f)
            firebase_admin.initialize_app(credentials.Certificate(info))
        else:
            # Pakai GOOGLE_APPLICATION_CREDENTIALS / Application Default.
            firebase_admin.initialize_app()
    return firestore.client()


ST = firestore.SERVER_TIMESTAMP
