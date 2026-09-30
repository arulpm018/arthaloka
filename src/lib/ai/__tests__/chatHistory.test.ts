import { describe, it, expect } from "vitest";
import { markTurnFailed, toHistory, type ChatMessage } from "@/lib/ai/chatHistory";

const msgs: ChatMessage[] = [
  { id: "1", role: "user", text: "catat kopi 22rb" },
  { id: "2", role: "assistant", text: "Oke, tersimpan." },
  { id: "3", role: "user", text: "catat makan 25rb" },
];

describe("chatHistory", () => {
  it("toHistory memetakan ke ChatTurn & memotong ke limit terakhir", () => {
    expect(toHistory(msgs, 2)).toEqual([
      { role: "assistant", content: "Oke, tersimpan." },
      { role: "user", content: "catat makan 25rb" },
    ]);
  });

  it("pesan user yang gagal tidak dikirim ulang ke model", () => {
    const failed = markTurnFailed(msgs, "3");
    expect(failed.find((m) => m.id === "3")?.isError).toBe(true);
    expect(toHistory(failed, 20).map((t) => t.content)).toEqual(["catat kopi 22rb", "Oke, tersimpan."]);
  });
});
