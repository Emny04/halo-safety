"use client";

import { SecurityScore } from "@/lib/types";

interface Props {
  score: SecurityScore | null;
}

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function gradeColor(grade: string) {
  switch (grade) {
    case "A": return { stroke: "var(--safe)", text: "text-safe", bg: "bg-safe-bg" };
    case "B": return { stroke: "var(--safe)", text: "text-safe", bg: "bg-safe-bg" };
    case "C": return { stroke: "var(--suspicious)", text: "text-suspicious", bg: "bg-suspicious-bg" };
    case "D": return { stroke: "var(--dangerous)", text: "text-dangerous", bg: "bg-dangerous-bg" };
    case "F": return { stroke: "var(--dangerous)", text: "text-dangerous", bg: "bg-dangerous-bg" };
    default: return { stroke: "var(--muted)", text: "text-muted", bg: "bg-card" };
  }
}

export default function SecurityScoreRing({ score }: Props) {
  if (!score) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div className="w-28 h-28 rounded-full bg-card border border-border animate-shimmer" />
        <p className="text-xs text-muted mt-3">Calculating...</p>
      </div>
    );
  }

  const colors = gradeColor(score.grade);
  const offset = CIRCUMFERENCE - (score.score / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none" stroke="var(--border)" strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none" stroke={colors.stroke} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="animate-score-fill"
            style={{ animationDelay: "0.3s" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-extrabold ${colors.text}`}>{score.score}</span>
          <span className={`text-xs font-bold ${colors.text} mt-0.5`}>Grade {score.grade}</span>
        </div>
      </div>
      <p className="text-xs text-muted mt-2 font-medium">Security Score</p>
    </div>
  );
}
