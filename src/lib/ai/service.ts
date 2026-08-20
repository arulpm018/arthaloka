/**
 * Proxy ke AI service (Python/Agno) — server-side saja.
 * AI_SERVICE_URL & AI_SERVICE_KEY dibaca dari env server.
 */

const SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8006";
const SERVICE_KEY = process.env.AI_SERVICE_KEY || "";

export async function proxyAiChat(body: unknown): Promise<Response> {
  return fetch(`${SERVICE_URL}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SERVICE_KEY ? { "X-AI-Service-Key": SERVICE_KEY } : {}),
    },
    body: JSON.stringify(body),
  });
}

export async function proxyAiReset(uid: string): Promise<Response> {
  return fetch(`${SERVICE_URL}/ai/reset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SERVICE_KEY ? { "X-AI-Service-Key": SERVICE_KEY } : {}),
    },
    body: JSON.stringify({ uid }),
  });
}

export async function proxyAiVoice(form: FormData): Promise<Response> {
  const headers: HeadersInit = {};
  if (SERVICE_KEY) headers["X-AI-Service-Key"] = SERVICE_KEY;
  return fetch(`${SERVICE_URL}/ai/voice`, {
    method: "POST",
    headers,
    body: form,
  });
}
