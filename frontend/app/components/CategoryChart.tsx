"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { StatsSummary } from "@/lib/types";
import { Crosshair } from "lucide-react";

interface Props {
  stats: StatsSummary | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing",
  scam: "Scam",
  marketing: "Marketing",
  legit: "Legitimate",
};

const BAR_COLORS = ["#D43370", "#A855F7", "#6366F1", "#2DD4BF"];

export default function CategoryChart({ stats }: Props) {
  const categories = stats?.categories ?? {};
  const data = Object.entries(categories)
    .map(([key, value]) => ({
      name: CATEGORY_LABELS[key] ?? key,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-xl rim-light p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Threat Categories</h3>
          <p className="text-[13px] text-muted mt-0.5">Breakdown by type</p>
        </div>
        <div className="flex gap-2">
          {data.slice(0, 3).map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: BAR_COLORS[i] }} />
              <span className="text-[12px] text-muted">{d.name}</span>
            </div>
          ))}
        </div>
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} barSize={32} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#52525B", fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#52525B", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{ background: "#1F1F23", border: "1px solid #26262A", borderRadius: 8, fontSize: 12 }}
              itemStyle={{ color: "#A1A1AA" }}
              cursor={{ fill: "rgba(168,85,247,0.05)" }}
            />
            <defs>
              <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#D43370" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
            </defs>
            <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="url(#barGrad)">
              {data.map((_, idx) => (
                <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-[180px]">
          <Crosshair className="w-8 h-8 text-muted/30 mb-2" />
          <p className="text-[13px] text-muted">Run analysis to see data</p>
        </div>
      )}
    </div>
  );
}
