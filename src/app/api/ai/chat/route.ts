import { NextRequest, NextResponse } from "next/server";
import { proxyAiChat } from "@/lib/ai/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.uid || !body?.message) {
      return NextResponse.json(
        { error: "uid dan message wajib diisi" },
        { status: 400 }
      );
    }
    const upstream = await proxyAiChat(body);
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.detail || "AI service error" },
        { status: upstream.status === 401 ? 502 : upstream.status }
      );
    }
    return NextResponse.json(data);
  } catch {
    // AI service belum jalan / tidak terjangkau
    return NextResponse.json(
      {
        error:
          "AI service tidak terjangkau. Pastikan ai-service berjalan (lihat ai-service/README.md).",
      },
      { status: 502 }
    );
  }
}
