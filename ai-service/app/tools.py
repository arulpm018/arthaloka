"""Agno tools untuk Asisten AI ArthaFiloka.

Setiap tool menulis ke Firestore dengan bentuk yang SAMA PERSIS dengan
service di `src/lib/firestore/*` (Next.js), jadi data hasil AI langsung
muncul di UI lewat listener onSnapshot yang sudah ada.

Context per-request (uid, role, owner_hint) ditanam di session_state
oleh agent_service, lalu dibaca tool lewat parameter `run_context: RunContext`
yang di-inject Agno.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Union
from zoneinfo import ZoneInfo

from agno.run import RunContext
from agno.tools import tool
from firebase_admin import firestore
from google.api_core import exceptions as gexc

from . import config
from .firebase_client import ST, get_firestore

logger = logging.getLogger("ai.tools")

# Transient error Google API yang layak dicoba ulang otomatis.
_TRANSIENT = (
    gexc.ServiceUnavailable,
    gexc.DeadlineExceeded,
    gexc.InternalServerError,
    gexc.Aborted,
    ConnectionError,
)

OWNERS = ("arul", "fifi", "shared")
ACCOUNT_TYPES = ("bank", "cash", "e-wallet", "savings", "investment")

# Icon id yang dikenali UI (src/lib/utils/categoryIcons.ts)
CATEGORY_ICONS = [
    "utensils", "coffee", "shopping-bag", "car", "home", "zap", "wifi",
    "phone", "heart", "stethoscope", "graduation-cap", "book-open",
    "gamepad", "film", "music", "dumbbell", "shirt", "scissors", "gift",
    "plane", "baby", "dog", "briefcase", "banknote", "credit-card",
    "piggy-bank", "trending-up", "receipt", "wrench", "package",
]

# Icon id yang dikenali UI habit (src/lib/utils/habitIcons.ts)
HABIT_ICONS = [
    "droplet", "book-open", "footprints", "dumbbell", "bike", "salad",
    "sun", "moon", "smile", "heart", "pill", "sprout", "flower-2",
    "pen-line", "guitar", "brain", "piggy-bank", "phone-off",
]

ACCOUNT_TYPE_ICONS = {
    "bank": "building-2",
    "cash": "wallet",
    "e-wallet": "smartphone",
    "savings": "piggy-bank",
    "investment": "trending-up",
}

COLOR_PALETTE = [
    "#64748b", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#f43f5e",
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
]

TZ = ZoneInfo(config.TIMEZONE)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ctx(run_context: RunContext) -> Dict[str, str]:
    """Context per-request — hidup di run_context.session_state (bukan
    session_state milik agent — di Agno 2.9 nilainya kosong saat tool jalan)."""
    state = run_context.session_state or {}
    return {
        "uid": state.get("uid", ""),
        "role": state.get("role", "arul"),
        "owner_hint": state.get("owner_hint") or state.get("role") or "arul",
        "display_name": state.get("display_name", ""),
    }


def _record(run_context: RunContext, tool_label: str, label: str, detail: str = "") -> None:
    """Catat aksi yang dilakukan → dikirim balik ke UI sebagai chips."""
    if run_context.session_state is None:
        run_context.session_state = {}
    run_context.session_state.setdefault("actions", []).append(
        {"tool": tool_label, "label": label, "detail": detail}
    )


def _resolve_owner(run_context: RunContext, owner: Optional[str]) -> str:
    o = (owner or "").strip().lower()
    if o in OWNERS:
        return o
    hint = _ctx(run_context)["owner_hint"].lower()
    return hint if hint in OWNERS else "arul"


def _now() -> datetime:
    return datetime.now(TZ)


def _parse_date(value) -> datetime:
    """Terima 'YYYY-MM-DD' atau 'YYYY-MM-DD HH:MM' (waktu lokal app).

    Input tak dikenali (mis. model kirim 'tadi'/'hari ini') fallback ke
    waktu sekarang daripada menggagalkan pencatatan — lebih baik tanggal
    default daripada transaksi batal.
    """
    if not value:
        return _now()
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=TZ)
    v = str(value).strip().replace("T", " ")
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(v.split(".")[0], fmt)
            if fmt == "%Y-%m-%d":
                today = _now()
                if dt.date() == today.date():
                    return today  # tanggal hari ini → pakai momen sekarang
                dt = dt.replace(hour=12)  # tanggal lain → tengah hari, aman dari geser TZ
            return dt.replace(tzinfo=TZ)
        except ValueError:
            continue
    logger.warning("date '%s' tak terparse — pakai waktu sekarang", value)
    return _now()


def _iso_date(value) -> str:
    """Validasi tanggal-only 'YYYY-MM-DD'. Input aneh fallback ke hari ini."""
    if not value:
        return _now().strftime("%Y-%m-%d")
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    try:
        return datetime.strptime(str(value).strip()[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        logger.warning("iso date '%s' tak terparse — pakai hari ini", value)
        return _now().strftime("%Y-%m-%d")


# Suffix satuan yang mungkin dikirim model walau sudah diminta angka polos.
_AMOUNT_SUFFIXES = [
    ("jt", 1_000_000), ("juta", 1_000_000), ("m", 1_000_000),
    ("k", 1_000), ("rb", 1_000), ("ribu", 1_000),
]


def _norm_amount(amount: Union[float, int, str]) -> int:
    """Normalisasi nominal ke Rupiah bulat.

    Tahan terhadap model yang mengirim string: '22k', '22rb', '22 ribu',
    '1,5jt', 'Rp22.000', '22.000', '22,000'.
    """
    if isinstance(amount, (int, float)):
        a = float(amount)
    else:
        s = str(amount).lower().replace("rp", "").strip()
        mult = 1
        for suf, m in _AMOUNT_SUFFIXES:
            if suf in s:
                head = s.split(suf)[0]
                s = head.replace(",", ".")
                mult = m
                break
        else:
            s = s.replace(" ", "")
            # Format ribuan Indonesia: '22.000' / '22,000' → 22000.
            # Pecahan '22,5' → 22.5 (tanpa suffix).
            if "," in s and "." in s:
                s = s.replace(".", "").replace(",", ".")
            elif "," in s:
                parts = s.split(",")
                s = "".join(parts) if len(parts[-1]) == 3 else s.replace(",", ".")
            elif "." in s:
                parts = s.split(".")
                s = "".join(parts) if len(parts[-1]) == 3 else s
        try:
            a = float(s) * mult if isinstance(amount, str) else float(s)
        except ValueError:
            raise ValueError(
                f"Nominal '{amount}' tidak bisa dibaca. Pakai angka Rupiah penuh, mis. 25000."
            ) from None
    a = round(a)
    if a <= 0:
        raise ValueError("Nominal harus lebih dari 0 (Rupiah, tanpa desimal).")
    return int(a)


def _rupiah(amount: int) -> str:
    return "Rp" + f"{amount:,.0f}".replace(",", ".")


def _fuzzy(haystack_name: str, needle: str) -> bool:
    if not needle or not haystack_name:
        return False
    h = haystack_name.lower().strip()
    n = needle.lower().strip()
    return n in h or h in n


def _pick(items: List[dict], name: str, kind: str = "item") -> Optional[dict]:
    """Cocokkan by nama: exact → startswith → contains."""
    if not name:
        return None
    n = name.lower().strip()
    for it in items:
        if it.get("name", it.get("title", "")).lower() == n:
            return it
    for it in items:
        if it.get("name", it.get("title", "")).lower().startswith(n):
            return it
    for it in items:
        if n in it.get("name", it.get("title", "")).lower():
            return it
    raise ValueError(
        f"{kind} '{name}' tidak ditemukan. Daftar yang ada: "
        + ", ".join(i.get("name", i.get("title", "?")) for i in items[:15])
    )


def _pick_account(accounts: List[dict], name: str, owner: str) -> dict:
    """Cocokkan akun by nama — HANYA dalam scope owner + shared.

    Mencegah 'cash wallet milik fifi' nyasar ke akun arul yang bernama sama.
    """
    scoped = [a for a in accounts if a.get("owner") in (owner, "shared")]
    try:
        return _pick(scoped, name, "Akun")
    except ValueError:
        if owner != "shared":
            # Coba semua akun (mis. user sengaja sebut akun pasangannya) —
            # tapi tetap error kalau benar-benar tidak ada.
            return _pick(accounts, name, "Akun")
        raise


def _fetch(collection: str, **where) -> List[dict]:
    fs = get_firestore()
    q = fs.collection(collection)
    for field, (op, val) in where.items():
        q = q.where(field, op, val)
    docs = q.stream()
    out = []
    for d in docs:
        data = d.to_dict() or {}
        data["id"] = d.id
        out.append(data)
    return out


def _next_order(collection: str) -> int:
    docs = (
        get_firestore()
        .collection(collection)
        .order_by("order", direction=firestore.Query.DESCENDING)
        .limit(1)
        .stream()
    )
    for d in docs:
        return int((d.to_dict() or {}).get("order", -1)) + 1
    return 0


def _pick_color(seed: str) -> str:
    return COLOR_PALETTE[sum(ord(c) for c in seed) % len(COLOR_PALETTE)]


def _retry(fn: Callable[[], Any], tries: int = 3, delay: float = 0.5) -> Any:
    """Jalankan operasi Firestore; retry otomatis untuk error transient.

    Batch dengan Increment aman di-retry: kalau commit pertama sukses tapi
    response hilang (DeadlineExceeded), retry menulis delta lagi — jarang;
    ditukar dengan keandalan lebih baik daripada transaksi batal total.
    """
    for i in range(tries):
        try:
            return fn()
        except _TRANSIENT:
            if i == tries - 1:
                raise
            logger.warning(
                "operasi Firestore transient gagal (percobaan %d/%d), retry…", i + 1, tries
            )
            time.sleep(delay * (i + 1))


# ---------------------------------------------------------------------------
# Tools — Keuangan (baca)
# ---------------------------------------------------------------------------

@tool
def list_accounts(run_context: RunContext, owner: str = "") -> str:
    """Lihat daftar akun (nama, tipe, saldo, pemilik). Filter owner opsional: 'arul', 'fifi', 'shared'."""
    try:
        accounts = _fetch("accounts", isActive=("==", True))
        if owner:
            accounts = [a for a in accounts if a.get("owner") == owner]
        if not accounts:
            return "Tidak ada akun aktif."
        lines = []
        for a in sorted(accounts, key=lambda x: (x.get("owner", ""), x.get("order", 0))):
            lines.append(
                f"- {a['name']} ({a.get('type')}, pemilik: {a.get('owner')}, "
                f"saldo: {_rupiah(int(a.get('balance') or 0))})"
            )
        return "Daftar akun:\n" + "\n".join(lines)
    except Exception as e:
        return f"Gagal mengambil akun: {e}"


@tool
def list_categories(run_context: RunContext, type: str = "") -> str:
    """Lihat daftar kategori aktif. Filter type opsional: 'expense', 'income', 'both'."""
    try:
        cats = _fetch("categories", isActive=("==", True))
        if type:
            cats = [c for c in cats if c.get("type") in (type, "both")]
        if not cats:
            return "Tidak ada kategori."
        lines = []
        for c in sorted(cats, key=lambda x: (x.get("type", ""), x.get("order", 0))):
            lines.append(
                f"- {c['name']} (tipe: {c.get('type')}, scope: {c.get('budgetScope')}, icon: {c.get('icon')})"
            )
        return "Daftar kategori:\n" + "\n".join(lines)
    except Exception as e:
        return f"Gagal mengambil kategori: {e}"


@tool
def get_monthly_summary(run_context: RunContext, month: str = "") -> str:
    """Ringkasan keuangan satu bulan: total pemasukan/pengeluaran per pemilik, kategori pengeluaran terbesar, dan saldo semua akun. Format month: 'YYYY-MM' (default bulan ini)."""
    try:
        if month:
            try:
                start = datetime.strptime(month.strip()[:7], "%Y-%m")
            except ValueError:
                return "Format bulan salah. Pakai 'YYYY-MM'."
        else:
            start = _now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if start.tzinfo is None:
            start = start.replace(tzinfo=TZ)

        end_y = start.year + (start.month == 12)
        end_m = 1 if start.month == 12 else start.month + 1
        end = datetime(end_y, end_m, 1, tzinfo=TZ)

        txs = (
            get_firestore()
            .collection("transactions")
            .where("date", ">=", start)
            .where("date", "<", end)
            .stream()
        )
        totals = {o: {"income": 0, "expense": 0} for o in OWNERS}
        by_cat: Dict[str, int] = {}
        for d in txs:
            t = d.to_dict() or {}
            owner = t.get("owner", "shared")
            amt = int(t.get("amount") or 0)
            if t.get("type") == "income":
                totals.setdefault(owner, {"income": 0, "expense": 0})["income"] += amt
            else:
                totals.setdefault(owner, {"income": 0, "expense": 0})["expense"] += amt
                cat = t.get("categoryName", "?")
                by_cat[cat] = by_cat.get(cat, 0) + amt

        lines = [f"Ringkasan {start.strftime('%B %Y')}:"]
        for o in OWNERS:
            if totals[o]["income"] or totals[o]["expense"]:
                lines.append(
                    f"- {o}: masuk {_rupiah(totals[o]['income'])}, keluar {_rupiah(totals[o]['expense'])}"
                )
        top = sorted(by_cat.items(), key=lambda kv: kv[1], reverse=True)[:5]
        if top:
            lines.append("Pengeluaran terbesar: " + ", ".join(f"{c} {_rupiah(v)}" for c, v in top))
        accounts = _fetch("accounts", isActive=("==", True))
        total_balance = sum(int(a.get("balance") or 0) for a in accounts)
        lines.append(f"Total saldo semua akun aktif: {_rupiah(total_balance)}")
        return "\n".join(lines)
    except Exception as e:
        return f"Gagal merangkum: {e}"


# ---------------------------------------------------------------------------
# Tools — Keuangan (tulis)
# ---------------------------------------------------------------------------

def _resolve_or_create_category(run_context: RunContext, name: str, tx_type: str, owner: str) -> dict:
    cats = _fetch("categories", isActive=("==", True))
    n = (name or "Lainnya").strip()
    # khusus matching: boleh match kategori 'both'
    for c in cats:
        if c["name"].lower() == n.lower() and c.get("type") in (tx_type, "both"):
            return c
    for c in cats:
        if n.lower() in c["name"].lower() or c["name"].lower() in n.lower():
            if c.get("type") in (tx_type, "both"):
                return c
    # Tidak ketemu → buat kategori baru (icon default 'package')
    fs = get_firestore()
    icon = "package"
    for ic in CATEGORY_ICONS:
        if ic in n.lower():
            icon = ic
            break
    data = {
        "name": n.title(),
        "icon": icon,
        "color": _pick_color(n),
        "type": tx_type,
        "budgetAmount": 0,
        "budgetScope": owner,
        "isActive": True,
        "order": _next_order("categories"),
        "createdBy": _ctx(run_context)["uid"],
        "createdAt": ST,
    }
    ref = fs.collection("categories").document()
    cat_batch = fs.batch()
    cat_batch.set(ref, data)
    _retry(cat_batch.commit)
    return {"id": ref.id, **{k: (None if k == "createdAt" else v) for k, v in data.items()}}


@tool
def add_transaction(
    run_context: RunContext,
    type: str,
    amount: Union[float, str],
    name: str,
    account: str,
    category: str = "",
    date: str = "",
    owner: str = "",
    note: str = "",
) -> str:
    """Catat transaksi. type: 'expense' (pengeluaran) atau 'income' (pemasukan).
    amount: nominal Rupiah penuh (contoh 25000). account & category: nama akun/kategori
    (fuzzy match; kategori dibuat otomatis kalau belum ada). date: 'YYYY-MM-DD' opsional
    (default sekarang). owner: 'arul' | 'fifi' | 'shared' opsional."""
    try:
        if type not in ("expense", "income"):
            return "type harus 'expense' atau 'income'."
        amt = _norm_amount(amount)
        own = _resolve_owner(run_context, owner)
        accounts = _fetch("accounts", isActive=("==", True))
        acc = _pick_account(accounts, account, own)
        cat = _resolve_or_create_category(run_context, category or name, type, own)
        tx_date = _parse_date(date)

        fs = get_firestore()
        batch = fs.batch()
        tx_ref = fs.collection("transactions").document()
        data: Dict[str, Any] = {
            "type": type,
            "name": name.strip()[:120],
            "amount": amt,
            "accountId": acc["id"],
            "accountName": acc.get("name", ""),
            "categoryId": cat["id"],
            "categoryName": cat.get("name", ""),
            "categoryIcon": cat.get("icon", "package"),
            "owner": own,
            "ownerUid": _ctx(run_context)["uid"],
            "date": tx_date,
        }
        if note.strip():
            data["note"] = note.strip()[:300]
        batch.set(tx_ref, {**data, "createdAt": ST, "updatedAt": ST})

        delta = -amt if type == "expense" else amt
        batch.update(
            fs.collection("accounts").document(acc["id"]),
            {"balance": firestore.Increment(delta), "updatedAt": ST},
        )
        _retry(batch.commit)

        label = "Pengeluaran" if type == "expense" else "Pemasukan"
        detail = f"{_rupiah(amt)} • {cat.get('name')} • {acc.get('name')}"
        _record(run_context, "add_transaction", f"{label}: {name.strip()}", detail)
        return f"Berhasil mencatat {label.lower()} '{name}' {_rupiah(amt)} di akun {acc.get('name')} (kategori {cat.get('name')}, pemilik {own})."
    except ValueError as e:
        return f"Gagal: {e}"
    except Exception as e:
        return f"Gagal mencatat transaksi: {e}"


@tool
def add_transactions_bulk(
    run_context: RunContext,
    transactions: List[Dict[str, Any]],
    account: str = "",
    owner: str = "",
) -> str:
    """Catat BEBERAPA transaksi sekaligus dari satu perintah (mis. user
    menceritakan daftar belanja per tanggal). Gunakan ini SATU KALI untuk semua
    item — jangan add_transaction berulang-ulang.

    transactions: list of object, tiap item berupa:
      {"type": "expense"|"income", "amount": 22000, "name": "kopi",
       "date": "YYYY-MM-DD", "account": "jago", "category": "Makanan", "note": "opsional"}
    Field account/category/date/note opsional per item — kalau banyak item
    pakai akun yang sama, cukup isi parameter account di level atas.
    Contoh transactions:
      [{"type":"expense","amount":22000,"name":"kopi","date":"2026-08-17"},
       {"type":"expense","amount":25000,"name":"makan siang","date":"2026-08-18"}]
    """
    if not transactions or not isinstance(transactions, list):
        return "Parameter transactions harus berupa list transaksi."
    try:
        fs = get_firestore()
        own = _resolve_owner(run_context, owner)
        uid = _ctx(run_context)["uid"]
        accounts = _fetch("accounts", isActive=("==", True))

        # Akun default (dipakai item tanpa akun) — kalau kosong, tiap item wajib punya.
        default_acc: Optional[dict] = None
        if account:
            default_acc = _pick_account(accounts, account, own)

        batch = fs.batch()
        deltas: Dict[str, int] = {}
        done: List[Dict[str, Any]] = []
        skipped: List[str] = []

        for i, raw in enumerate(transactions, start=1):
            label = str(raw.get("name") or raw.get("item") or f"item #{i}")
            try:
                if not isinstance(raw, dict):
                    raise ValueError("bukan object")
                tx_type = str(raw.get("type") or "expense").lower()
                if tx_type not in ("expense", "income"):
                    raise ValueError("type harus 'expense'/'income'")
                amt = _norm_amount(raw.get("amount", raw.get("harga", 0)))
                acc = default_acc
                if raw.get("account"):
                    acc = _pick_account(accounts, str(raw["account"]), own)
                if acc is None:
                    raise ValueError(
                        f"akun tidak disebut (akun tersedia: "
                        + ", ".join(a["name"] for a in accounts if a.get("owner") in (own, "shared"))[:120]
                        + ")"
                    )
                cat = _resolve_or_create_category(
                    run_context,
                    str(raw.get("category") or raw.get("name") or "Lainnya"),
                    tx_type,
                    own,
                )
                tx_date = _parse_date(raw.get("date"))

                tx_ref = fs.collection("transactions").document()
                data: Dict[str, Any] = {
                    "type": tx_type,
                    "name": str(raw.get("name") or label)[:120],
                    "amount": amt,
                    "accountId": acc["id"],
                    "accountName": acc.get("name", ""),
                    "categoryId": cat["id"],
                    "categoryName": cat.get("name", ""),
                    "categoryIcon": cat.get("icon", "package"),
                    "owner": own,
                    "ownerUid": uid,
                    "date": tx_date,
                }
                if raw.get("note"):
                    data["note"] = str(raw["note"])[:300]
                batch.set(tx_ref, {**data, "createdAt": ST, "updatedAt": ST})

                delta = -amt if tx_type == "expense" else amt
                deltas[acc["id"]] = deltas.get(acc["id"], 0) + delta
                done.append(
                    {
                        "label": "Pengeluaran" if tx_type == "expense" else "Pemasukan",
                        "name": data["name"],
                        "amount": amt,
                        "date": data["date"],
                        "account": acc["name"],
                    }
                )
            except ValueError as e:
                skipped.append(f"{label} ({e})")

        if not done:
            return "Tidak ada transaksi yang bisa dicatat. " + "; ".join(skipped)

        for acc_id, delta in deltas.items():
            batch.update(
                fs.collection("accounts").document(acc_id),
                {"balance": firestore.Increment(delta), "updatedAt": ST},
            )
        _retry(batch.commit)

        total = sum(d["amount"] for d in done)
        summary = ", ".join(
            f"{d['name']} {_rupiah(d['amount'])} ({d['date'].strftime('%d/%m')})" for d in done[:8]
        )
        for d in done:
            _record(
                run_context,
                "add_transaction",
                f"{d['label']}: {d['name']}",
                f"{_rupiah(d['amount'])} • {d['date'].strftime('%d/%m')} • {d['account']}",
            )
        msg = f"Berhasil mencatat {len(done)} transaksi ({_rupiah(total)}): {summary}."
        if skipped:
            msg += f" Dilewati: {'; '.join(skipped)}"
        return msg
    except Exception as e:
        return f"Gagal mencatat massal: {e}"


@tool
def add_transfer(
    run_context: RunContext,
    amount: Union[float, str],
    from_account: str,
    to_account: str,
    date: str = "",
    note: str = "",
    owner: str = "",
) -> str:
    """Catat transfer antar akun. amount: nominal Rupiah. from_account/to_account: nama akun.
    date 'YYYY-MM-DD' opsional. owner opsional (default pemilik aktif)."""
    try:
        amt = _norm_amount(amount)
        own = _resolve_owner(run_context, owner)
        accounts = _fetch("accounts", isActive=("==", True))
        src = _pick_account(accounts, from_account, own)
        dst = _pick_account([a for a in accounts if a["id"] != src["id"]], to_account, own)
        tx_date = _parse_date(date)

        fs = get_firestore()
        batch = fs.batch()
        ref = fs.collection("transfers").document()
        data: Dict[str, Any] = {
            "name": f"Transfer {src.get('name')} → {dst.get('name')}",
            "amount": amt,
            "fromAccountId": src["id"],
            "fromAccountName": src.get("name", ""),
            "fromAccountOwner": src.get("owner", own),
            "toAccountId": dst["id"],
            "toAccountName": dst.get("name", ""),
            "toAccountOwner": dst.get("owner", own),
            "owner": own,
            "ownerUid": _ctx(run_context)["uid"],
            "date": tx_date,
        }
        if note.strip():
            data["note"] = note.strip()[:300]
        batch.set(ref, {**data, "createdAt": ST})
        batch.update(
            fs.collection("accounts").document(src["id"]),
            {"balance": firestore.Increment(-amt), "updatedAt": ST},
        )
        batch.update(
            fs.collection("accounts").document(dst["id"]),
            {"balance": firestore.Increment(amt), "updatedAt": ST},
        )
        _retry(batch.commit)

        detail = f"{_rupiah(amt)} • {src.get('name')} → {dst.get('name')}"
        _record(run_context, "add_transfer", "Transfer antar akun", detail)
        return f"Berhasil transfer {_rupiah(amt)} dari {src.get('name')} ke {dst.get('name')}."
    except ValueError as e:
        return f"Gagal: {e}"
    except Exception as e:
        return f"Gagal mencatat transfer: {e}"


@tool
def delete_transaction(run_context: RunContext, name: str = "", amount: float = 0) -> str:
    """Hapus transaksi terbaru yang cocok (dengan membalik saldo akunnya).
    Cocokkan berdasarkan nama (mengandung) dan/atau nominal."""
    try:
        fs = get_firestore()
        docs = (
            fs.collection("transactions")
            .order_by("date", direction=firestore.Query.DESCENDING)
            .limit(60)
            .stream()
        )
        best = None
        for d in docs:
            t = d.to_dict() or {}
            t["id"] = d.id
            if name and name.lower() not in (t.get("name") or "").lower():
                continue
            if amount and abs(int(t.get("amount") or 0) - int(amount)) > 1:
                continue
            best = t
            break
        if not best:
            return "Transaksi tidak ditemukan di 60 transaksi terakhir."

        amt = int(best.get("amount") or 0)
        delta = amt if best.get("type") == "expense" else -amt
        batch = fs.batch()
        batch.delete(fs.collection("transactions").document(best["id"]))
        batch.update(
            fs.collection("accounts").document(best.get("accountId", "")),
            {"balance": firestore.Increment(delta), "updatedAt": ST},
        )
        _retry(batch.commit)
        detail = f"{_rupiah(amt)} • {best.get('name')}"
        _record(run_context, "delete_transaction", "Hapus transaksi", detail)
        return f"Transaksi '{best.get('name')}' {_rupiah(amt)} dihapus dan saldo dikembalikan."
    except Exception as e:
        return f"Gagal menghapus transaksi: {e}"


@tool
def create_account(
    run_context: RunContext,
    name: str,
    type: str = "cash",
    owner: str = "",
    initial_balance: Union[float, str] = 0,
    note: str = "",
) -> str:
    """Buat akun baru. type: 'bank' | 'cash' | 'e-wallet' | 'savings' | 'investment'.
    owner: 'arul' | 'fifi' | 'shared' (default pemilik aktif). initial_balance opsional."""
    try:
        if type not in ACCOUNT_TYPES:
            return f"type harus salah satu: {', '.join(ACCOUNT_TYPES)}."
        own = _resolve_owner(run_context, owner)
        data: Dict[str, Any] = {
            "name": name.strip()[:60],
            "type": type,
            "category": "shared" if own == "shared" else "personal",
            "owner": own,
            "ownerUid": _ctx(run_context)["uid"],
            "balance": _norm_amount(initial_balance) if initial_balance else 0,
            "currency": "IDR",
            "color": _pick_color(name),
            "icon": ACCOUNT_TYPE_ICONS.get(type, "wallet"),
            "isActive": True,
            "order": _next_order("accounts"),
            "createdAt": ST,
            "updatedAt": ST,
        }
        if note.strip():
            data["note"] = note.strip()[:300]
        _retry(lambda: get_firestore().collection("accounts").document().set(data))
        _record(run_context, "create_account", f"Akun baru: {name.strip()}", f"{type} • {own}")
        return f"Akun '{name.strip()}' ({type}, pemilik {own}) dibuat."
    except Exception as e:
        return f"Gagal membuat akun: {e}"


@tool
def create_category(
    run_context: RunContext,
    name: str,
    type: str = "expense",
    icon: str = "package",
    budget_amount: Union[float, str] = 0,
    budget_scope: str = "",
) -> str:
    """Buat kategori baru. type: 'expense' | 'income' | 'both'. icon: id icon
    (mis. 'utensils', 'car', 'shopping-bag', 'banknote'). budget_amount opsional
    (Rupiah/bulan). budget_scope: 'arul' | 'fifi' | 'shared'."""
    try:
        if type not in ("expense", "income", "both"):
            return "type harus 'expense', 'income', atau 'both'."
        scope = _resolve_owner(run_context, budget_scope)
        icon = icon if icon in CATEGORY_ICONS else "package"
        data = {
            "name": name.strip()[:60],
            "icon": icon,
            "color": _pick_color(name),
            "type": type,
            "budgetAmount": int(budget_amount) if budget_amount else 0,
            "budgetScope": scope,
            "isActive": True,
            "order": _next_order("categories"),
            "createdBy": _ctx(run_context)["uid"],
            "createdAt": ST,
        }
        _retry(lambda: get_firestore().collection("categories").document().set(data))
        _record(run_context, "create_category", f"Kategori baru: {name.strip()}", f"{type} • {scope}")
        return f"Kategori '{name.strip()}' ({type}, scope {scope}) dibuat."
    except Exception as e:
        return f"Gagal membuat kategori: {e}"


# ---------------------------------------------------------------------------
# Tools — Produktivitas
# ---------------------------------------------------------------------------

@tool
def add_task(
    run_context: RunContext,
    title: str,
    notes: str = "",
    due_date: str = "",
    owner: str = "",
) -> str:
    """Buat tugas baru. due_date: 'YYYY-MM-DD' opsional. owner opsional (default pemilik aktif)."""
    try:
        own = _resolve_owner(run_context, owner)
        data: Dict[str, Any] = {
            "title": title.strip()[:200],
            "notes": notes.strip()[:500] if notes.strip() else None,
            "dueDate": _iso_date(due_date) if due_date else None,
            "completed": False,
            "completedAt": None,
            "owner": own,
            "createdBy": _ctx(run_context)["uid"],
            "createdAt": ST,
        }
        _retry(lambda: get_firestore().collection("tasks").document().set(data))
        detail = (f"tenggat {data['dueDate']}" if data["dueDate"] else "tanpa tenggat")
        _record(run_context, "add_task", f"Tugas: {title.strip()}", detail)
        return f"Tugas '{title.strip()}' dibuat ({detail}, pemilik {own})."
    except ValueError as e:
        return f"Gagal: {e}"
    except Exception as e:
        return f"Gagal membuat tugas: {e}"


@tool
def complete_task(run_context: RunContext, title: str, all: bool = False) -> str:
    """Tandai tugas selesai. Cocokkan judul (mengandung). all=True untuk menyelesaikan
    semua yang cocok sekaligus."""
    try:
        fs = get_firestore()
        docs = fs.collection("tasks").where("completed", "==", False).limit(100).stream()
        matches = []
        for d in docs:
            t = d.to_dict() or {}
            if title.lower() in (t.get("title") or "").lower():
                matches.append(d.id)
        if not matches:
            return "Tugas belum selesai dengan judul itu tidak ditemukan."
        targets = matches if all else matches[:1]
        batch = fs.batch()
        for tid in targets:
            batch.update(
                fs.collection("tasks").document(tid),
                {"completed": True, "completedAt": ST},
            )
        _retry(batch.commit)
        n = len(targets)
        _record(run_context, "complete_task", f"Selesaikan tugas ({n})", title.strip())
        return f"{n} tugas '{title.strip()}' ditandai selesai."
    except Exception as e:
        return f"Gagal menyelesaikan tugas: {e}"


@tool
def add_event(
    run_context: RunContext,
    title: str,
    date: str,
    start_time: str = "",
    end_time: str = "",
    location: str = "",
    notes: str = "",
    owner: str = "",
) -> str:
    """Tambah acara/jadwal. date WAJIB 'YYYY-MM-DD'. start_time/end_time: 'HH:MM' opsional.
    owner opsional (default pemilik aktif)."""
    try:
        own = _resolve_owner(run_context, owner)

        def hhmm(v: str) -> Optional[str]:
            v = v.strip()
            if not v:
                return None
            try:
                datetime.strptime(v, "%H:%M")
                return v
            except ValueError:
                raise ValueError(f"Jam '{v}' harus format 'HH:MM'.") from None

        data = {
            "title": title.strip()[:200],
            "date": _iso_date(date),
            "startTime": hhmm(start_time),
            "endTime": hhmm(end_time),
            "location": location.strip()[:200] if location.strip() else None,
            "notes": notes.strip()[:500] if notes.strip() else None,
            "owner": own,
            "createdBy": _ctx(run_context)["uid"],
            "createdAt": ST,
        }
        _retry(lambda: get_firestore().collection("events").document().set(data))
        waktu = data["startTime"] or "sepanjang hari"
        _record(run_context, "add_event", f"Jadwal: {title.strip()}", f"{data['date']} {waktu}")
        return f"Acara '{title.strip()}' pada {data['date']} ({waktu}) dibuat."
    except ValueError as e:
        return f"Gagal: {e}"
    except Exception as e:
        return f"Gagal membuat acara: {e}"


@tool
def add_habit(
    run_context: RunContext,
    name: str,
    icon: str = "smile",
    frequency: str = "daily",
    days: str = "",
) -> str:
    """Buat habit baru (selalu milik user saat ini). icon: id icon habit
    (mis. 'droplet', 'dumbbell', 'book-open', 'sun'). frequency: 'daily' atau 'weekly'.
    Untuk weekly, isi days dengan nama hari dipisah koma, mis. 'senin,kamis,sabtu'."""
    try:
        icon = icon if icon in HABIT_ICONS else "smile"
        if frequency == "weekly":
            day_map = {
                "minggu": 0, "senin": 1, "selasa": 2, "rabu": 3,
                "kamis": 4, "jumat": 5, "sabtu": 6,
            }
            nums = sorted({day_map.get(d.strip().lower(), 1) for d in days.split(",") if d.strip()})
            freq: Dict[str, Any] = {"type": "weekly", "days": nums}
        else:
            freq = {"type": "daily"}
        data = {
            "uid": _ctx(run_context)["uid"],
            "name": name.strip()[:100],
            "icon": icon,
            "frequency": freq,
            "completedDates": [],
            "createdAt": ST,
        }
        _retry(lambda: get_firestore().collection("habits").document().set(data))
        freq_label = "harian" if freq["type"] == "daily" else "mingguan"
        _record(run_context, "add_habit", f"Habit: {name.strip()}", freq_label)
        return f"Habit '{name.strip()}' ({freq_label}) dibuat."
    except Exception as e:
        return f"Gagal membuat habit: {e}"


@tool
def check_habit(run_context: RunContext, name: str, date: str = "") -> str:
    """Centang habit hari ini (atau tanggal 'YYYY-MM-DD' tertentu)."""
    try:
        uid = _ctx(run_context)["uid"]
        fs = get_firestore()
        docs = fs.collection("habits").where("uid", "==", uid).limit(100).stream()
        target = None
        for d in docs:
            h = d.to_dict() or {}
            if name.lower() in (h.get("name") or "").lower():
                target = (d.id, h)
                break
        if not target:
            return f"Habit '{name}' tidak ditemukan."
        day = _iso_date(date)
        _retry(lambda: fs.collection("habits").document(target[0]).update(
            {"completedDates": firestore.ArrayUnion(day)}
        ))
        _record(run_context, "check_habit", f"Centang habit: {target[1].get('name')}", day)
        return f"Habit '{target[1].get('name')}' dicentang untuk {day}."
    except Exception as e:
        return f"Gagal mencentang habit: {e}"


@tool
def list_tasks(run_context: RunContext, status: str = "pending") -> str:
    """Lihat daftar tugas. status: 'pending' | 'completed' | 'today' (belum selesai + jatuh tempo hari ini)."""
    try:
        fs = get_firestore()
        if status == "completed":
            docs = fs.collection("tasks").where("completed", "==", True).limit(50).stream()
        else:
            docs = fs.collection("tasks").where("completed", "==", False).limit(100).stream()
        today = _now().strftime("%Y-%m-%d")
        rows = []
        for d in docs:
            t = d.to_dict() or {}
            if status == "today":
                due = t.get("dueDate")
                if not due or due > today:
                    continue
                mark = " (TERLAMBAT)" if due < today else ""
                rows.append(f"- {t.get('title')} [{due}{mark}]")
            else:
                due = f" [{t.get('dueDate')}]" if t.get("dueDate") else ""
                rows.append(f"- {t.get('title')}{due}")
        if not rows:
            return "Tidak ada tugas yang cocok."
        return "Tugas:\n" + "\n".join(rows[:30])
    except Exception as e:
        return f"Gagal mengambil tugas: {e}"


@tool
def list_events(run_context: RunContext, from_date: str = "", to_date: str = "") -> str:
    """Lihat daftar acara/jadwal. from_date/to_date: 'YYYY-MM-DD' opsional
    (default: hari ini s/d 7 hari ke depan)."""
    try:
        start = _iso_date(from_date) if from_date else _now().strftime("%Y-%m-%d")
        if to_date:
            end = _iso_date(to_date)
        else:
            end = (_now() + timedelta(days=7)).strftime("%Y-%m-%d")
        docs = (
            get_firestore()
            .collection("events")
            .where("date", ">=", start)
            .where("date", "<=", end)
            .stream()
        )
        rows = []
        for d in docs:
            e = d.to_dict() or {}
            waktu = e.get("startTime") or "-"
            rows.append(f"- {e.get('date')} {waktu} {e.get('title')} (pemilik: {e.get('owner', '-')})")
        if not rows:
            return f"Tidak ada acara {start}..{end}."
        return "Acara:\n" + "\n".join(rows[:40])
    except Exception as e:
        return f"Gagal mengambil acara: {e}"


@tool
def list_habits(run_context: RunContext) -> str:
    """Lihat daftar habit kedua pengguna + status centang hari ini."""
    try:
        docs = get_firestore().collection("habits").limit(100).stream()
        today = _now().strftime("%Y-%m-%d")
        rows = []
        for d in docs:
            h = d.to_dict() or {}
            done = "✓" if today in (h.get("completedDates") or []) else " "
            freq = h.get("frequency") or {}
            fl = "harian" if freq.get("type") == "daily" else "mingguan"
            rows.append(f"- [{done}] {h.get('name')} ({fl}, uid: {h.get('uid')[:6]}…)")
        if not rows:
            return "Belum ada habit."
        return "Habit:\n" + "\n".join(rows)
    except Exception as e:
        return f"Gagal mengambil habit: {e}"


# ---------------------------------------------------------------------------
# Tools — Wishlist
# ---------------------------------------------------------------------------

@tool
def add_wishlist_item(
    run_context: RunContext,
    nama: str,
    harga: Union[float, str],
    lokasi: str = "",
    category: str = "",
    owner: str = "",
) -> str:
    """Tambah item wishlist (barang inceran). harga: estimasi harga Rupiah.
    lokasi opsional (toko/link). category opsional — dibuat otomatis kalau belum ada."""
    try:
        own = _resolve_owner(run_context, owner)
        fs = get_firestore()
        cats = fs.collection("wishlistCategories").where("isActive", "==", True).stream()
        cat_list = [{"id": d.id, **(d.to_dict() or {})} for d in cats]
        cat = None
        if category:
            try:
                cat = _pick(cat_list, category, "Kategori wishlist")
            except ValueError:
                cat = None
        if cat is None:
            # default kategori "Lain-lain" atau buat baru
            cat = next((c for c in cat_list if c.get("name", "").lower() in ("lain-lain", "lain lain", "umum")), None)
            if cat is None:
                ref = fs.collection("wishlistCategories").document()
                _retry(lambda: ref.set({
                    "name": "Lain-lain",
                    "icon": "package",
                    "owner": own,
                    "isActive": True,
                    "createdBy": _ctx(run_context)["uid"],
                    "createdAt": ST,
                }))
                cat = {"id": ref.id, "name": "Lain-lain"}
        data = {
            "nama": nama.strip()[:200],
            "harga": _norm_amount(harga),
            "lokasi": lokasi.strip()[:300] if lokasi.strip() else "",
            "categoryId": cat["id"],
            "owner": own,
            "isPurchased": False,
            "purchasedAt": None,
            "createdBy": _ctx(run_context)["uid"],
            "createdAt": ST,
            "updatedAt": ST,
        }
        _retry(lambda: fs.collection("wishlistItems").document().set(data))
        detail = f"{_rupiah(data['harga'])} • {cat.get('name', '')}"
        _record(run_context, "add_wishlist_item", f"Wishlist: {nama.strip()}", detail)
        return f"Item wishlist '{nama.strip()}' ({_rupiah(data['harga'])}) ditambahkan."
    except ValueError as e:
        return f"Gagal: {e}"
    except Exception as e:
        return f"Gagal menambah wishlist: {e}"


# Semua tool yang didaftarkan ke agent
ALL_TOOLS = [
    list_accounts,
    list_categories,
    get_monthly_summary,
    add_transaction,
    add_transactions_bulk,
    add_transfer,
    delete_transaction,
    create_account,
    create_category,
    add_task,
    complete_task,
    add_event,
    add_habit,
    check_habit,
    list_tasks,
    list_events,
    list_habits,
    add_wishlist_item,
]
