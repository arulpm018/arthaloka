"use client";

import { authFetch } from "@/lib/authFetch";
import type { AiChatResponse, ChatTurn } from "./types";

export type { AiAction, AiChatResponse, ChatTurn } from "./types";

/** Kirim riwayat chat (maks 20 pesan terakhir) ke Prometheus. */
export async function sendChat(messages: ChatTurn[]): Promise<AiChatResponse> {
  const res = await authFetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Prometheus tidak bisa dihubungi");
  return data as AiChatResponse;
}
