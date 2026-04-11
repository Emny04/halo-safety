"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  getMessages,
  analyzeStoredMessage,
  analyzeAllMessages,
  performAction,
  getConnections,
  getSecurityScore,
  getStatsSummary,
  getCampaigns,
  fetchEmails,
  disconnectProvider,
  ensureSession,
  purgeStaleAnalyses,
} from "@/lib/api";
import type {
  Message,
  ConnectionStatus,
  SecurityScore,
  StatsSummary,
  Campaign,
} from "@/lib/types";

import Header from "./components/Header";
import WelcomeScreen from "./components/WelcomeScreen";
import StatsStrip from "./components/StatsStrip";
import CategoryChart from "./components/CategoryChart";
import ThreatHeatmap from "./components/ThreatHeatmap";
import ThreatStatusRadial from "./components/ThreatStatusRadial";
import ThreatFeed from "./components/ThreatFeed";
import ThreatDetail from "./components/ThreatDetail";
import CampaignCard from "./components/CampaignCard";
import AttackTrends from "./components/AttackTrends";
import BrandImpersonation from "./components/BrandImpersonation";

export default function Home() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureSession().then(() => setReady(true)).catch(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <MainDashboard />;
}

function MainDashboard() {
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [connections, setConnections] = useState<ConnectionStatus>({ gmail_accounts: [], outlook: false });
  const [apiConnected, setApiConnected] = useState(false);
  const [score, setScore] = useState<SecurityScore | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [refreshingProvider, setRefreshingProvider] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(false);
  const [guardianMode, setGuardianMode] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await getMessages();
      setMessages(msgs);
      setApiConnected(true);
    } catch { setApiConnected(false); }
  }, []);

  const loadConnections = useCallback(async () => {
    try { setConnections(await getConnections()); } catch { /* ignore */ }
  }, []);

  const loadIntelligence = useCallback(async () => {
    try {
      const [s, st, c] = await Promise.all([getSecurityScore(), getStatsSummary(), getCampaigns()]);
      setScore(s); setStats(st); setCampaigns(c);
    } catch { /* ignore */ }
  }, []);

  const hasAutoScanned = useRef(false);

  useEffect(() => { loadMessages(); loadConnections(); loadIntelligence(); }, [loadMessages, loadConnections, loadIntelligence]);

  useEffect(() => {
    if (hasAutoScanned.current || analyzingAll || messages.length === 0) return;
    const needsScan = messages.some((m) => !m.analysis || m.analysis._failed);
    if (needsScan) {
      hasAutoScanned.current = true;
      handleAnalyzeAll();
    }
  }, [messages]);

  useEffect(() => {
    const connectedProvider = searchParams.get("connected");
    const imported = searchParams.get("imported");
    const account = searchParams.get("account");
    const oauthError = searchParams.get("oauth_error");
    if (connectedProvider) {
      const name = connectedProvider === "gmail" ? account ? `Gmail (${account})` : "Gmail" : "Outlook";
      showToast(`${name} connected — ${imported || 0} emails imported`, "success");
      setShowWelcome(false); loadMessages(); loadConnections();
      window.history.replaceState({}, "", "/");
    }
    if (oauthError) { showToast(`OAuth error: ${oauthError}. Please try again.`, "error"); window.history.replaceState({}, "", "/"); }
  }, [searchParams, showToast, loadMessages, loadConnections]);

  useEffect(() => {
    if (connections.gmail_accounts.length > 0 || connections.outlook) setShowWelcome(false);
  }, [connections]);

  const handleAnalyzeAll = async () => {
    setAnalyzingAll(true);
    showToast("Scanning every message with AI — this may take a little while…", "info");
    try { await analyzeAllMessages(); await loadMessages(); await loadIntelligence(); showToast("Scan complete — all messages were analyzed with OpenAI.", "success"); }
    catch { showToast("Scan failed. Check that OPENAI_API_KEY is set on the server and restart the backend.", "error"); }
    setAnalyzingAll(false);
  };

  const handlePurgeStaleAndRescan = async () => {
    try {
      showToast("Removing old failed scan results (e.g. Gemini cache) from this session…", "info");
      const { removed } = await purgeStaleAnalyses();
      hasAutoScanned.current = false;
      await loadMessages();
      await loadIntelligence();
      showToast(
        removed > 0
          ? `Cleared ${removed} stuck result(s). Running a fresh OpenAI scan…`
          : "No stuck results left on server. Running a fresh OpenAI scan…",
        "info"
      );
      setAnalyzingAll(true);
      try {
        await analyzeAllMessages();
        await loadMessages();
        await loadIntelligence();
        showToast("Fresh scan complete — messages were analyzed with OpenAI.", "success");
      } catch {
        showToast("Old cache cleared, but the new scan failed. Check OPENAI_API_KEY on the server.", "error");
      } finally {
        setAnalyzingAll(false);
      }
    } catch {
      showToast("Could not clear cache. Is the backend running?", "error");
    }
  };

  const toggleGuardian = useCallback(() => {
    setGuardianMode((prev) => {
      const next = !prev;
      queueMicrotask(() => {
        showToast(
          next
            ? "Simple Mode on — easier words for verdicts, auth checks, and evidence."
            : "Simple Mode off — full technical labels and pipeline details.",
          "info"
        );
      });
      return next;
    });
  }, [showToast]);

  const handleAnalyzeOne = async (id: string) => {
    setAnalyzingId(true);
    showToast("Running AI analysis on this message — please wait…", "info");
    try {
      await analyzeStoredMessage(id); await loadMessages(); await loadIntelligence();
      showToast("Analysis finished — results updated with OpenAI.", "success");
    }
    catch { showToast("Analysis failed. Check OPENAI_API_KEY and try again.", "error"); }
    setAnalyzingId(false);
  };

  const actionMessages: Record<string, string> = {
    mark_safe: "Marked as safe — this message is trusted now.",
    block_sender: "Sender blocked — you will not see mail from them here again.",
    quarantine: "Message quarantined — it is isolated for review.",
    move_spam: "Moved to spam — similar mail may be filtered.",
    report_phishing: "Reported as phishing — thank you for helping protect others.",
  };

  const handleAction = async (id: string, action: string) => {
    const pending: Record<string, string> = {
      mark_safe: "Marking message as safe…",
      block_sender: "Blocking sender…",
      quarantine: "Quarantining message…",
      move_spam: "Moving to spam…",
      report_phishing: "Submitting phishing report…",
    };
    showToast(pending[action] ?? "Applying action…", "info");
    try {
      await performAction(id, action); await loadMessages(); await loadIntelligence();
      showToast(actionMessages[action] ?? "Action completed.", "success");
    }
    catch { showToast("That action could not be applied. Try again.", "error"); }
  };

  const handleRefreshProvider = async (provider: string) => {
    setRefreshingProvider(provider);
    try { const result = await fetchEmails(provider); await loadMessages(); showToast(`Inbox refreshed — ${result.imported} new message(s) pulled in.`, "success"); }
    catch { showToast("Could not refresh mail. Check your connection and try again.", "error"); }
    setRefreshingProvider(null);
  };

  const handleDisconnectProvider = async (provider: string) => {
    try { await disconnectProvider(provider); await loadMessages(); await loadConnections(); showToast("Account disconnected — mail from that account was removed from this session.", "success"); }
    catch { showToast("Could not disconnect that account.", "error"); }
  };

  const selectedMessage = messages.find((m) => m.id === selectedId) ?? null;

  if (showWelcome) {
    return (
      <>
        {toast && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md rounded-xl px-5 py-3 shadow-2xl animate-fade-in border ${
              toast.type === "success" ? "bg-safe-bg border-safe/30 text-safe" :
              toast.type === "error" ? "bg-dangerous-bg border-dangerous/30 text-dangerous" :
              "bg-popover border-border-bright text-foreground"
            }`}
          >
            <p className="text-[13px] font-medium leading-snug">{toast.msg}</p>
          </div>
        )}
        <WelcomeScreen
          connections={connections}
          onNotify={showToast}
          onSkip={() => setShowWelcome(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-md rounded-xl px-5 py-3 shadow-2xl animate-fade-in border ${
            toast.type === "success" ? "bg-safe-bg border-safe/30 text-safe" :
            toast.type === "error" ? "bg-dangerous-bg border-dangerous/30 text-dangerous" :
            "bg-popover border-primary/30 text-foreground shadow-primary/10"
          }`}
        >
          <p className="text-[13px] font-medium leading-snug">{toast.msg}</p>
        </div>
      )}

      <Header
        apiConnected={apiConnected}
        connections={connections}
        onRefreshProvider={handleRefreshProvider}
        onDisconnectProvider={handleDisconnectProvider}
        refreshingProvider={refreshingProvider}
        score={score}
        onAnalyzeAll={handleAnalyzeAll}
        analyzingAll={analyzingAll}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        messages={messages}
        onSelectMessage={(id) => { setSelectedId(id); setActiveTab("threats"); }}
        guardianMode={guardianMode}
        onGuardianToggle={toggleGuardian}
        notify={showToast}
        onPurgeStaleAndRescan={handlePurgeStaleAndRescan}
        onClearData={async () => {
          showToast("Clearing session and reloading…", "info");
          await new Promise((r) => setTimeout(r, 400));
          localStorage.removeItem("session_id");
          window.location.reload();
        }}
      />

      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-6">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                                */}
        {/* Stats + Charts + Recent critical threats + Campaigns        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            <StatsStrip stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CategoryChart stats={stats} />
              <ThreatHeatmap stats={stats} messages={messages} />
              <ThreatStatusRadial score={score} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Recent critical threats */}
              <div className="lg:col-span-8" style={{ maxHeight: "480px" }}>
                <ThreatFeed
                  messages={messages.filter(m => m.analysis?.severity === "dangerous" || m.analysis?.severity === "suspicious").slice(0, 20)}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    showToast("Opening this message in Threats with full analysis.", "info");
                    setSelectedId(id);
                    setActiveTab("threats");
                  }}
                  filter="all"
                  onFilterChange={() => {}}
                  notify={showToast}
                />
              </div>

              {/* Campaigns + Brands */}
              <div className="lg:col-span-4 space-y-6">
                <CampaignCard campaigns={campaigns} />
                <BrandImpersonation stats={stats} />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* THREATS TAB                                                 */}
        {/* Full threat table + detail panel side by side               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "threats" && (
          <div className={`grid grid-cols-1 ${selectedMessage ? "lg:grid-cols-12" : "lg:grid-cols-1"} gap-6 animate-fade-in`}>
            <div className={`${selectedMessage ? "lg:col-span-7" : "lg:col-span-1"}`} style={{ maxHeight: "calc(100vh - 140px)" }}>
              <ThreatFeed
                messages={messages}
                selectedId={selectedId}
                onSelect={(id) => {
                  showToast("Message selected — review the analysis panel on the right.", "info");
                  setSelectedId(id);
                }}
                filter={filter}
                onFilterChange={setFilter}
                notify={showToast}
              />
            </div>

            {selectedMessage && (
              <div className="lg:col-span-5 bg-card border border-border rounded-xl rim-light overflow-hidden animate-slide-in-right" style={{ maxHeight: "calc(100vh - 140px)" }}>
                <ThreatDetail
                  message={selectedMessage}
                  onAction={handleAction}
                  onAnalyze={handleAnalyzeOne}
                  guardianMode={guardianMode}
                  onGuardianToggle={toggleGuardian}
                  analyzing={analyzingId}
                />
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ANALYTICS TAB                                               */}
        {/* Full charts + Attack trends + Brand impersonation + Camps   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-fade-in">
            <StatsStrip stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CategoryChart stats={stats} />
              <ThreatHeatmap stats={stats} messages={messages} />
              <ThreatStatusRadial score={score} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <AttackTrends stats={stats} />
              </div>
              <div className="lg:col-span-1">
                <BrandImpersonation stats={stats} />
              </div>
              <div className="lg:col-span-1">
                <CampaignCard campaigns={campaigns} />
              </div>
            </div>

            {/* Severity breakdown detail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SeverityCard label="Critical Threats" severity="dangerous" messages={messages} color="dangerous" />
              <SeverityCard label="Suspicious Messages" severity="suspicious" messages={messages} color="suspicious" />
              <SeverityCard label="Verified Safe" severity="safe" messages={messages} color="safe" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SeverityCard({ label, severity, messages, color }: { label: string; severity: string; messages: Message[]; color: string }) {
  const filtered = messages.filter(m => m.analysis?.severity === severity);
  const topBrands = filtered
    .map(m => m.analysis?.impersonated_brand)
    .filter(Boolean)
    .reduce((acc, b) => { acc[b!] = (acc[b!] || 0) + 1; return acc; }, {} as Record<string, number>);
  const topTechniques = filtered
    .flatMap(m => m.analysis?.attack_techniques ?? [])
    .reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className={`bg-card border border-border rounded-xl rim-light p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-white">{label}</h3>
        <span className={`text-lg font-bold text-${color}`}>{filtered.length}</span>
      </div>
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {Object.entries(topBrands).length > 0 && (
            <div>
              <p className="text-[12px] text-muted uppercase tracking-widest font-bold mb-1.5">Top Targets</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(topBrands).sort(([,a],[,b]) => b - a).slice(0, 4).map(([brand, count]) => (
                  <span key={brand} className={`text-[12px] font-medium px-2 py-1 rounded-lg bg-${color}-bg text-${color} border border-${color}/20`}>
                    {brand} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}
          {Object.entries(topTechniques).length > 0 && (
            <div>
              <p className="text-[12px] text-muted uppercase tracking-widest font-bold mb-1.5">Techniques Used</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(topTechniques).sort(([,a],[,b]) => b - a).slice(0, 4).map(([tech, count]) => (
                  <span key={tech} className="text-[12px] font-medium px-2 py-1 rounded-lg bg-primary-light text-primary border border-primary/20">
                    {tech.replace(/_/g, " ")} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="pt-2 border-t border-border">
            <p className="text-[13px] text-muted">
              {filtered.filter(m => m.blocked || m.spam || m.quarantined || m.reported).length} handled
              {" · "}
              {filtered.filter(m => !m.blocked && !m.spam && !m.quarantined && !m.reported).length} pending action
            </p>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-muted py-4 text-center">No messages in this category</p>
      )}
    </div>
  );
}
