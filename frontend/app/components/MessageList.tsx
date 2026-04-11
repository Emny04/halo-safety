"use client";

import {
  Mail,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Loader2,
  Ban,
  Trash2,
} from "lucide-react";
import { Message } from "@/lib/types";

interface MessageListProps {
  messages: Message[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  analyzing: boolean;
  filter: string;
  onFilterChange: (f: string) => void;
}

function severityConfig(severity?: string) {
  switch (severity) {
    case "safe":
      return {
        icon: ShieldCheck,
        color: "text-safe",
        bg: "bg-safe-bg",
        border: "border-l-safe",
        label: "Safe",
      };
    case "suspicious":
      return {
        icon: AlertTriangle,
        color: "text-suspicious",
        bg: "bg-suspicious-bg",
        border: "border-l-suspicious",
        label: "Suspicious",
      };
    case "dangerous":
      return {
        icon: ShieldAlert,
        color: "text-dangerous",
        bg: "bg-dangerous-bg",
        border: "border-l-dangerous",
        label: "Dangerous",
      };
    default:
      return {
        icon: Clock,
        color: "text-muted",
        bg: "bg-gray-50",
        border: "border-l-gray-300",
        label: "Pending",
      };
  }
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const filters = [
  { key: "all", label: "All" },
  { key: "dangerous", label: "Dangerous" },
  { key: "suspicious", label: "Suspicious" },
  { key: "safe", label: "Safe" },
  { key: "unanalyzed", label: "Pending" },
];

export default function MessageList({
  messages,
  selectedId,
  onSelect,
  analyzing,
  filter,
  onFilterChange,
}: MessageListProps) {
  const filtered = messages.filter((m) => {
    if (m.spam) return false;
    if (filter === "all") return true;
    if (filter === "unanalyzed") return !m.analysis;
    return m.analysis?.severity === filter;
  });

  return (
    <div className="bg-card rounded-xl border flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">
            Inbox{" "}
            <span className="text-muted font-normal">({filtered.length})</span>
          </h2>
          {analyzing && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing…
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted">
            No messages match this filter.
          </div>
        )}
        {filtered.map((msg) => {
          const sev = severityConfig(msg.analysis?.severity);
          const isSelected = msg.id === selectedId;
          return (
            <button
              key={msg.id}
              onClick={() => onSelect(msg.id)}
              className={`w-full text-left px-4 py-3.5 border-l-3 transition-colors hover:bg-gray-50 ${
                sev.border
              } ${isSelected ? "bg-primary-light/40" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className={`${sev.bg} rounded-md p-1.5 mt-0.5`}>
                  {msg.type === "sms" ? (
                    <MessageSquare className={`w-4 h-4 ${sev.color}`} />
                  ) : (
                    <Mail className={`w-4 h-4 ${sev.color}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {msg.sender}
                    </span>
                    <span className="text-[11px] text-muted whitespace-nowrap">
                      {timeAgo(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm truncate mt-0.5">
                    {msg.subject}
                    {msg.blocked && (
                      <Ban className="w-3 h-3 inline ml-1 text-dangerous" />
                    )}
                    {msg.spam && (
                      <Trash2 className="w-3 h-3 inline ml-1 text-muted" />
                    )}
                  </p>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {msg.body.slice(0, 80)}…
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {msg.source && msg.source !== "demo" && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary-light text-primary uppercase">
                        {msg.source}
                      </span>
                    )}
                    {msg.analysis && (
                      <>
                        <span
                          className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${sev.bg} ${sev.color}`}
                        >
                          {sev.label}
                        </span>
                        <span className="text-[11px] text-muted">
                          Risk: {msg.analysis.risk_score}/100
                        </span>
                        <span className="text-[11px] text-muted capitalize">
                          {msg.analysis.category}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
