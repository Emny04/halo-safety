"use client";

import { useState, useRef, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  ExternalLink,
  Globe,
  Clock,
  Zap,
  Mail,
  MessageSquare,
  XCircle,
  Crosshair,
  Code,
  FileText,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Link2,
  AlertCircle,
} from "lucide-react";
import { Message, Analysis } from "@/lib/types";
import ThreatBadge from "./ThreatBadge";
import ActionBar from "./ActionBar";
import GuardianMode from "./GuardianMode";
import EvidenceChips from "./EvidenceChips";
import AuthBadges from "./AuthBadges";
import ThreatTimeline from "./ThreatTimeline";

interface Props {
  message: Message | null;
  onAction: (id: string, action: string) => Promise<void>;
  onAnalyze: (id: string) => Promise<void>;
  guardianMode: boolean;
  onGuardianToggle: () => void;
  analyzing?: boolean;
}

const ATTACK_TYPE_LABELS: Record<string, string> = {
  credential_harvesting: "Credential Harvesting",
  ceo_fraud: "CEO Fraud",
  fake_invoice: "Fake Invoice",
  payroll_diversion: "Payroll Diversion",
  delivery_scam: "Delivery Scam",
  gift_card_scam: "Gift Card Scam",
  account_takeover: "Account Takeover",
  tech_support_scam: "Tech Support Scam",
  tax_scam: "Tax Scam",
  subscription_phishing: "Subscription Phishing",
  oauth_consent_phishing: "OAuth Consent Phishing",
  marketing_spam: "Marketing Spam",
  legitimate: "Legitimate",
};

function formatTime(ts: string) {
  return new Date(ts).toLocaleString();
}

function getVerdict(a: Analysis, brand: string | null): { emoji: string; text: string; level: "dangerous" | "suspicious" | "safe" } {
  if (a.severity === "dangerous") {
    if (a.attack_type === "credential_harvesting" && brand) {
      return { emoji: "\u26A0\uFE0F", text: `This email is trying to steal your ${brand} password.`, level: "dangerous" };
    }
    if (brand) {
      return { emoji: "\uD83D\uDEA8", text: `This is a scam pretending to be ${brand}. Do not click any links.`, level: "dangerous" };
    }
    return { emoji: "\uD83D\uDEA8", text: "This is a scam. Do not click any links.", level: "dangerous" };
  }
  if (a.severity === "suspicious") {
    return { emoji: "\u26A0\uFE0F", text: "We\u2019re not sure about this one. Be careful before clicking.", level: "suspicious" };
  }
  return { emoji: "\u2705", text: "This email looks safe and came from a trusted sender.", level: "safe" };
}

function getHumanGrade(score: number): { label: string; emoji: string } {
  const safe = 100 - score;
  if (safe >= 81) return { label: "You\u2019re Safe", emoji: "\u2705" };
  if (safe >= 61) return { label: "Probably Fine", emoji: "\uD83D\uDFE1" };
  if (safe >= 41) return { label: "Be Careful", emoji: "\u26A0\uFE0F" };
  if (safe >= 21) return { label: "Likely a Scam", emoji: "\uD83D\uDD36" };
  return { label: "Definite Threat", emoji: "\uD83D\uDEA8" };
}

