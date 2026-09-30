/** Kontrak data chat asisten AI — dipakai client & server. */
export interface AiAction {
  tool: string;
  label: string;
  detail: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Pilihan jawaban cepat (tombol) yang ditawarkan asisten, mis. rekening. */
export interface AiChoiceOption {
  label: string;
  /** Pesan yang dikirim atas nama user saat tombol ditekan */
  reply: string;
}

export interface AiChoice {
  prompt: string;
  options: AiChoiceOption[];
}

export interface AiChatResponse {
  reply: string;
  actions: AiAction[];
  model: string;
  /** Ada kalau asisten butuh user memilih (mis. rekening belum disebut) */
  choice?: AiChoice;
}
