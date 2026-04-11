"use client";

import { Mail, MessageSquare, Search, Filter, Shield, AlertCircle } from "lucide-react";
import { Message } from "@/lib/types";
import { useState, useMemo } from "react";

interface Props {
  messages: Message[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: string;
  onFilterChange: (f: string) => void;
  notify?: (msg: string, type?: "success" | "error" | "info") => void;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "dangerous", label: "Critical" },
  { key: "suspicious", label: "Warning" },
  { key: "safe", label: "Safe" },
  { key: "unanalyzed", label: "Pending" },
];

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const STATUS_PILL: Record<string, { label: string; color: string; dot: string }> = {
  dangerous: { label: "Open", color: "text-dangerous border-border", dot: "bg-dangerous" },
  suspicious: { label: "Review", color: "text-suspicious border-border", dot: "bg-suspicious" },
  safe: { label: "Resolved", color: "text-safe border-border", dot: "bg-safe" },
};

function RiskBar({ score }: { score: number }) {
  const blocks = 12;
  const filled = Math.round((score / 100) * blocks);
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: blocks }, (_, i) => {
        const isFilled = i < filled;
        let color = "#26262A";
        if (isFilled) {
          const ratio = i / blocks;
          if (ratio < 0.4) color = "#6366F1";
          else if (ratio < 0.7) color = "#A855F7";
          else color = "#D43370";
        }
        return (
          <div
            key={i}
            className="w-[4px] h-[14px] rounded-[1px]"
            style={{ background: color }}
          />
        );
      })}
    </div>
  );
}

const FILTER_HINTS: Record<string, string> = {
  all: "Showing all messages in the feed.",
  dangerous: "Filter: Critical — only high-severity threats.",
  suspicious: "Filter: Warning — needs review before you trust it.",
  safe: "Filter: Safe — messages marked low risk.",
  unanalyzed: "Filter: Pending — messages not scanned by AI yet.",
};

export default function ThreatFeed({ messages, selectedId, onSelect, filter, onFilterChange, notify }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = messages;
    if (filter !== "all") {
      if (filter === "unanalyzed") {
        list = list.filter((m) => !m.analysis);
      } else {
        list = list.filter((m) => m.analysis?.severity === filter);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.sender.toLowerCase().includes(q) ||
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q)
      );
    }
    return list;
  }, [messages, filter, search]);

  return (
    <div className="bg-card border border-border rounded-xl rim-light overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Security Threats</h3>
          <p className="text-[13px] text-muted">{filtered.length} threats found</p>
        </div>
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-[14px] text-foreground placeholder:text-muted focus:outline-none focus:border-border-bright transition-colors"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-5 py-2 border-b border-border">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              onFilterChange(f.key);
              notify?.(FILTER_HINTS[f.key] ?? `Filter: ${f.label}`, "info");
            }}
            className={`text-[12px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-md transition-colors ${
              filter === f.key
                ? "bg-nav-active text-white"
                : "text-muted hover:text-muted-light hover:bg-background"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_80px_72px_48px] gap-3 px-5 py-2.5 border-b border-border text-[12px] uppercase tracking-widest font-bold text-muted">
        <span>Entity</span>
        <span>Risk Level</span>
        <span>Category</span>
        <span>Status</span>
        <span>Time</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Filter className="w-6 h-6 text-muted/30 mb-2" strokeWidth={1.5} />
            <p className="text-[13px] text-muted">No threats match</p>
          </div>
        ) : (
          filtered.map((msg) => {
            const isSelected = msg.id === selectedId;
            const severity = msg.analysis?.severity;
            const pill = severity ? STATUS_PILL[severity] : null;
            const isActioned = msg.blocked || msg.spam || msg.quarantined || msg.reported;

            return (
              <button
                key={msg.id}
                onClick={() => onSelect(msg.id)}
                className={`w-full text-left grid grid-cols-[1fr_80px_80px_72px_48px] gap-3 items-center px-5 py-3 border-b border-border transition-colors ${
                  isSelected ? "bg-card-hover" : "hover:bg-[#1C1C21]"
                } ${msg.quarantined ? "opacity-50" : ""}`}
              >
                {/* Entity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold ${
                      msg.type === "sms" ? "bg-purple-bg text-purple" : "bg-indigo-bg text-indigo"
                    }`}>
                      {msg.sender.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-card border border-border flex items-center justify-center">
                      {msg.type === "sms" ? (
                        <MessageSquare className="w-2 h-2 text-purple" />
                      ) : (
                        <Mail className="w-2 h-2 text-indigo" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-white truncate">{msg.sender}</p>
                    <p className="text-[13px] text-muted truncate">{msg.subject}</p>
                  </div>
                </div>

                {/* Risk Level */}
                <div>
                  {msg.analysis?._failed ? (
                    <span className="text-[12px] text-dangerous font-medium">Error</span>
                  ) : msg.analysis ? (
                    <div className="flex flex-col gap-1">
                      <RiskBar score={msg.analysis.risk_score} />
                      <span className="text-[11px] text-muted font-mono">{msg.analysis.risk_score}/100</span>
                    </div>
                  ) : (
                    <span className="text-[12px] text-muted italic">—</span>
                  )}
                </div>

                {/* Category */}
                <div>
                  {msg.analysis?._failed ? (
                    <span className="text-[12px] text-muted italic">Retry needed</span>
                  ) : msg.analysis?.impersonated_brand ? (
                    <span className="text-[12px] font-medium text-purple truncate block">
                      {msg.analysis.impersonated_brand}
                    </span>
                  ) : msg.analysis?.category ? (
                    <span className="text-[12px] font-medium text-muted-light capitalize">
                      {msg.analysis.category}
                    </span>
                  ) : (
                    <span className="text-[12px] text-muted italic">Pending</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  {msg.analysis?._failed ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2 py-1 rounded-full border border-dangerous/30 text-dangerous bg-dangerous-bg">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Failed
                    </span>
                  ) : isActioned ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2 py-1 rounded-full border border-border text-safe">
                      <Shield className="w-2.5 h-2.5" />
                      Handled
                    </span>
                  ) : pill ? (
                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2 py-1 rounded-full border ${pill.color}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${pill.dot} animate-threat-pulse`} />
                      {pill.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2 py-1 rounded-full border border-border text-muted">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                      New
                    </span>
                  )}
                </div>

                {/* Time */}
                <span className="text-[12px] text-muted font-mono">
                  {timeAgo(msg.timestamp)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
