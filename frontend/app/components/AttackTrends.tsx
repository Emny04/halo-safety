"use client";

import { BarChart3, Crosshair } from "lucide-react";
import { StatsSummary } from "@/lib/types";

interface Props {
  stats: StatsSummary | null;
}

const TECHNIQUE_LABELS: Record<string, string> = {
  urgency: "Urgency Pressure",
  spoofing: "Sender Spoofing",
  fake_login: "Fake Login Page",
  financial_fraud: "Financial Fraud",
  social_engineering: "Social Engineering",
  lookalike_domain: "Lookalike Domain",
  suspicious_attachment: "Suspicious Attachment",
  reward_scam: "Reward Scam",
  impersonation: "Brand Impersonation",
  authority_abuse: "Authority Abuse",
};

export default function AttackTrends({ stats }: Props) {
  const techniques = stats?.top_techniques ?? {};
  const entries = Object.entries(techniques).sort(([, a], [, b]) => b - a);
  const max = Math.max(...Object.values(techniques), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-cyan" />
        <h3 className="text-[15px] font-bold">Attack Techniques</h3>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-6">
          <Crosshair className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
          <p className="text-[13px] text-muted">Run analysis to see trends</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.slice(0, 7).map(([tech, count]) => {
            const pct = (count / max) * 100;
            return (
              <div key={tech}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[13px] font-medium text-muted-light">
                    {TECHNIQUE_LABELS[tech] ?? tech}
                  </span>
                  <span className="text-[12px] font-bold text-foreground">{count}</span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-cyan rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
