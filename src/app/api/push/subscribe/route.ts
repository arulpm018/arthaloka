import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { authErrorResponse, verifyRequest, type AuthedUser } from "@/lib/server/auth";
import { createSubscriptionRepo } from "@/lib/push/subscriptionRepo";

export const runtime = "nodejs";

function parseSubscription(value: unknown) {
  const s = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (
    !s ||
    typeof s.endpoint !== "string" ||
    !s.endpoint.startsWith("https://") ||
    typeof s.keys?.p256dh !== "string" ||
    typeof s.keys?.auth !== "string"
  ) {
    return null;
  }
  return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
}

/** Simpan langganan push HP ini untuk user login. */
export async function POST(req: Request) {
  let user: AuthedUser;
  try {
    user = await verifyRequest(req);
  } catch (error) {
    return authErrorResponse(error);
  }

  const body = await req.json().catch(() => null);
  const subscription = parseSubscription(body?.subscription);
  if (!subscription) {
    return NextResponse.json({ error: "Subscription tidak valid" }, { status: 400 });
  }

  await createSubscriptionRepo(adminDb()).save(user.uid, subscription, req.headers.get("user-agent") ?? "");
  return NextResponse.json({ ok: true });
}

/** Hapus langganan (hanya milik user sendiri). */
export async function DELETE(req: Request) {
  let user: AuthedUser;
  try {
    user = await verifyRequest(req);
  } catch (error) {
    return authErrorResponse(error);
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.endpoint !== "string") {
    return NextResponse.json({ error: "endpoint wajib" }, { status: 400 });
  }

  await createSubscriptionRepo(adminDb()).removeOwned(user.uid, body.endpoint);
  return NextResponse.json({ ok: true });
}
