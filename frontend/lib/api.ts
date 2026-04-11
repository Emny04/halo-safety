import type {
  Analysis,
  Message,
  ConnectionStatus,
  Campaign,
  SecurityScore,
  StatsSummary,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("session_id");
}

export function setSessionId(id: string) {
  localStorage.setItem("session_id", id);
}

export async function purgeStaleAnalyses(): Promise<{ removed: number; status: string }> {
  return fetchJSON("/session/purge-stale-analyses", { method: "POST" });
}

export async function ensureSession(): Promise<string> {
  const existing = getSessionId();
  if (existing) {
    const res = await fetch(`${API_BASE}/session/check`, {
      headers: { "x-session-id": existing },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.valid) return existing;
    }
  }
  const res = await fetch(`${API_BASE}/session/create`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to create session");
  const data = await res.json();
  setSessionId(data.session_id);
  return data.session_id;
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const sid = getSessionId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(sid ? { "x-session-id": sid } : {}),
  };
  const res = await fetch(`${API_BASE}${url}`, {
    headers,
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Messages
export async function getMessages(): Promise<Message[]> {
  return fetchJSON<Message[]>("/messages");
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

// Analysis
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

// Actions
export async function performAction(
  id: string,
  action: string
): Promise<{ status: string }> {
  return fetchJSON<{ status: string }>(`/messages/${id}/action`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

// Intelligence
export async function getCampaigns(): Promise<Campaign[]> {
  return fetchJSON<Campaign[]>("/campaigns");
}

export async function getSecurityScore(): Promise<SecurityScore> {
  return fetchJSON<SecurityScore>("/security-score");
}

export async function getStatsSummary(): Promise<StatsSummary> {
  return fetchJSON<StatsSummary>("/stats/summary");
}

// OAuth — pass session ID as query param so the callback can find the right session
export function getOAuthUrl(provider: "gmail" | "outlook"): string {
  const sid = getSessionId() || "";
  return `/api/oauth/${provider}/authorize?sid=${encodeURIComponent(sid)}`;
}

export async function getConnections(): Promise<ConnectionStatus> {
  return fetchJSON<ConnectionStatus>("/connections");
}

export async function fetchEmails(
  provider: string
): Promise<{ imported: number; provider: string }> {
  return fetchJSON(`/fetch-emails/${encodeURIComponent(provider)}`, {
    method: "POST",
  });
}

export async function disconnectProvider(
  provider: string
): Promise<{ status: string }> {
  return fetchJSON(`/disconnect/${encodeURIComponent(provider)}`, {
    method: "POST",
  });
}
