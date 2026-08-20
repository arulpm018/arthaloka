"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  CheckCircle2,
  Loader2,
  Mic,
  RotateCw,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/useAppStore";
import { resetChat, sendChat, sendVoice, type AiAction } from "@/lib/ai/client";
import { cn } from "@/lib/utils/cn";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: AiAction[];
}

const SUGGESTIONS = [
  "Catat makan siang 25rb",
  "Kopi 22rb pakai jago",
  "Transfer 500rb jago ke wondr",
  "Tugas belanja mingguan",
  "Jadwal dinner jumat malam",
  "Rekap bulan ini",
];

let msgSeq = 0;
const nextId = () => `ai-msg-${++msgSeq}`;

export const AiAssistantSheet = () => {
  const open = useAppStore((s) => s.aiAssistantOpen);
  const closeAiAssistant = useAppStore((s) => s.closeAiAssistant);
  const currentUser = useAppStore((s) => s.currentUser);
  const defaultOwner = useAppStore((s) => s.defaultOwner);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  /** Posisi baca user — auto-scroll cuma jalan kalau memang sedang di dasar. */
  const atBottomRef = useRef(true);

  const uid = currentUser?.uid || "";
  const role = currentUser?.role || "arul";
  const ownerHint = defaultOwner || role;

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

  // Ikuti pesan terbaru hanya selama user memang ada di dasar chat —
  // kalau dia sedang membaca ke atas, jangan tarik posisinya.
  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, isProcessingVoice, scrollToBottom]);

  const appendMessage = (msg: Omit<ChatMessage, "id">) => {
    const full = { ...msg, id: nextId() };
    setMessages((prev) => [...prev, full]);
    return full;
  };

  const runAssistant = useCallback(
    async (message: string) => {
      if (!uid) return;
      atBottomRef.current = true; // user baru kirim — ikuti thread-nya
      appendMessage({ role: "user", text: message });
      setIsThinking(true);
      try {
        const res = await sendChat({
          uid,
          role,
          owner_hint: ownerHint,
          display_name: currentUser?.displayName || "",
          message,
        });
        appendMessage({
          role: "assistant",
          text: res.reply,
          actions: res.actions,
        });
      } catch (e) {
        const text = e instanceof Error ? e.message : "AI service error";
        appendMessage({ role: "assistant", text: `⚠️ ${text}` });
        toast.error(text);
      } finally {
        setIsThinking(false);
      }
    },
    [uid, role, ownerHint, currentUser?.displayName]
  );

  const handleReset = useCallback(async () => {
    setMessages([]);
    if (!uid) return;
    try {
      await resetChat(uid);
      toast.success("Percakapan direset");
    } catch {
      // Riwayat lokal tetap terhapus — reset server best-effort.
    }
  }, [uid]);

  const stopRecording = useCallback((cancel: boolean = false) => {
    const rec = recorderRef.current;
    if (!rec) return;
    (rec as MediaRecorder & { _cancel?: boolean })._cancel = cancel;
    if (rec.state !== "inactive") rec.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (!uid || isRecording) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Browser tidak mendukung rekam suara");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const cancelled = (rec as MediaRecorder & { _cancel?: boolean })._cancel;
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        setIsRecording(false);
        if (cancelled || blob.size < 1000) return;

        atBottomRef.current = true;
        setIsProcessingVoice(true);
        try {
          const res = await sendVoice(blob, {
            uid,
            role,
            owner_hint: ownerHint,
            display_name: currentUser?.displayName || "",
          });
          appendMessage({ role: "user", text: res.transcript });
          appendMessage({
            role: "assistant",
            text: res.reply,
            actions: res.actions,
          });
        } catch (e) {
          const text = e instanceof Error ? e.message : "AI service error";
          appendMessage({ role: "assistant", text: `⚠️ ${text}` });
          toast.error(text);
        } finally {
          setIsProcessingVoice(false);
        }
      };

      recorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch {
      toast.error("Tidak bisa akses mikrofon — cek izin browser");
    }
  }, [uid, isRecording, role, ownerHint, currentUser?.displayName]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isThinking || isRecording) return;
    setInput("");
    void runAssistant(text);
  };

  const isBusy = isThinking || isProcessingVoice;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeAiAssistant()}>
      <SheetContent
        side="bottom"
        className="flex h-[88dvh] flex-col rounded-t-sheet p-0 sm:mx-auto sm:max-w-2xl md:h-[82dvh]"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2.5 text-base">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span>Asisten AI</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                tulis atau bicara — langsung tersimpan
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 shrink-0"
              onClick={() => void handleReset()}
              disabled={isBusy || isRecording || messages.length === 0}
              aria-label="Reset percakapan"
              title="Reset percakapan"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        {/* Area chat */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && !isBusy && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </span>
              <div>
                <p className="text-sm font-medium">Halo! Aku bisa bantu catat apa aja</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Transaksi, transfer, akun, kategori, tugas, jadwal, habit,
                  wishlist — cukup bilang saja.
                </p>
              </div>
              <div className="flex max-w-sm flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void runAssistant(s)}
                    className="rounded-full border border-border bg-accent px-3 py-1.5 text-xs transition-colors hover:bg-accent/80"
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
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-accent"
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
                          {a.detail && (
                            <span className="block text-muted-foreground">{a.detail}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isBusy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-accent px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isProcessingVoice ? "Memproses suara…" : "Berpikir…"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
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

            {isRecording ? (
              <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                </span>
                <span className="flex-1 text-sm text-muted-foreground">
                  Mendengarkan… bilang saja, terus tekan stop
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5 rounded-full"
                  onClick={() => stopRecording(false)}
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </Button>
              </div>
            ) : (
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
                  disabled={isBusy || !uid}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    isRecording ? stopRecording(false) : void startRecording()
                  }
                  disabled={isBusy || !uid}
                  aria-label="Rekam suara"
                  title="Rekam suara"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl"
                  onClick={handleSend}
                  disabled={!input.trim() || isBusy || !uid}
                  aria-label="Kirim"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            {isRecording
              ? "Tekan Stop untuk memproses"
              : "Enter kirim • Shift+Enter baris baru"}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
