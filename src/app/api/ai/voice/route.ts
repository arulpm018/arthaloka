import { NextRequest, NextResponse } from "next/server";
import { aiServiceTarget, proxyAiVoice } from "@/lib/ai/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const uid = form.get("uid");
    if (!(audio instanceof File) || !uid) {
      return NextResponse.json(
        { error: "audio dan uid wajib diisi" },
        { status: 400 }
      );
    }
    const forward = new FormData();
    forward.append("audio", audio, audio.name || "speech.webm");
    for (const key of ["uid", "role", "owner_hint", "display_name"] as const) {
      const v = form.get(key);
      if (v != null) forward.append(key, String(v));
    }

    const upstream = await proxyAiVoice(forward);
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.detail || "AI service error" },
        { status: upstream.status === 401 ? 502 : upstream.status }
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        error: `AI service tidak terjangkau (target: ${aiServiceTarget()}). Pastikan ai-service berjalan.`,
      },
      { status: 502 }
    );
  }
}
