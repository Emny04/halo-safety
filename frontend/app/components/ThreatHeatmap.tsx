"use client";

import { StatsSummary, Message } from "@/lib/types";
import { Activity } from "lucide-react";
import { useMemo } from "react";

interface Props {
  stats: StatsSummary | null;
  messages: Message[];
}

const TACTICS = [
  "urgency",
  "spoofing",
  "fake_login",
  "financial_fraud",
  "social_engineering",
  "impersonation",
  "authority_abuse",
];

const TACTIC_LABELS: Record<string, string> = {
  urgency: "Urgency",
  spoofing: "Spoofing",
  fake_login: "Fake Login",
  financial_fraud: "Finance",
  social_engineering: "Social Eng.",
  impersonation: "Impersonation",
  authority_abuse: "Authority",
};

const HEAT_COLORS = [
  "#1F1F23",
  "#3B0764",
  "#581C87",
  "#7E22CE",
  "#A855F7",
];

function getHeatColor(value: number, max: number): string {
  if (value === 0) return HEAT_COLORS[0];
  const ratio = value / Math.max(max, 1);
  const idx = Math.min(Math.floor(ratio * (HEAT_COLORS.length - 1)) + 1, HEAT_COLORS.length - 1);
  return HEAT_COLORS[idx];
}

function getTimeBucket(timestamp: string, bucketCount: number, minTime: number, range: number): number {
  const t = new Date(timestamp).getTime();
  if (range === 0) return 0;
  return Math.min(Math.floor(((t - minTime) / range) * bucketCount), bucketCount - 1);
}

export default function ThreatHeatmap({ stats, messages }: Props) {
  const cols = 12;

  const { grid, overallMax, hasData, timeLabels } = useMemo(() => {
    const analyzed = messages.filter((m) => m.analysis && !m.analysis._failed);
    if (analyzed.length === 0) {
      return {
        grid: TACTICS.map((tactic) => ({ tactic, cells: new Array(cols).fill(0) })),
        overallMax: 0,
        hasData: false,
        timeLabels: { first: "", last: "" },
      };
    }

    const times = analyzed.map((m) => new Date(m.timestamp).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const range = maxTime - minTime;

    const buckets: Record<string, number[]> = {};
    for (const tactic of TACTICS) {
      buckets[tactic] = new Array(cols).fill(0);
    }

    for (const msg of analyzed) {
      const techniques = msg.analysis?.attack_techniques ?? [];
      if (techniques.length === 0) continue;
      const bucket = getTimeBucket(msg.timestamp, cols, minTime, range);
      for (const tech of techniques) {
        if (buckets[tech]) {
          buckets[tech][bucket]++;
        }
      }
    }

    let max = 0;
    const g = TACTICS.map((tactic) => {
      const cells = buckets[tactic];
      for (const c of cells) if (c > max) max = c;
      return { tactic, cells };
    });

    const fmt = (t: number) => {
      const d = new Date(t);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    return {
      grid: g,
      overallMax: Math.max(max, 1),
      hasData: max > 0,
      timeLabels: { first: fmt(minTime), last: fmt(maxTime) },
    };
  }, [messages]);

  const totalTechniques = stats?.top_techniques
    ? Object.values(stats.top_techniques).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl rim-light p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Threat Tactics</h3>
          <p className="text-[13px] text-muted mt-0.5">
            {hasData ? `${totalTechniques} techniques detected` : "Activity heatmap"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted">Low</span>
          {HEAT_COLORS.map((c, i) => (
            <div key={i} className="w-3 h-3 rounded-[2px]" style={{ background: c }} />
          ))}
          <span className="text-[11px] text-muted">High</span>
        </div>
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6">
          <Activity className="w-8 h-8 text-muted/30 mb-2" />
          <p className="text-[13px] text-muted font-medium">No technique data yet</p>
          <p className="text-[11px] text-muted/60 mt-1">Run Scan All to detect attack tactics</p>
        </div>
      ) : (
        <div className="flex-1">
          <div className="space-y-1.5">
            {grid.map(({ tactic, cells }) => {
              const rowTotal = cells.reduce((a, b) => a + b, 0);
              return (
                <div key={tactic} className="flex items-center gap-2">
                  <span className="text-[12px] text-muted w-24 text-right truncate flex-shrink-0">
                    {TACTIC_LABELS[tactic] ?? tactic}
                  </span>
                  <div className="flex gap-[3px] flex-1">
                    {cells.map((val, i) => (
                      <div
                        key={i}
                        className="flex-1 h-[18px] rounded-[2px] transition-colors"
                        style={{ background: getHeatColor(val, overallMax) }}
                        title={`${TACTIC_LABELS[tactic]}: ${val} hit${val !== 1 ? "s" : ""}`}
                      />
                    ))}
                  </div>
                  <span className={`text-[11px] font-mono w-6 text-right flex-shrink-0 ${rowTotal > 0 ? "text-purple" : "text-muted/30"}`}>
                    {rowTotal}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 px-[104px]">
            <span className="text-[10px] text-muted/50">{timeLabels.first}</span>
            <span className="text-[10px] text-muted/50">{timeLabels.last}</span>
          </div>
        </div>
      )}
    </div>
  );
}
