"use client";

import { useState, useEffect } from "react";
import {
  Lock,
  Globe,
  Link2,
  Brain,
  ShieldAlert,
  Check,
  X,
  AlertTriangle,
  Minus,
} from "lucide-react";
import { Analysis, AuthResults } from "@/lib/types";

interface Props {
  analysis: Analysis;
  auth?: AuthResults;
  messageId: string;
  simple?: boolean;
}

interface Stage {
  label: string;
  simpleLabel: string;
  icon: typeof Lock;
  status: "pass" | "warning" | "fail" | "neutral";
  detail: string;
  simpleDetail: string;
}

function getStatusIcon(status: string, size = "w-4 h-4") {
  switch (status) {
    case "pass": return <Check className={size} />;
    case "fail": return <X className={size} />;
    case "warning": return <AlertTriangle className={size} />;
    default: return <Minus className={size} />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "pass": return { text: "text-safe", bg: "bg-safe-bg", border: "border-safe/20", line: "bg-safe", fill: "bg-safe", glow: "shadow-[0_0_12px_rgba(34,197,94,0.2)]" };
    case "fail": return { text: "text-dangerous", bg: "bg-dangerous-bg", border: "border-dangerous/20", line: "bg-dangerous", fill: "bg-dangerous", glow: "shadow-[0_0_12px_rgba(239,68,68,0.2)]" };
    case "warning": return { text: "text-suspicious", bg: "bg-suspicious-bg", border: "border-suspicious/20", line: "bg-suspicious", fill: "bg-suspicious", glow: "shadow-[0_0_12px_rgba(245,158,11,0.2)]" };
    default: return { text: "text-muted", bg: "bg-card", border: "border-border", line: "bg-border", fill: "bg-muted", glow: "" };
  }
}

function getRiskLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Critical Risk", color: "text-dangerous" };
  if (score >= 60) return { label: "High Risk", color: "text-dangerous" };
  if (score >= 40) return { label: "Medium Risk", color: "text-suspicious" };
  if (score >= 20) return { label: "Low Risk", color: "text-suspicious" };
  return { label: "Minimal Risk", color: "text-safe" };
}

function getBarColor(score: number): string {
  if (score >= 70) return "bg-dangerous";
  if (score >= 40) return "bg-suspicious";
  return "bg-safe";
}

function buildStages(analysis: Analysis, auth?: AuthResults): Stage[] {
  const stages: Stage[] = [];

  if (auth) {
    const fails = [auth.spf, auth.dkim, auth.dmarc].filter(v => v === "fail").length;
    const passes = [auth.spf, auth.dkim, auth.dmarc].filter(v => v === "pass").length;
    stages.push({
      label: "Header Authentication",
      simpleLabel: "Did it come from who it claims?",
      icon: Lock,
      status: fails > 0 ? "fail" : passes === 3 ? "pass" : "neutral",
      detail: fails > 0 ? `${fails} of 3 checks failed (SPF/DKIM/DMARC)` : passes === 3 ? "All 3 checks passed" : "Partial data available",
      simpleDetail: fails > 0 ? "No \u2014 the sender is not verified" : passes === 3 ? "Yes \u2014 the sender is verified" : "We couldn\u2019t fully verify",
    });
  } else {
    stages.push({
      label: "Header Authentication",
      simpleLabel: "Did it come from who it claims?",
      icon: Lock,
      status: "neutral",
      detail: "No auth headers available",
      simpleDetail: "No data to check",
    });
  }

  const dv = analysis.sender_domain_verdict;
  stages.push({
    label: "Sender Domain Analysis",
    simpleLabel: "Is the sender\u2019s address real?",
    icon: Globe,
    status: dv === "spoofed" ? "fail" : dv === "suspicious" ? "warning" : "pass",
    detail: dv === "spoofed" ? "Domain is spoofed" : dv === "suspicious" ? "Domain looks suspicious" : "Domain is legitimate",
    simpleDetail: dv === "spoofed" ? "No \u2014 the address is fake" : dv === "suspicious" ? "Maybe \u2014 it looks suspicious" : "Yes \u2014 the address is real",
  });

  const lv = analysis.link_verdict;
  const urlCount = analysis.suspicious_urls.length;
  stages.push({
    label: "Link Analysis",
    simpleLabel: "Are the links inside safe?",
    icon: Link2,
    status: lv === "malicious" ? "fail" : lv === "suspicious" ? "warning" : lv === "none" ? "neutral" : "pass",
    detail: lv === "malicious" ? `${urlCount} malicious URL${urlCount !== 1 ? "s" : ""}` : lv === "suspicious" ? `${urlCount} suspicious link${urlCount !== 1 ? "s" : ""}` : lv === "none" ? "No links found" : "All links are safe",
    simpleDetail: lv === "malicious" ? `No \u2014 ${urlCount} dangerous link${urlCount !== 1 ? "s" : ""} found` : lv === "suspicious" ? "Maybe \u2014 some links look risky" : lv === "none" ? "No links to check" : "Yes \u2014 all links are safe",
  });

  const evCount = analysis.evidence.length;
  const contentSeverity = evCount >= 4 ? "fail" : evCount >= 2 ? "warning" : evCount === 0 ? "pass" : "warning";
  stages.push({
    label: "Content Analysis",
    simpleLabel: "Is the message trying to trick you?",
    icon: Brain,
    status: contentSeverity,
    detail: evCount > 0 ? `${evCount} red flag${evCount !== 1 ? "s" : ""} detected` : "No red flags found",
    simpleDetail: evCount > 0 ? `Yes \u2014 ${evCount} warning sign${evCount !== 1 ? "s" : ""} found` : "No \u2014 nothing suspicious in the text",
  });

  stages.push({
    label: "Final Verdict",
    simpleLabel: "Our final verdict",
    icon: ShieldAlert,
    status: analysis.severity === "dangerous" ? "fail" : analysis.severity === "suspicious" ? "warning" : "pass",
    detail: `${analysis.attack_type.replace(/_/g, " ")} \u2014 ${analysis.risk_score}/100`,
    simpleDetail: analysis.severity === "dangerous" ? "This is dangerous" : analysis.severity === "suspicious" ? "This needs caution" : "This looks safe",
  });

  return stages;
}

