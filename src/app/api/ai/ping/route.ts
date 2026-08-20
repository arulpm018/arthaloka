import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Diagnostik runtime: env var AI service apa yang terbaca deployment ini. */
export async function GET() {
  return NextResponse.json({
    target: process.env.AI_SERVICE_URL || "(fallback: 127.0.0.1:8006)",
    hasKey: Boolean(process.env.AI_SERVICE_KEY),
    keyLen: (process.env.AI_SERVICE_KEY || "").length,
    vercelEnv: process.env.VERCEL_ENV || "local",
  });
}
