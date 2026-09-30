import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/server/cron";
import { createNotifyDeps } from "@/lib/notify/deps";
import { runDailyReminder } from "@/lib/notify/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron 21:00 WIB — ingatkan yang belum mencatat hari ini. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  const targets = await runDailyReminder(createNotifyDeps(), new Date());
  return NextResponse.json({ notified: targets.length });
}
