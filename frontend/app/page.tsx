"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Zap } from "lucide-react";
import { Message, ConnectionStatus } from "@/lib/types";
import {
  getMessages,
  analyzeAllMessages,
  analyzeStoredMessage,
  addMessage as apiAddMessage,
  performAction,
  getConnections,
  fetchEmails,
  disconnectProvider,
} from "@/lib/api";
import Header from "./components/Header";
import StatsCards from "./components/StatsCards";
import MessageList from "./components/MessageList";
import MessageDetail from "./components/MessageDetail";
import AddMessageModal from "./components/AddMessageModal";
import WelcomeScreen from "./components/WelcomeScreen";

export default function Home() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grandmaMode, setGrandmaMode] = useState(false);
  const [filter, setFilter] = useState("all");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [connections, setConnections] = useState<ConnectionStatus>({
    gmail_accounts: [],
    outlook: false,
  });
  const [refreshingProvider, setRefreshingProvider] = useState<string | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await getMessages();
      setMessages(msgs);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  const loadConnections = useCallback(async () => {
    try {
      const c = await getConnections();
      setConnections(c);
    } catch {
      // backend not reachable
    }
  }, []);

  // Handle OAuth redirect params
  useEffect(() => {
    const connectedProvider = searchParams.get("connected");
    const imported = searchParams.get("imported");
    const account = searchParams.get("account");
    const oauthError = searchParams.get("oauth_error");

    if (connectedProvider) {
      const name =
        connectedProvider === "gmail"
          ? account
            ? `Gmail (${account})`
            : "Gmail"
          : "Outlook";
      showToast(`${name} connected — ${imported || 0} emails imported`);
      setShowWelcome(false);
      loadMessages();
      loadConnections();
      window.history.replaceState({}, "", "/");
    }
    if (oauthError) {
      showToast(
        `Failed to connect ${oauthError === "gmail" ? "Gmail" : "Outlook"}. Check your OAuth credentials.`
      );
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams, loadMessages, loadConnections]);

  useEffect(() => {
    loadMessages();
    loadConnections();
  }, [loadMessages, loadConnections]);

  // Auto-skip welcome if user has been here before (has messages loaded)
  useEffect(() => {
    if (
      connections.gmail_accounts.length > 0 ||
      connections.outlook
    ) {
      setShowWelcome(false);
    }
  }, [connections]);

  async function handleAnalyzeAll() {
    setAnalyzing(true);
    try {
      const results = await analyzeAllMessages();
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          analysis: results[m.id] ?? m.analysis,
        }))
      );
    } catch (e) {
      console.error("Analysis failed:", e);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleAnalyzeOne(id: string) {
    setAnalyzingId(id);
    try {
      const result = await analyzeStoredMessage(id);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, analysis: result } : m))
      );
    } catch (e) {
      console.error("Single analysis failed:", e);
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleAction(
    id: string,
    action: "mark_safe" | "block_sender" | "move_spam"
  ) {
    try {
      await performAction(id, action);
      await loadMessages();
    } catch (e) {
      console.error("Action failed:", e);
    }
  }

  async function handleAddMessage(msg: {
    sender: string;
    subject: string;
    body: string;
    type: string;
  }) {
    try {
      const newMsg = await apiAddMessage(msg);
      setMessages((prev) => [newMsg, ...prev]);
      setSelectedId(newMsg.id);
      handleAnalyzeOne(newMsg.id);
    } catch (e) {
      console.error("Add failed:", e);
    }
  }

  async function handleRefreshProvider(provider: string) {
    setRefreshingProvider(provider);
    try {
      const result = await fetchEmails(provider);
      showToast(`Refreshed ${result.imported} emails`);
      await loadMessages();
    } catch (e) {
      console.error("Fetch failed:", e);
      showToast(`Failed to fetch emails`);
    } finally {
      setRefreshingProvider(null);
    }
  }

  async function handleDisconnectProvider(provider: string) {
    try {
      await disconnectProvider(provider);
      showToast(`Disconnected`);
      await loadMessages();
      await loadConnections();
    } catch (e) {
      console.error("Disconnect failed:", e);
    }
  }

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  // Welcome screen
  if (showWelcome) {
    return (
      <>
        {toast && (
          <div className="fixed top-6 right-6 z-50 animate-fade-in bg-card border rounded-xl shadow-lg px-5 py-3 text-sm max-w-sm">
            {toast}
          </div>
        )}
        <WelcomeScreen
          connections={connections}
          onSkip={() => setShowWelcome(false)}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        grandmaMode={grandmaMode}
        onToggleGrandmaMode={() => setGrandmaMode((g) => !g)}
        connected={connected}
        connections={connections}
        onRefreshProvider={handleRefreshProvider}
        onDisconnectProvider={handleDisconnectProvider}
        refreshingProvider={refreshingProvider}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-fade-in bg-card border rounded-xl shadow-lg px-5 py-3 text-sm max-w-sm">
          {toast}
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <StatsCards messages={messages} />

        <div className="flex items-center justify-between">
          <div />
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Message
            </button>
            <button
              onClick={handleAnalyzeAll}
              disabled={analyzing}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              {analyzing ? "Analyzing All…" : "Scan All Messages"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[500px]">
          <div className="lg:col-span-2">
            <MessageList
              messages={messages}
              selectedId={selectedId}
              onSelect={setSelectedId}
              analyzing={analyzing}
              filter={filter}
              onFilterChange={setFilter}
            />
          </div>
          <div className="lg:col-span-3">
            <MessageDetail
              message={selected}
              grandmaMode={grandmaMode}
              onAction={handleAction}
              onAnalyze={handleAnalyzeOne}
              analyzingId={analyzingId}
              onBack={() => setSelectedId(null)}
            />
          </div>
        </div>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted">
        Aminogli Safety &middot; AI-Powered Email Protection
      </footer>

      <AddMessageModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMessage}
      />
    </div>
  );
}
