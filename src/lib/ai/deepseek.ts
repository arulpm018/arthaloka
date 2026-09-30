export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface AssistantMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
}

export type LlmMessage =
  | { role: "system" | "user"; content: string }
  | AssistantMessage
  | { role: "tool"; tool_call_id: string; content: string };

export type ChatFn = (
  messages: LlmMessage[],
  tools: unknown[]
) => Promise<{ message: AssistantMessage; model: string }>;

/**
 * Chat Completions DeepSeek (OpenAI-compatible) via fetch biasa.
 * Thinking mode dimatikan supaya latensi minimum.
 */
export function createDeepSeekChat(opts: {
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): ChatFn {
  const fetchImpl = opts.fetchImpl ?? fetch;
  return async (messages, tools) => {
    const res = await fetchImpl(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        tools,
        thinking: { type: "disabled" },
        temperature: 0.3,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`DeepSeek ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const message = data?.choices?.[0]?.message;
    if (!message) throw new Error("DeepSeek: respons tanpa pesan");
    return {
      message: {
        role: "assistant",
        content: message.content ?? null,
        tool_calls: message.tool_calls?.length ? message.tool_calls : undefined,
      },
      model: data.model ?? opts.model,
    };
  };
}
