"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Wifi,
  WifiOff,
  Mail,
  Plus,
  RefreshCw,
  X,
  Loader2,
  Check,
  Zap,
  Search,
  Bell,
  Settings,
  LayoutDashboard,
  ShieldAlert,
  BarChart3,
  Shield,
  AlertTriangle,
  Clock,
  Trash2,
  Heart,
  LogOut,
  Eye,
  ChevronRight,
  BellOff,
  RotateCcw,
} from "lucide-react";
import { getOAuthUrl } from "@/lib/api";
import { ConnectionStatus, SecurityScore, Message } from "@/lib/types";

interface HeaderProps {
  apiConnected: boolean;
  connections: ConnectionStatus;
  onRefreshProvider: (p: string) => void;
  onDisconnectProvider: (p: string) => void;
  refreshingProvider: string | null;
  score: SecurityScore | null;
  onAnalyzeAll: () => void;
  analyzingAll: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  messages: Message[];
  onSelectMessage?: (id: string) => void;
  guardianMode: boolean;
  onGuardianToggle: () => void;
  onClearData?: () => void;
  notify?: (msg: string, type?: "success" | "error" | "info") => void;
  /** Clears Gemini-era / stuck error analyses then runs a full rescan */
  onPurgeStaleAndRescan?: () => void | Promise<void>;
}

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "threats", label: "Threats", icon: ShieldAlert },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

