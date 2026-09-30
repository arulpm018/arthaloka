/** Kontrak data chat Prometheus — dipakai client & server. */
export interface AiAction {
  tool: string;
  label: string;
  detail: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatResponse {
  reply: string;
  actions: AiAction[];
  model: string;
}
