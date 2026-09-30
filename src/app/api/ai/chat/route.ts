import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { authErrorResponse, verifyRequest, type AuthedUser } from "@/lib/server/auth";
import { buildSystemPrompt, runAgent, sanitizeHistory } from "@/lib/ai/agent";
import { createDeepSeekChat } from "@/lib/ai/deepseek";
import { createFirestoreFinanceStore } from "@/lib/ai/firestoreFinanceStore";
import type { ToolContext } from "@/lib/ai/tools";
import { createNotifyDeps } from "@/lib/notify/deps";
import { notifyTransactionsCreated } from "@/lib/notify/notifications";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Batas waktu total agent — sisa ~10 detik untuk notifikasi & respons sebelum limit Vercel. */
const AGENT_BUDGET_MS = 50_000;

export async function POST(req: Request) {
  let user: AuthedUser;
  try {
    user = await verifyRequest(req);
  } catch (error) {
    return authErrorResponse(error);
  }

  const body = await req.json().catch(() => null);
  const history = sanitizeHistory(body?.messages);
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DEEPSEEK_API_KEY belum di-set di server" }, { status: 500 });
  }

  try {
    const db = adminDb();
    const store = createFirestoreFinanceStore(db);
    const [profile, accounts, categories] = await Promise.all([
      db.collection("users").doc(user.uid).get(),
      store.listAccounts(),
      store.listCategories(),
    ]);
    const role: "arul" | "fifi" = profile.get("role") === "fifi" ? "fifi" : "arul";
    const displayName = (profile.get("displayName") as string | undefined) ?? "";
    const now = new Date();

    const ctx: ToolContext = { store, uid: user.uid, role, now, actions: [], createdTransactionIds: [] };
    const result = await runAgent({
      history,
      ctx,
      systemPrompt: buildSystemPrompt({ displayName, role, now, accounts, categories }),
      chat: createDeepSeekChat({ apiKey, model: process.env.DEEPSEEK_MODEL || "deepseek-flash" }),
      deadline: now.getTime() + AGENT_BUDGET_MS,
    });

    if (ctx.createdTransactionIds.length > 0) {
      await notifyTransactionsCreated(createNotifyDeps(), {
        recorderUid: user.uid,
        transactionIds: ctx.createdTransactionIds,
        now,
      }).catch((error) => console.error("[ai/chat] notifikasi gagal:", error));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ai/chat]", error);
    return NextResponse.json({ error: "AI lagi gangguan, coba lagi sebentar." }, { status: 502 });
  }
}
