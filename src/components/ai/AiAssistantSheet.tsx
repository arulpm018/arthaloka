"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, CheckCircle2, RotateCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PrometheusMascot } from "@/components/ai/PrometheusMascot";
import { useAppStore } from "@/store/useAppStore";
import { sendChat, type AiAction, type ChatTurn } from "@/lib/ai/client";
import { cn } from "@/lib/utils/cn";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: AiAction[];
  /** Pesan error lokal — tidak dikirim balik ke model. */
  isError?: boolean;
}

const SUGGESTIONS = [
  "Catat makan siang 25rb",
  "Kopi 22rb pakai BCA",
  "Transfer 500rb ke rekening bersama",
  "Sisa budget makan bulan ini?",
  "Rekap bulan ini",
];

const HISTORY_LIMIT = 20;

let msgSeq = 0;
const nextId = () => `ai-msg-${++msgSeq}`;

export const AiAssistantSheet = () => {
  const open = useAppStore((s) => s.aiAssistantOpen);
  const closeAiAssistant = useAppStore((s) => s.closeAiAssistant);
  const currentUser = useAppStore((s) => s.currentUser);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  /** Posisi baca user — auto-scroll cuma jalan kalau memang sedang di dasar. */
  const atBottomRef = useRef(true);

  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (force) atBottomRef.current = true;
    if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      setShowScrollDown(false);
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
    atBottomRef.current = atBottom;
    setShowScrollDown(!atBottom);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, scrollToBottom]);

  const runAssistant = useCallback(
    async (text: string) => {
      if (!currentUser || isThinking) return;
      atBottomRef.current = true;
      const userMsg: ChatMessage = { id: nextId(), role: "user", text };
      const history: ChatTurn[] = [...messages, userMsg]
        .filter((m) => !m.isError)
        .map((m) => ({ role: m.role, content: m.text }))
        .slice(-HISTORY_LIMIT);

      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);
      try {
        const res = await sendChat(history);
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: res.reply, actions: res.actions }]);
      } catch (e) {
        const errText = e instanceof Error ? e.message : "Prometheus error";
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: `⚠️ ${errText}`, isError: true }]);
        toast.error(errText);
      } finally {
        setIsThinking(false);
      }
    },
    [currentUser, isThinking, messages]
  );

  const handleSend = () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput("");
    void runAssistant(text);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeAiAssistant()}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex h-[88dvh] flex-col rounded-t-sheet p-0 sm:mx-auto sm:max-w-2xl md:h-[82dvh]"
      >
        <SheetHeader className="flex-row items-center gap-3 space-y-0 border-b border-border bg-gradient-to-b from-capybara/10 to-transparent px-4 py-3">
          <div className="relative shrink-0">
            <PrometheusMascot className="h-11 w-11 rounded-2xl shadow-sm-custom" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-income" />
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-base font-semibold leading-tight">Prometheus</SheetTitle>
            <p className="truncate text-xs text-muted-foreground">
              {isThinking ? "Sedang berpikir…" : "Asisten keuanganmu — tulis saja"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setMessages([])}
              disabled={isThinking || messages.length === 0}
              aria-label="Reset percakapan"
              title="Reset percakapan"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={closeAiAssistant}
              aria-label="Tutup"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !isThinking && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
              <PrometheusMascot className="h-24 w-24 animate-bounce-soft rounded-3xl shadow-md-custom" />
              <div className="space-y-1">
                <p className="text-base font-semibold">Halo, aku Prometheus!</p>
                <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Catat transaksi, transfer, cek budget & rekap — cukup tulis, langsung kusimpan.
                </p>
              </div>
              <div className="flex max-w-sm flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void runAssistant(s)}
                    className="rounded-full border border-border bg-accent px-3 py-1.5 text-xs transition-colors hover:border-capybara/40 hover:bg-capybara/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
                m.role === "user" ? "justify-end" : "items-end justify-start gap-2"
              )}
            >
              {m.role === "assistant" && <PrometheusMascot className="h-7 w-7 shrink-0 rounded-lg" />}
              <div
                className={cn(
                  "max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-accent"
                )}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.actions && m.actions.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    {m.actions.map((a, i) => (
                      <div
                        key={`${m.id}-action-${i}`}
                        className="flex items-start gap-2 rounded-lg bg-background/80 px-2.5 py-1.5 text-xs"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-income" />
                        <span className="min-w-0">
                          <span className="font-medium">{a.label}</span>
                          {a.detail && <span className="block text-muted-foreground">{a.detail}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-end justify-start gap-2">
              <PrometheusMascot className="h-7 w-7 shrink-0 animate-bounce-soft rounded-lg" />
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-accent px-4 py-3.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
                <span className="sr-only">Berpikir</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="relative">
            {showScrollDown && (
              <button
                onClick={() => scrollToBottom(true)}
                className="absolute -top-11 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md transition-colors hover:bg-accent"
                aria-label="Scroll ke pesan terbaru"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            )}
            <div
              className={cn(
                "flex items-end gap-1 rounded-2xl border border-border bg-accent/40 p-1.5",
                "transition-colors focus-within:border-ring focus-within:bg-background"
              )}
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tulis perintah…"
                rows={1}
                className="max-h-28 min-h-[38px] flex-1 resize-none border-0 bg-transparent px-2.5 py-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isThinking || !currentUser}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl"
                onClick={handleSend}
                disabled={!input.trim() || isThinking || !currentUser}
                aria-label="Kirim"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Enter kirim • Shift+Enter baris baru</p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