export default function ThreatTimeline({ analysis, auth, messageId, simple }: Props) {
  const stages = buildStages(analysis, auth);
  const [visibleCount, setVisibleCount] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    setAnimatedScore(0);

    const timers: ReturnType<typeof setTimeout>[] = [];
    stages.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), 300 + i * 400));
    });

    let current = 0;
    const target = analysis.risk_score;
    const step = Math.max(1, Math.ceil(target / 40));
    const scoreInterval = setInterval(() => {
      current = Math.min(current + step, target);
      setAnimatedScore(current);
      if (current >= target) clearInterval(scoreInterval);
    }, 40);
    timers.push(setTimeout(() => clearInterval(scoreInterval), 4000));

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(scoreInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId]);

  const riskInfo = getRiskLabel(animatedScore);
  const passCount = stages.filter(s => s.status === "pass").length;
  const failCount = stages.filter(s => s.status === "fail").length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Compact header with inline score */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-cyan" />
          <p className="text-[12px] font-bold uppercase tracking-wide text-muted-light">
            {simple ? "How We Checked" : "Analysis Pipeline"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 bg-background rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${getBarColor(animatedScore)}`} style={{ width: `${animatedScore}%` }} />
          </div>
          <span className={`text-[13px] font-bold font-mono ${riskInfo.color}`}>{animatedScore}</span>
          <span className="text-[11px] text-muted">/100</span>
        </div>
      </div>

      {/* Compact stages */}
      <div className="divide-y divide-border">
        {stages.map((stage, i) => {
          const visible = i < visibleCount;
          const colors = getStatusColor(stage.status);
          const Icon = stage.icon;
          return (
            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 transition-all duration-500 ${visible ? "opacity-100" : "opacity-20"}`}>
              <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center border transition-all duration-500 ${
                visible ? `${colors.bg} ${colors.border} ${colors.text}` : "bg-background border-border text-muted"
              }`}>
                {visible ? getStatusIcon(stage.status, "w-3 h-3") : <Icon className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${visible ? "text-[13px] text-foreground" : "text-[12px] text-muted"}`}>
                  {simple ? stage.simpleLabel : stage.label}
                </p>
                {visible && <p className="text-[11px] text-muted truncate">{simple ? stage.simpleDetail : stage.detail}</p>}
              </div>
              {visible && (
                <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {stage.status === "neutral" ? "N/A" : stage.status}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