function ActionGuide({ severity }: { severity: string }) {
  if (severity === "dangerous") {
    return (
      <div className="bg-dangerous-bg border border-dangerous/25 rounded-lg px-3 py-2">
        <p className="text-[11px] font-bold text-dangerous uppercase mb-1.5">What to do</p>
        {["\u270B Don\u2019t click links", "\u270B Don\u2019t reply", "\u270B Block this sender"].map((t, i) => (
          <p key={i} className="text-[12px] text-foreground leading-snug">{t}</p>
        ))}
      </div>
    );
  }
  if (severity === "suspicious") {
    return (
      <div className="bg-suspicious-bg border border-suspicious/25 rounded-lg px-3 py-2">
        <p className="text-[11px] font-bold text-suspicious uppercase mb-1.5">What to do</p>
        {["\uD83D\uDC40 Read carefully", "\uD83D\uDCDE Call company directly", "\u270B Don\u2019t enter passwords"].map((t, i) => (
          <p key={i} className="text-[12px] text-foreground leading-snug">{t}</p>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 bg-safe-bg border border-safe/25 rounded-lg px-3 py-2">
      <ShieldCheck className="w-4 h-4 text-safe flex-shrink-0" />
      <p className="text-[12px] text-safe font-medium">Safe — read and respond normally.</p>
    </div>
  );
}

function EmailBody({ body, bodyHtml }: { body: string; bodyHtml?: string }) {
  const [showHtml, setShowHtml] = useState(!!bodyHtml);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(120);

  useEffect(() => { setShowHtml(!!bodyHtml); }, [bodyHtml, body]);

  useEffect(() => {
    if (!showHtml || !bodyHtml || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;overflow:hidden;font-size:12px;}</style></head><body>${bodyHtml}</body></html>`);
    doc.close();

    const resize = () => {
      if (!iframe.contentDocument?.body) return;
      const h = iframe.contentDocument.documentElement.scrollHeight || iframe.contentDocument.body.scrollHeight;
      setIframeHeight(Math.min(Math.max(h, 60), 300));
    };

    resize();
    const t1 = setTimeout(resize, 200);
    const t2 = setTimeout(resize, 800);
    const imgs = iframe.contentDocument.querySelectorAll("img");
    imgs.forEach((img) => img.addEventListener("load", resize));

    return () => { clearTimeout(t1); clearTimeout(t2); imgs.forEach((img) => img.removeEventListener("load", resize)); };
  }, [showHtml, bodyHtml]);

  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden">
      {bodyHtml && (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-card">
          <button onClick={() => setShowHtml(true)} className={`flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded transition-colors ${showHtml ? "bg-primary-light text-primary" : "text-muted hover:text-foreground"}`}>
            <Code className="w-2.5 h-2.5" /> Rich
          </button>
          <button onClick={() => setShowHtml(false)} className={`flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded transition-colors ${!showHtml ? "bg-primary-light text-primary" : "text-muted hover:text-foreground"}`}>
            <FileText className="w-2.5 h-2.5" /> Text
          </button>
        </div>
      )}
      {showHtml && bodyHtml ? (
        <iframe ref={iframeRef} sandbox="allow-same-origin" className="w-full border-0 bg-white rounded-b-lg" style={{ height: `${iframeHeight}px` }} title="Email content" />
      ) : (
        <div className="px-3 py-2">
          <p className="text-[12px] text-muted-light whitespace-pre-wrap leading-relaxed line-clamp-6">{body}</p>
        </div>
      )}
    </div>
  );
}

export default function ThreatDetail({
  message,
  onAction,
  onAnalyze,
  guardianMode,
  onGuardianToggle,
  analyzing,
}: Props) {
  if (!message) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <Shield className="w-6 h-6 text-muted opacity-50 mb-2" />
        <p className="text-[13px] font-bold text-muted">Select a message to view</p>
      </div>
    );
  }

  const a = message.analysis;
  const attackLabel = a ? (ATTACK_TYPE_LABELS[a.attack_type] ?? a.attack_type?.replace(/_/g, " ") ?? a.category) : null;

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3 animate-slide-in-right">
      {/* Simple Mode toggle */}
      <div className="flex items-center justify-between">
        <GuardianMode enabled={guardianMode} onToggle={onGuardianToggle} />
      </div>

      {/* ─── VERDICT BANNER ─── */}
      {guardianMode && a && <VerdictBanner analysis={a} />}

      {/* ─── ACTION GUIDE ─── */}
      {guardianMode && a && <ActionGuide severity={a.severity} />}

      {/* ─── MESSAGE HEADER ─── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
            message.type === "sms" ? "bg-purple-bg" : "bg-primary-light"
          }`}>
            {message.type === "sms" ? <MessageSquare className="w-3.5 h-3.5 text-purple" /> : <Mail className="w-3.5 h-3.5 text-primary" />}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold truncate">{message.sender}</p>
            <p className="text-[13px] font-semibold text-muted-light truncate">{message.subject}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5">
              <Clock className="w-2.5 h-2.5" />{formatTime(message.timestamp)}
              <span className="uppercase font-bold">{message.type}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {a && (guardianMode ? <HumanScoreBadge riskScore={a.risk_score} severity={a.severity} /> : <ThreatBadge severity={a.severity} size="sm" />)}
          {a && attackLabel && attackLabel !== "Legitimate" && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-foreground bg-background border border-border-bright rounded px-1.5 py-0.5">
              <Crosshair className="w-2.5 h-2.5 text-cyan" />{attackLabel}
            </span>
          )}
        </div>
      </div>

      {/* Status badges */}
      {(message.blocked || message.spam || message.quarantined || message.reported) && (
        <div className="flex flex-wrap gap-1.5">
          {message.blocked && <span className="text-[11px] font-bold bg-dangerous-bg text-dangerous px-2 py-0.5 rounded flex items-center gap-1"><XCircle className="w-2.5 h-2.5" />Blocked</span>}
          {message.spam && <span className="text-[11px] font-bold bg-suspicious-bg text-suspicious px-2 py-0.5 rounded">Spam</span>}
          {message.quarantined && <span className="text-[11px] font-bold bg-purple-bg text-purple px-2 py-0.5 rounded">Quarantined</span>}
          {message.reported && <span className="text-[11px] font-bold bg-dangerous-bg text-dangerous px-2 py-0.5 rounded">Reported</span>}
        </div>
      )}

      {/* ─── EMAIL BODY ─── */}
      <EmailBody body={message.body} bodyHtml={message.body_html} />

      {/* ─── ANALYSIS ─── */}
      {a && a._failed ? (
        <div className="bg-dangerous-bg border border-dangerous/20 rounded-lg px-4 py-4 text-center">
          <AlertCircle className="w-6 h-6 text-dangerous mx-auto mb-2" />
          <p className="text-[14px] font-bold text-dangerous mb-1">Analysis Failed</p>
          <p className="text-[12px] text-muted mb-3 leading-relaxed">{a.explanation}</p>
          <button
            onClick={() => onAnalyze(message.id)}
            disabled={analyzing}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <Shield className="w-3.5 h-3.5" />
            {analyzing ? "Retrying..." : "Retry Analysis"}
          </button>
        </div>
      ) : a ? (
        <>
          {/* Threat Analysis Pipeline */}
          <ThreatTimeline analysis={a} auth={message.auth} messageId={message.id} simple={guardianMode} />

          {/* SPF/DKIM/DMARC */}
          {message.auth && (
            <AuthBadges auth={message.auth} simple={guardianMode} brand={a.impersonated_brand} />
          )}

          {/* Evidence */}
          <EvidenceChips evidence={a.evidence} severity={a.severity} simple={guardianMode} />

          {/* AI Summary — compact */}
          <div className={`rounded-lg overflow-hidden border ${
            a.severity === "dangerous" ? "border-dangerous/20" : a.severity === "suspicious" ? "border-suspicious/20" : "border-safe/20"
          }`}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 ${
              a.severity === "dangerous" ? "bg-dangerous-bg" : a.severity === "suspicious" ? "bg-suspicious-bg" : "bg-safe-bg"
            }`}>
              <Zap className={`w-3 h-3 ${a.severity === "dangerous" ? "text-dangerous" : a.severity === "suspicious" ? "text-suspicious" : "text-safe"}`} />
              <p className="text-[12px] font-bold truncate">{a.threat_summary}</p>
            </div>
            <div className="bg-card px-3 py-2">
              <p className="text-[12px] text-muted-light leading-snug">{a.explanation}</p>
            </div>
          </div>

          {/* Brand + URLs — inline compact */}
          {(a.impersonated_brand || a.suspicious_urls.length > 0) && (
            <div className="space-y-2">
              {a.impersonated_brand && (
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                  <Globe className="w-3.5 h-3.5 text-suspicious flex-shrink-0" />
                  <span className="text-[11px] text-muted font-bold uppercase">Brand:</span>
                  <span className="text-[13px] font-bold text-suspicious">{a.impersonated_brand}</span>
                </div>
              )}
              {a.suspicious_urls.length > 0 && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border">
                    <Link2 className="w-3 h-3 text-dangerous" />
                    <p className="text-[12px] font-bold">{guardianMode ? "Dangerous Links" : "Suspicious URLs"}</p>
                    <span className="text-[10px] font-bold bg-dangerous-bg text-dangerous px-1.5 py-0.5 rounded ml-auto">{a.suspicious_urls.length}</span>
                  </div>
                  {a.suspicious_urls.map((url, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-dangerous-bg/30 border-b last:border-b-0 border-border">
                      <AlertTriangle className="w-3 h-3 text-dangerous flex-shrink-0" />
                      <span className="text-[11px] font-mono text-dangerous break-all">{url}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Campaign — single line */}
          {a.campaign_id && (
            <div className="flex items-center gap-2 bg-card border border-cyan/20 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-cyan animate-threat-pulse flex-shrink-0" />
              <span className="text-[11px] text-muted font-bold uppercase">Campaign:</span>
              <span className="text-[12px] font-bold text-cyan">{a.campaign_id}</span>
            </div>
          )}

          {/* Actions */}
          <ActionBar messageId={message.id} onAction={onAction} recommended={a.recommended_action} />
        </>
      ) : (
        <div className="text-center py-4">
          <ShieldAlert className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-[13px] font-bold text-muted mb-2">Not analyzed</p>
          <button
            onClick={() => onAnalyze(message.id)}
            disabled={analyzing}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <Shield className="w-3.5 h-3.5" />
            {analyzing ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      )}
    </div>
  );
}

function VerdictBanner({ analysis }: { analysis: Analysis }) {
  const verdict = getVerdict(analysis, analysis.impersonated_brand);
  const grade = getHumanGrade(analysis.risk_score);

  const config = {
    dangerous: { bg: "bg-dangerous-bg", border: "border-dangerous/30", text: "text-dangerous", icon: ShieldX },
    suspicious: { bg: "bg-suspicious-bg", border: "border-suspicious/30", text: "text-suspicious", icon: AlertCircle },
    safe: { bg: "bg-safe-bg", border: "border-safe/30", text: "text-safe", icon: ShieldCheck },
  }[verdict.level];

  const VerdictIcon = config.icon;

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${config.bg} ${config.border} animate-fade-in`}>
      <div className="flex items-center gap-2.5">
        <VerdictIcon className={`w-5 h-5 flex-shrink-0 ${config.text}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-bold leading-snug ${config.text}`}>{verdict.text}</p>
          <span className="text-[11px] text-muted font-mono">{grade.label} · {analysis.risk_score}/100</span>
        </div>
      </div>
    </div>
  );
}

function HumanScoreBadge({ riskScore, severity }: { riskScore: number; severity: string }) {
  const grade = getHumanGrade(riskScore);
  const config = {
    dangerous: "text-dangerous bg-dangerous-bg border-dangerous/25",
    suspicious: "text-suspicious bg-suspicious-bg border-suspicious/25",
    safe: "text-safe bg-safe-bg border-safe/25",
  }[severity] ?? "text-safe bg-safe-bg border-safe/25";

  return (
    <span className={`text-[12px] font-bold px-2 py-1 rounded-lg border ${config}`}>
      {grade.label} {grade.emoji}
    </span>
  );
}
