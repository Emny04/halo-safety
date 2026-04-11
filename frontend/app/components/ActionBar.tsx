"use client";

import { ShieldCheck, Ban, Lock, Trash2, AlertTriangle } from "lucide-react";

interface Props {
  messageId: string;
  onAction: (id: string, action: string) => Promise<void>;
  recommended?: string;
}

const ACTIONS = [
  { key: "mark_safe", label: "Safe", icon: ShieldCheck, color: "text-safe border-safe/20 bg-safe-bg hover:bg-safe/20" },
  { key: "block_sender", label: "Block", icon: Ban, color: "text-suspicious border-suspicious/20 bg-suspicious-bg hover:bg-suspicious/20" },
  { key: "quarantine", label: "Quarantine", icon: Lock, color: "text-purple border-purple/20 bg-purple-bg hover:bg-purple/20" },
  { key: "move_spam", label: "Spam", icon: Trash2, color: "text-dangerous border-dangerous/20 bg-dangerous-bg hover:bg-dangerous/20" },
  { key: "report_phishing", label: "Report", icon: AlertTriangle, color: "text-dangerous border-dangerous/20 bg-dangerous-bg hover:bg-dangerous/20" },
];

export default function ActionBar({ messageId, onAction, recommended }: Props) {
  return (
    <div className="flex gap-1.5">
      {ACTIONS.map((a) => {
        const isRec = recommended === a.key;
        return (
          <button
            key={a.key}
            onClick={() => onAction(messageId, a.key)}
            className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${a.color} ${isRec ? "ring-1 ring-primary/40" : ""}`}
          >
            <a.icon className="w-3 h-3" />
            {a.label}
            {isRec && <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-primary text-white px-1 rounded">Rec</span>}
          </button>
        );
      })}
    </div>
  );
}
