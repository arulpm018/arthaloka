"use client";

/** Tipe & fetch helper untuk Asisten AI (via proxy /api/ai/*). */

export interface AiAction {
  tool: string;
  label: string;
  detail: string;
}

export interface AiChatResponse {
  reply: string;
  actions: AiAction[];
  model: string;
}

export interface AiVoiceResponse extends AiChatResponse {
  transcript: string;
}

export async function sendChat(payload: {
  uid: string;
  role: string;
  owner_hint?: string;
  display_name?: string;
  message: string;
}): Promise<AiChatResponse> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "AI service error");
  return data;
}

export async function resetChat(uid: string): Promise<void> {
  const res = await fetch("/api/ai/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid }),
  });
  if (!res.ok) throw new Error("Gagal reset chat");
}

export async function sendVoice(
  audio: Blob,
  payload: { uid: string; role: string; owner_hint?: string; display_name?: string }
): Promise<AiVoiceResponse> {
  const form = new FormData();
  const ext = audio.type.includes("mp4") ? "mp4" : "webm";
  form.append("audio", audio, `speech.${ext}`);
  form.append("uid", payload.uid);
  form.append("role", payload.role);
  if (payload.owner_hint) form.append("owner_hint", payload.owner_hint);
  if (payload.display_name) form.append("display_name", payload.display_name);

  const res = await fetch("/api/ai/voice", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "AI service error");
  return data;
}
