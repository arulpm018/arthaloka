import { NextResponse } from "next/server";
import { authErrorResponse, verifyRequest, type AuthedUser } from "@/lib/server/auth";
import { createNotifyDeps } from "@/lib/notify/deps";
import { notifyTransactionsCreated } from "@/lib/notify/notifications";

export const runtime = "nodejs";

/** Dipanggil HP pencatat setelah transaksi tersimpan → notif pasangan & cek budget. */
export async function POST(req: Request) {
  let user: AuthedUser;
  try {
    user = await verifyRequest(req);
  } catch (error) {
    return authErrorResponse(error);
  }

  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.transactionIds)
    ? (body.transactionIds as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 50)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "transactionIds kosong" }, { status: 400 });
  }

  try {
    await notifyTransactionsCreated(createNotifyDeps(), { recorderUid: user.uid, transactionIds: ids, now: new Date() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[notify/transaction]", error);
    return NextResponse.json({ error: "Gagal mengirim notifikasi" }, { status: 500 });
  }
}
