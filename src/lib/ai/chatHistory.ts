import type { AiAction, ChatTurn } from "./types";

/** Pesan di layar chat asisten AI. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: AiAction[];
  /** Pesan gagal/error lokal — tidak dikirim balik ke model. */
  isError?: boolean;
}

/** Riwayat untuk dikirim ke server: tanpa pesan gagal, `limit` terakhir. */
export function toHistory(messages: ChatMessage[], limit: number): ChatTurn[] {
  return messages
    .filter((m) => !m.isError)
    .map((m) => ({ role: m.role, content: m.text }))
    .slice(-limit);
}

/**
 * Tandai pesan user yang request-nya gagal supaya tidak ikut terkirim lagi —
 * kalau terkirim ulang, model bisa mencatat transaksi yang sama dua kali.
 */
export function markTurnFailed(messages: ChatMessage[], id: string): ChatMessage[] {
  return messages.map((m) => (m.id === id ? { ...m, isError: true } : m));
}
