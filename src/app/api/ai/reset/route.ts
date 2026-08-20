import { NextRequest, NextResponse } from "next/server";
import { aiServiceTarget, proxyAiReset } from "@/lib/ai/service";

export const runtime = "nodejs";

/** Reset riwayat chat asisten (hapus memory in-memory per uid di ai-service). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.uid) {
      return NextResponse.json({ error: "uid wajib diisi" }, { status: 400 });
    }
    const upstream = await proxyAiReset(body.uid);
    if (!upstream.ok) {
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }
    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json(
      { error: `AI service tidak terjangkau (target: ${aiServiceTarget()}).` },
      { status: 502 }
    );
  }
}
