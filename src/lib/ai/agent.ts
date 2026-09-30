import { OWNER_LABELS } from "@/lib/constants/labels";
import { wibIsoDate, wibParts } from "@/lib/utils/wib";
import type { ChatFn, LlmMessage } from "./deepseek";
import type { StoreAccount, StoreCategory } from "./financeStore";
import { executeTool, TOOL_DEFINITIONS, type ToolContext } from "./tools";
import type { AiChatResponse, ChatTurn } from "./types";

export const MAX_TOOL_ROUNDS = 5;
export const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;
const PARTIAL_REPLY = "Sudah tersimpan, tapi AI gagal menyusun balasan. Cek daftar transaksi ya.";

/** Riwayat dari client: hanya user/assistant, teks non-kosong, dipotong. */
export function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is ChatTurn => {
      const turn = m as Partial<ChatTurn> | null;
      return (
        !!turn &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.trim().length > 0
      );
    })
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
    .slice(-MAX_HISTORY_MESSAGES);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function buildSystemPrompt(input: {
  displayName: string;
  role: "arul" | "fifi";
  now: Date;
  accounts: StoreAccount[];
  categories: StoreCategory[];
}): string {
  const { hour, minute } = wibParts(input.now);
  const userName = input.displayName || OWNER_LABELS[input.role];
  const accounts = input.accounts.map((a) => `${a.name} (${OWNER_LABELS[a.owner]})`).join(", ") || "-";
  const categories = input.categories.map((c) => `${c.name} [${c.type}]`).join(", ") || "-";

  // Bagian statis di depan supaya prefix cache DeepSeek kena; konteks dinamis di akhir.
  return `Kamu asisten AI keuangan rumah tangga Arul & Fifi (satu rumah tangga; rekening dibedakan pemiliknya: Arul, Fifi, atau Bersama).

ATURAN:
1. Bahasa Indonesia santai, ringkas (maksimal 3 kalimat).
2. Pakai tool untuk membaca/menulis data. Jangan mengarang data.
3. Pencatatan langsung dieksekusi tanpa konfirmasi kalau nominal jelas; kalau nominal tidak disebut, tanya dulu.
4. Nominal di tool: angka Rupiah penuh (25rb = 25000, 1,5jt = 1500000).
5. Tanggal di tool: 'YYYY-MM-DD' (WIB). "kemarin" = hari ini - 1.
6. Beberapa transaksi sekaligus → SATU panggilan add_transactions berisi semua item.
7. Rekening tidak disebut → JANGAN menebak: kosongkan 'account'/'from'; tool akan menampilkan tombol pilihan rekening, lalu tanyakan singkat "Pakai rekening mana?". Kalau user menjawab "Pakai rekening X (Pemilik)", isi rekening persis "X (Pemilik)" dan catat item yang tadi.
8. Kalau tool membalas "Gagal ...", perbaiki argumen lalu coba lagi (maks 2 kali); kalau tetap gagal, minta maaf singkat + inti errornya.
9. Setelah berhasil, sebutkan singkat apa yang tersimpan.

KONTEKS:
- User: ${userName} (${OWNER_LABELS[input.role]})
- Sekarang: ${wibIsoDate(input.now)} ${pad(hour)}:${pad(minute)} WIB
- Rekening: ${accounts}
- Kategori: ${categories}`;
}

/**
 * Loop model ↔ tool sampai model membalas teks (maks MAX_TOOL_ROUNDS putaran).
 * `deadline` (epoch ms) membatasi total waktu: tidak memulai putaran baru
 * setelah lewat, dan timeout tiap panggilan = sisa waktu.
 */
export async function runAgent(params: {
  history: ChatTurn[];
  ctx: ToolContext;
  systemPrompt: string;
  chat: ChatFn;
  deadline?: number;
  clock?: () => number;
}): Promise<AiChatResponse> {
  const clock = params.clock ?? Date.now;
  const messages: LlmMessage[] = [
    { role: "system", content: params.systemPrompt },
    ...params.history.map((m): LlmMessage => ({ role: m.role, content: m.content })),
  ];
  let model = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const remaining = params.deadline === undefined ? undefined : params.deadline - clock();
    if (remaining !== undefined && remaining <= 0) break;

    let response: Awaited<ReturnType<ChatFn>>;
    try {
      response = await params.chat(
        messages,
        TOOL_DEFINITIONS,
        remaining === undefined ? undefined : { timeoutMs: remaining }
      );
    } catch (error) {
      // Data dari putaran sebelumnya sudah tersimpan — jangan buang laporannya,
      // supaya user tidak mengirim ulang dan tercatat dobel.
      if (params.ctx.actions.length > 0) {
        return { reply: PARTIAL_REPLY, actions: params.ctx.actions, model, choice: params.ctx.choice };
      }
      throw error;
    }
    const { message, model: usedModel } = response;
    model = usedModel;
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { reply: message.content?.trim() || "Oke.", actions: params.ctx.actions, model, choice: params.ctx.choice };
    }

    // Setiap tool_call WAJIB dibalas satu pesan tool dengan id yang sama.
    for (const call of message.tool_calls) {
      const result = await executeTool(call.function.name, call.function.arguments, params.ctx);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  return {
    reply: "Maaf, prosesnya kepanjangan. Coba pecah perintahnya jadi lebih pendek.",
    actions: params.ctx.actions,
    model,
    choice: params.ctx.choice,
  };
}
