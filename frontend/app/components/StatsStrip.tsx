"use client";

import { Shield, AlertTriangle, Ban, Eye, Activity } from "lucide-react";
import { StatsSummary } from "@/lib/types";

interface Props {
  stats: StatsSummary | null;
}

export default function StatsStrip({ stats }: Props) {
  const items = [
    { icon: Eye, label: "Messages Scanned", value: stats?.messages_scanned ?? 0, color: "text-cyan", bg: "bg-cyan-bg", border: "border-cyan/20" },
    { icon: AlertTriangle, label: "Threats Found", value: stats?.threats_detected ?? 0, color: "text-dangerous", bg: "bg-dangerous-bg", border: "border-dangerous/20" },
    { icon: Ban, label: "Actions Taken", value: stats?.threats_blocked ?? 0, color: "text-suspicious", bg: "bg-suspicious-bg", border: "border-suspicious/20" },
    { icon: Activity, label: "Active Campaigns", value: stats?.campaigns_active ?? 0, color: "text-purple", bg: "bg-purple-bg", border: "border-purple/20" },
    { icon: Shield, label: "Verified Safe", value: (stats?.severity_distribution?.safe) ?? 0, color: "text-safe", bg: "bg-safe-bg", border: "border-safe/20" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-card border border-border rounded-xl rim-light p-5 flex items-center gap-4 hover:border-border-bright transition-colors"
        >
          <div className={`w-12 h-12 rounded-xl ${item.bg} border ${item.border} flex items-center justify-center flex-shrink-0`}>
            <item.icon className={`w-6 h-6 ${item.color}`} strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-2xl font-bold text-white block">{item.value}</span>
            <span className="text-[13px] font-medium text-muted">{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