export default function Header({
  apiConnected,
  connections,
  onRefreshProvider,
  onDisconnectProvider,
  refreshingProvider,
  score,
  onAnalyzeAll,
  analyzingAll,
  activeTab = "overview",
  onTabChange,
  messages,
  onSelectMessage,
  guardianMode,
  onGuardianToggle,
  onClearData,
  notify,
  onPurgeStaleAndRescan,
}: HeaderProps) {
  const [openPanel, setOpenPanel] = useState<"search" | "notifications" | "settings" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useClickOutside(panelRef, () => setOpenPanel(null));

  const toggle = (panel: "search" | "notifications" | "settings") => {
    setOpenPanel((prev) => {
      const next = prev === panel ? null : panel;
      if (next === "search") notify?.("Search — find any message by sender, subject, or text.", "info");
      if (next === "notifications") notify?.("Alerts — recent critical and suspicious items.", "info");
      if (next === "settings") notify?.("Settings — Simple Mode, accounts, and session tools.", "info");
      return next;
    });
  };

  const alerts = useMemo(() => {
    return messages
      .filter((m) => m.analysis?.severity === "dangerous" || m.analysis?.severity === "suspicious")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [messages]);

  const unreadCount = alerts.filter((m) => !m.blocked && !m.spam && !m.quarantined && !m.reported).length;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Branding */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <img src="/badge.png" alt="HaloSafety" className="w-9 h-9 rounded-xl object-cover" />
              <div>
                <h1 className="text-[17px] font-semibold tracking-tight text-white">HaloSafety</h1>
                <p className="text-[11px] text-muted uppercase tracking-[0.15em] font-medium -mt-0.5">
                  Cyber Defense
                </p>
              </div>
            </div>

            <nav className="hidden md:flex items-center bg-nav-pill backdrop-blur-md rounded-xl p-1 gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                const tabHints: Record<string, string> = {
                  overview: "Overview — dashboard snapshot, charts, and recent critical threats.",
                  threats: "Threats — full message list and detailed analysis panel.",
                  analytics: "Analytics — trends, impersonation, and campaign breakdown.",
                };
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      onTabChange?.(tab.key);
                      notify?.(tabHints[tab.key] ?? `Showing ${tab.label}.`, "info");
                    }}
                    className={`relative flex items-center gap-2 text-[15px] font-medium px-5 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? "bg-nav-active text-white shadow-[0_2px_12px_rgba(168,85,247,0.2)]"
                        : "text-muted hover:text-muted-light hover:bg-white/[0.03]"
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                    {tab.label}
                    {isActive && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {connections.gmail_accounts.map((acc) => (
              <div key={acc.account_id} className="flex items-center gap-0.5">
                <div className="flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1.5 rounded-lg bg-safe-bg text-safe border border-safe/20">
                  <Check className="w-3 h-3" strokeWidth={2} />
                  <span className="hidden lg:inline max-w-[100px] truncate">{acc.email}</span>
                  <span className="lg:hidden">Gmail</span>
                </div>
                <button
                  onClick={() => {
                    notify?.("Refreshing mail — fetching the latest messages from Gmail…", "info");
                    onRefreshProvider(`gmail:${acc.account_id}`);
                  }}
                  disabled={refreshingProvider === `gmail:${acc.account_id}`}
                  className="p-1.5 rounded-lg hover:bg-card text-muted hover:text-foreground transition-colors"
                >
                  {refreshingProvider === `gmail:${acc.account_id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />}
                </button>
                <button
                  onClick={() => {
                    notify?.("Disconnecting Gmail — imported mail for this account will be removed.", "info");
                    onDisconnectProvider(`gmail:${acc.account_id}`);
                  }}
                  className="p-1.5 rounded-lg hover:bg-dangerous-bg text-muted hover:text-dangerous transition-colors"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ))}

            <a
              href={getOAuthUrl("gmail")}
              onClick={() => notify?.("Opening Google sign-in — approve access to import Gmail.", "info")}
              className="flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1.5 rounded-lg border border-border hover:border-border-bright hover:bg-card transition-colors text-muted"
            >
              <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
              <Plus className="w-3 h-3" strokeWidth={2} />
            </a>

            {connections.outlook ? (
              <div className="flex items-center gap-0.5">
                <div className="flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1.5 rounded-lg bg-safe-bg text-safe border border-safe/20">
                  <Check className="w-3 h-3" strokeWidth={2} />
                  <span className="hidden sm:inline">Outlook</span>
                </div>
                <button
                  onClick={() => {
                    notify?.("Refreshing mail — fetching the latest messages from Outlook…", "info");
                    onRefreshProvider("outlook");
                  }}
                  disabled={refreshingProvider === "outlook"}
                  className="p-1.5 rounded-lg hover:bg-card text-muted hover:text-foreground transition-colors"
                >
                  {refreshingProvider === "outlook" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />}
                </button>
              </div>
            ) : (
              <a
                href={getOAuthUrl("outlook")}
                onClick={() => notify?.("Opening Microsoft sign-in — approve access to import Outlook mail.", "info")}
                className="flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1.5 rounded-lg border border-border hover:border-border-bright hover:bg-card transition-colors text-muted"
              >
                <Plus className="w-3 h-3" strokeWidth={2} />
                <span className="hidden sm:inline">Outlook</span>
              </a>
            )}

            <div className="hidden sm:block w-px h-6 bg-border mx-1" />

            <div className={`flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1.5 rounded-lg ${apiConnected ? "bg-safe-bg text-safe" : "bg-dangerous-bg text-dangerous"}`}>
              {apiConnected ? <Wifi className="w-3.5 h-3.5" strokeWidth={1.5} /> : <WifiOff className="w-3.5 h-3.5" strokeWidth={1.5} />}
            </div>

            <button
              onClick={() => onAnalyzeAll()}
              disabled={analyzingAll}
              className="flex items-center gap-2 text-[15px] font-semibold px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50 shadow-[0_2px_12px_rgba(168,85,247,0.25)]"
            >
              {analyzingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" strokeWidth={1.5} />}
              <span className="hidden sm:inline">{analyzingAll ? "Scanning..." : "Scan All"}</span>
            </button>

            {/* Action buttons with panels */}
            <div className="hidden lg:flex items-center gap-0.5 ml-1 relative" ref={panelRef}>
              {/* Search */}
              <button
                onClick={() => toggle("search")}
                className={`p-2 rounded-lg transition-colors ${openPanel === "search" ? "bg-primary/15 text-primary" : "hover:bg-card text-muted hover:text-foreground"}`}
              >
                <Search className="w-4 h-4" strokeWidth={1.5} />
              </button>

              {/* Notifications */}
              <button
                onClick={() => toggle("notifications")}
                className={`p-2 rounded-lg transition-colors relative ${openPanel === "notifications" ? "bg-primary/15 text-primary" : "hover:bg-card text-muted hover:text-foreground"}`}
              >
                <Bell className="w-4 h-4" strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[11px] font-bold bg-dangerous text-white rounded-full px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Settings */}
              <button
                onClick={() => toggle("settings")}
                className={`p-2 rounded-lg transition-colors ${openPanel === "settings" ? "bg-primary/15 text-primary" : "hover:bg-card text-muted hover:text-foreground"}`}
              >
                <Settings className="w-4 h-4" strokeWidth={1.5} />
              </button>

              {/* Panels */}
              {openPanel === "search" && (
                <SearchPanel
                  messages={messages}
                  onSelect={(id) => {
                    notify?.("Opening this message in the Threats tab.", "info");
                    onSelectMessage?.(id);
                    setOpenPanel(null);
                  }}
                />
              )}
              {openPanel === "notifications" && (
                <NotificationsPanel
                  alerts={alerts}
                  onSelect={(id) => {
                    notify?.("Opened alert — showing full analysis in Threats.", "info");
                    onSelectMessage?.(id);
                    setOpenPanel(null);
                  }}
                />
              )}
              {openPanel === "settings" && (
                <SettingsPanel
                  guardianMode={guardianMode}
                  onGuardianToggle={onGuardianToggle}
                  connections={connections}
                  score={score}
                  messagesCount={messages.length}
                  onClearData={onClearData}
                  notify={notify}
                  onPurgeStaleAndRescan={onPurgeStaleAndRescan}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


function SearchPanel({ messages, onSelect }: { messages: Message[]; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return messages
      .filter((m) =>
        m.sender.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        m.analysis?.impersonated_brand?.toLowerCase().includes(q) ||
        m.analysis?.category?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, messages]);

  return (
    <div className="absolute right-0 top-12 w-[380px] bg-popover border border-border-bright rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in z-50">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Search className="w-4 h-4 text-muted flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emails, senders, brands..."
          className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-muted hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {query.trim() === "" ? (
          <div className="px-4 py-8 text-center">
            <Search className="w-5 h-5 text-muted/40 mx-auto mb-2" />
            <p className="text-[13px] text-muted">Type to search across all messages</p>
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] text-muted">No results for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          results.map((msg) => {
            const sev = msg.analysis?.severity;
            const sevColor = sev === "dangerous" ? "bg-dangerous" : sev === "suspicious" ? "bg-suspicious" : sev === "safe" ? "bg-safe" : "bg-muted/30";
            return (
              <button
                key={msg.id}
                onClick={() => onSelect(msg.id)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-card-hover border-b border-border last:border-b-0 transition-colors"
              >
                <div className="flex-shrink-0 relative">
                  <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-[13px] font-bold text-muted-light">
                    {msg.sender.charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-popover ${sevColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-foreground truncate">{msg.sender}</p>
                  <p className="text-[13px] text-muted truncate">{msg.subject}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
              </button>
            );
          })
        )}
      </div>

      {results.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-card">
          <p className="text-[12px] text-muted text-center">{results.length} result{results.length !== 1 ? "s" : ""} found</p>
        </div>
      )}
    </div>
  );
}


function NotificationsPanel({ alerts, onSelect }: { alerts: Message[]; onSelect: (id: string) => void }) {
  const dangerous = alerts.filter((m) => m.analysis?.severity === "dangerous");
  const suspicious = alerts.filter((m) => m.analysis?.severity === "suspicious");

  return (
    <div className="absolute right-0 top-12 w-[380px] bg-popover border border-border-bright rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="text-[15px] font-semibold text-white">Notifications</span>
        </div>
        <div className="flex items-center gap-2">
          {dangerous.length > 0 && (
            <span className="text-[11px] font-bold bg-dangerous-bg text-dangerous px-2 py-0.5 rounded-md">
              {dangerous.length} critical
            </span>
          )}
          {suspicious.length > 0 && (
            <span className="text-[11px] font-bold bg-suspicious-bg text-suspicious px-2 py-0.5 rounded-md">
              {suspicious.length} warning
            </span>
          )}
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <BellOff className="w-6 h-6 text-muted/30 mx-auto mb-2" />
            <p className="text-[14px] font-medium text-muted">No alerts</p>
            <p className="text-[12px] text-muted/60 mt-1">Threats will appear here after scanning</p>
          </div>
        ) : (
          alerts.map((msg) => {
            const isDangerous = msg.analysis?.severity === "dangerous";
            const isHandled = msg.blocked || msg.spam || msg.quarantined || msg.reported;
            return (
              <button
                key={msg.id}
                onClick={() => onSelect(msg.id)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-card-hover ${isHandled ? "opacity-50" : ""}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                  isDangerous ? "bg-dangerous-bg border border-dangerous/20" : "bg-suspicious-bg border border-suspicious/20"
                }`}>
                  {isDangerous
                    ? <AlertTriangle className="w-4 h-4 text-dangerous" />
                    : <Eye className="w-4 h-4 text-suspicious" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-foreground truncate">
                      {isDangerous ? "Threat Detected" : "Suspicious Activity"}
                    </p>
                    <span className="text-[11px] text-muted flex-shrink-0">{timeAgo(msg.timestamp)}</span>
                  </div>
                  <p className="text-[13px] text-muted truncate mt-0.5">
                    {msg.analysis?.threat_summary || msg.subject}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-muted-light truncate max-w-[140px]">{msg.sender}</span>
                    {msg.analysis?.impersonated_brand && (
                      <span className="text-[11px] font-medium text-purple bg-purple-bg px-1.5 py-0.5 rounded">
                        {msg.analysis.impersonated_brand}
                      </span>
                    )}
                    {isHandled && (
                      <span className="text-[11px] font-medium text-safe bg-safe-bg px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> Handled
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}


function SettingsPanel({
  guardianMode,
  onGuardianToggle,
  connections,
  score,
  messagesCount,
  onClearData,
  notify,
  onPurgeStaleAndRescan,
}: {
  guardianMode: boolean;
  onGuardianToggle: () => void;
  connections: ConnectionStatus;
  score: SecurityScore | null;
  messagesCount: number;
  onClearData?: () => void;
  notify?: (msg: string, type?: "success" | "error" | "info") => void;
  onPurgeStaleAndRescan?: () => void | Promise<void>;
}) {
  const connectedCount = connections.gmail_accounts.length + (connections.outlook ? 1 : 0);

  return (
    <div className="absolute right-0 top-12 w-[320px] bg-popover border border-border-bright rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in z-50">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Settings className="w-4 h-4 text-primary" />
        <span className="text-[15px] font-semibold text-white">Settings</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Guardian Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${guardianMode ? "bg-purple-bg border border-purple/20" : "bg-card border border-border"}`}>
              <Heart className={`w-4 h-4 ${guardianMode ? "text-purple fill-purple" : "text-muted"}`} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Simple Mode</p>
              <p className="text-[12px] text-muted">Easier language for everyone</p>
            </div>
          </div>
          <button
            onClick={onGuardianToggle}
            className={`relative w-10 h-6 rounded-full transition-colors ${guardianMode ? "bg-purple" : "bg-border"}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${guardianMode ? "left-5" : "left-1"}`} />
          </button>
        </div>

        <div className="h-px bg-border" />

        {/* Quick Stats */}
        <div>
          <p className="text-[12px] text-muted uppercase tracking-widest font-bold mb-2">Session Info</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border border-border rounded-lg p-2.5 text-center">
              <p className="text-[16px] font-bold text-foreground">{messagesCount}</p>
              <p className="text-[11px] text-muted">Emails</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-2.5 text-center">
              <p className="text-[16px] font-bold text-foreground">{connectedCount}</p>
              <p className="text-[11px] text-muted">Accounts</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-2.5 text-center">
              <p className={`text-[16px] font-bold ${
                score ? (score.grade === "A" || score.grade === "B" ? "text-safe" : score.grade === "C" ? "text-suspicious" : "text-dangerous") : "text-muted"
              }`}>
                {score?.grade ?? "—"}
              </p>
              <p className="text-[11px] text-muted">Grade</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Connected Accounts */}
        <div>
          <p className="text-[12px] text-muted uppercase tracking-widest font-bold mb-2">Connected Accounts</p>
          {connectedCount === 0 ? (
            <p className="text-[13px] text-muted py-1">No accounts connected</p>
          ) : (
            <div className="space-y-1.5">
              {connections.gmail_accounts.map((acc) => (
                <div key={acc.account_id} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                  <Mail className="w-3.5 h-3.5 text-safe" />
                  <span className="text-[13px] text-foreground truncate flex-1">{acc.email}</span>
                  <span className="text-[11px] text-safe font-medium">Active</span>
                </div>
              ))}
              {connections.outlook && (
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                  <Mail className="w-3.5 h-3.5 text-safe" />
                  <span className="text-[13px] text-foreground flex-1">Outlook</span>
                  <span className="text-[11px] text-safe font-medium">Active</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-border" />

        {onPurgeStaleAndRescan && (
          <button
            type="button"
            onClick={() => {
              notify?.("Clearing stuck AI errors and starting a full rescan…", "info");
              void onPurgeStaleAndRescan();
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-primary/10 border border-primary/25 transition-colors text-left"
          >
            <RotateCcw className="w-4 h-4 text-primary" />
            <span className="text-[14px] font-medium text-foreground">Clear stuck scans — rescan</span>
          </button>
        )}

        {/* Actions */}
        <div className="space-y-1.5">
          <a
            href={getOAuthUrl("gmail")}
            onClick={() => notify?.("Opening Google sign-in to add Gmail…", "info")}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-card transition-colors text-left"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-[14px] font-medium text-foreground">Add Gmail Account</span>
          </a>
          <a
            href={getOAuthUrl("outlook")}
            onClick={() => notify?.("Opening Microsoft sign-in to add Outlook…", "info")}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-card transition-colors text-left"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-[14px] font-medium text-foreground">Add Outlook Account</span>
          </a>
          {onClearData && (
            <button
              onClick={onClearData}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-dangerous-bg transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 text-dangerous" />
              <span className="text-[14px] font-medium text-dangerous">Clear All Data</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              notify?.("Starting a new session — page will reload.", "info");
              setTimeout(() => {
                localStorage.removeItem("session_id");
                window.location.reload();
              }, 400);
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-card transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-muted" />
            <span className="text-[14px] font-medium text-muted-light">Sign Out (New Session)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
