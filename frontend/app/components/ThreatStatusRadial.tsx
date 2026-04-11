"use client";

import { SecurityScore } from "@/lib/types";
import { ShieldAlert } from "lucide-react";

interface Props {
  score: SecurityScore | null;
}

const SEGMENTS = [
  { key: "dangerous", label: "Critical", color: "#D43370" },
  { key: "suspicious", label: "Warning", color: "#A855F7" },
  { key: "safe", label: "Safe", color: "#2DD4BF" },
];

export default function ThreatStatusRadial({ score }: Props) {
  if (!score) {
    return (
      <div className="bg-card border border-border rounded-xl rim-light p-5 h-full flex flex-col items-center justify-center">
        <div className="w-32 h-32 rounded-full bg-background border border-border animate-shimmer" />
        <p className="text-[13px] text-muted mt-4">Calculating...</p>
      </div>
    );
  }

  const total = score.counts.total || 1;
  const segments = SEGMENTS.map(s => ({
    ...s,
    count: score.counts[s.key as keyof typeof score.counts] ?? 0,
  }));

  const R = 45;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="bg-card border border-border rounded-xl rim-light p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Threat Status</h3>
          <p className="text-[13px] text-muted mt-0.5">Overall distribution</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Ring */}
        <div className="relative w-36 h-36 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={R} fill="none" stroke="#1F1F23" strokeWidth="8" />
            {segments.map((seg) => {
              const pct = seg.count / total;
              const dash = pct * C;
              const el = (
                <circle
                  key={seg.key}
                  cx="50" cy="50" r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${C - dash}`}
                  strokeDashoffset={-offset}
                  className="transition-all duration-1000"
                />
              );
              offset += dash;
              return el;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{total}</span>
            <span className="text-[12px] text-muted">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3 flex-1">
          {segments.map((seg) => (
            <div key={seg.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
                <span className="text-[14px] text-muted-light">{seg.label}</span>
              </div>
              <span className="text-[15px] font-semibold text-white">{seg.count}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted">Score</span>
              <span className={`text-lg font-bold ${
                score.score >= 70 ? "text-safe" : score.score >= 40 ? "text-suspicious" : "text-dangerous"
              }`}>
                {score.score}<span className="text-[13px] text-muted font-normal">/{score.grade}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
