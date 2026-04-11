"use client";

import { Network, AlertTriangle, Shield } from "lucide-react";
import { Campaign } from "@/lib/types";
import ThreatBadge from "./ThreatBadge";

interface Props {
  campaigns: Campaign[];
}

export default function CampaignCard({ campaigns }: Props) {
  if (campaigns.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-4 h-4 text-cyan" />
          <h3 className="text-[15px] font-bold">Active Campaigns</h3>
        </div>
        <div className="text-center py-6">
          <Shield className="w-8 h-8 text-safe mx-auto mb-2 opacity-50" />
          <p className="text-[13px] text-muted">No campaigns detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-4 h-4 text-cyan" />
        <h3 className="text-[15px] font-bold">Active Campaigns</h3>
        <span className="text-[12px] font-bold bg-dangerous-bg text-dangerous px-2 py-0.5 rounded-full ml-auto">
          {campaigns.length}
        </span>
      </div>
      <div className="space-y-3">
        {campaigns.slice(0, 5).map((c) => (
          <div
            key={c.id}
            className="border border-border rounded-lg p-3 hover:border-border-bright transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate">{c.name}</p>
                {c.impersonated_brand && (
                  <p className="text-[12px] text-muted mt-0.5">
                    Impersonating: <span className="text-suspicious">{c.impersonated_brand}</span>
                  </p>
                )}
              </div>
              <ThreatBadge severity={c.severity} />
            </div>
            <div className="flex items-center gap-3 text-[12px] text-muted">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {c.message_count} message{c.message_count !== 1 ? "s" : ""}
              </span>
              {c.attack_techniques.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {c.attack_techniques.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="bg-primary-light text-primary px-1.5 py-0.5 rounded font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
