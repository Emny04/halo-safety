"use client";

import {
  Shield,
  Mail,
  MessageSquare,
  Wifi,
  WifiOff,
  Check,
  RefreshCw,
  X,
  Loader2,
  Plus,
} from "lucide-react";
import { getOAuthUrl } from "@/lib/api";
import { ConnectionStatus } from "@/lib/types";

interface HeaderProps {
  grandmaMode: boolean;
  onToggleGrandmaMode: () => void;
  connected: boolean;
  connections: ConnectionStatus;
  onRefreshProvider: (provider: string) => void;
  onDisconnectProvider: (provider: string) => void;
  refreshingProvider: string | null;
}

export default function Header({
  grandmaMode,
  onToggleGrandmaMode,
  connected,
  connections,
  onRefreshProvider,
  onDisconnectProvider,
  refreshingProvider,
}: HeaderProps) {
  const gmailCount = connections.gmail_accounts.length;

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Aminogli Safety
              </h1>
              <p className="text-xs text-muted -mt-0.5">
                AI Email Protection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              {connected ? (
                <Wifi className="w-3.5 h-3.5 text-safe" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-dangerous" />
              )}
              <span className="hidden sm:inline">
                {connected ? "API Connected" : "Disconnected"}
              </span>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Gmail accounts */}
            {connections.gmail_accounts.map((acc) => (
              <div key={acc.account_id} className="flex items-center gap-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-safe-bg text-safe border border-safe/20">
                  <Check className="w-3 h-3" />
                  <span className="hidden md:inline max-w-[120px] truncate">
                    {acc.email}
                  </span>
                  <span className="md:hidden">Gmail</span>
                </div>
                <button
                  onClick={() => onRefreshProvider(`gmail:${acc.account_id}`)}
                  disabled={refreshingProvider === `gmail:${acc.account_id}`}
                  className="p-1 rounded-md hover:bg-gray-100 text-muted hover:text-foreground transition-colors"
                  title={`Refresh ${acc.email}`}
                >
                  {refreshingProvider === `gmail:${acc.account_id}` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={() => onDisconnectProvider(`gmail:${acc.account_id}`)}
                  className="p-1 rounded-md hover:bg-dangerous-bg text-muted hover:text-dangerous transition-colors"
                  title={`Disconnect ${acc.email}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Add Gmail button */}
            <a
              href={getOAuthUrl("gmail")}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors"
              title="Connect a Gmail account"
            >
              <Mail className="w-3.5 h-3.5" />
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">
                {gmailCount > 0 ? "Add Gmail" : "Gmail"}
              </span>
            </a>

            {/* Outlook */}
            {connections.outlook ? (
              <div className="flex items-center gap-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-safe-bg text-safe border border-safe/20">
                  <Check className="w-3 h-3" />
                  Outlook
                </div>
                <button
                  onClick={() => onRefreshProvider("outlook")}
                  disabled={refreshingProvider === "outlook"}
                  className="p-1 rounded-md hover:bg-gray-100 text-muted hover:text-foreground transition-colors"
                  title="Refresh Outlook emails"
                >
                  {refreshingProvider === "outlook" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={() => onDisconnectProvider("outlook")}
                  className="p-1 rounded-md hover:bg-dangerous-bg text-muted hover:text-dangerous transition-colors"
                  title="Disconnect Outlook"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <a
                href={getOAuthUrl("outlook")}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors"
                title="Connect Outlook"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Outlook</span>
              </a>
            )}

            <div className="h-6 w-px bg-border" />

            <button
              onClick={onToggleGrandmaMode}
              className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                grandmaMode
                  ? "bg-dangerous text-white shadow-md"
                  : "bg-gray-100 text-foreground hover:bg-gray-200"
              }`}
            >
              {grandmaMode ? "👵 Grandma Mode ON" : "👵 Grandma Mode"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
