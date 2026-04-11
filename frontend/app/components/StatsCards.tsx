"use client";

import { Inbox, ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { Message } from "@/lib/types";

interface StatsCardsProps {
  messages: Message[];
}

export default function StatsCards({ messages }: StatsCardsProps) {
  const total = messages.length;
  const analyzed = messages.filter((m) => m.analysis).length;
  const safe = messages.filter((m) => m.analysis?.severity === "safe").length;
  const suspicious = messages.filter(
    (m) => m.analysis?.severity === "suspicious"
  ).length;
  const dangerous = messages.filter(
    (m) => m.analysis?.severity === "dangerous"
  ).length;

  const cards = [
    {
      label: "Total Messages",
      value: total,
      sub: `${analyzed} analyzed`,
      icon: Inbox,
      color: "text-primary",
      bg: "bg-primary-light",
    },
    {
      label: "Safe",
      value: safe,
      sub: "No threats detected",
      icon: ShieldCheck,
      color: "text-safe",
      bg: "bg-safe-bg",
    },
    {
      label: "Suspicious",
      value: suspicious,
      sub: "Review recommended",
      icon: AlertTriangle,
      color: "text-suspicious",
      bg: "bg-suspicious-bg",
    },
    {
      label: "Dangerous",
      value: dangerous,
      sub: "Immediate action needed",
      icon: ShieldAlert,
      color: "text-dangerous",
      bg: "bg-dangerous-bg",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card rounded-xl border p-5 flex items-start gap-4 hover:shadow-md transition-shadow"
        >
          <div className={`${card.bg} rounded-lg p-2.5`}>
            <card.icon className={`w-5 h-5 ${card.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm font-medium">{card.label}</p>
            <p className="text-xs text-muted mt-0.5">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
