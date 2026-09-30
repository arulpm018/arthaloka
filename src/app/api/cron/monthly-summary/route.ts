import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/server/cron";
import { createNotifyDeps } from "@/lib/notify/deps";
import { runMonthlySummary } from "@/lib/notify/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron tanggal 1, 08:00 WIB — rekap bulan lalu. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  await runMonthlySummary(createNotifyDeps(), new Date());
  return NextResponse.json({ ok: true });
}
