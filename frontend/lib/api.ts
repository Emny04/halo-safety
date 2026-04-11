import { Analysis, Message, ConnectionStatus } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getMessages(): Promise<Message[]> {
  return fetchJSON<Message[]>("/messages");
}

export async function analyzeMessage(text: string): Promise<Analysis> {
  return fetchJSON<Analysis>("/analyze-message", {
    method: "POST",
    body: JSON.stringify({ message_text: text }),
  });
}

export async function analyzeStoredMessage(id: string): Promise<Analysis> {
  return fetchJSON<Analysis>(`/messages/${id}/analyze`, { method: "POST" });
}

export async function analyzeAllMessages(): Promise<Record<string, Analysis>> {
  return fetchJSON<Record<string, Analysis>>("/analyze-all", {
    method: "POST",
  });
}

export async function addMessage(msg: {
  sender: string;
  subject: string;
  body: string;
  type: string;
}): Promise<Message> {
  return fetchJSON<Message>("/messages", {
    method: "POST",
    body: JSON.stringify(msg),
  });
}

export async function performAction(
  id: string,
  action: "mark_safe" | "block_sender" | "move_spam"
): Promise<{ status: string }> {
  return fetchJSON<{ status: string }>(`/messages/${id}/action`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

// ---------------------------------------------------------------------------
// OAuth / email provider connections
// ---------------------------------------------------------------------------
export { type ConnectionStatus } from "./types";

export function getOAuthUrl(provider: "gmail" | "outlook"): string {
  return `${API_BASE}/oauth/${provider}/authorize`;
}

export async function getConnections(): Promise<ConnectionStatus> {
  return fetchJSON<ConnectionStatus>("/connections");
}

export async function fetchEmails(
  provider: string
): Promise<{ imported: number; provider: string }> {
  return fetchJSON<{ imported: number; provider: string }>(
    `/fetch-emails/${encodeURIComponent(provider)}`,
    { method: "POST" }
  );
}

export async function disconnectProvider(
  provider: string
): Promise<{ status: string }> {
  return fetchJSON<{ status: string }>(
    `/disconnect/${encodeURIComponent(provider)}`,
    { method: "POST" }
  );
}
