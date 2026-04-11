"use client";

import {
  Mail,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  ShieldBan,
  Ban,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Message } from "@/lib/types";

interface MessageDetailProps {
  message: Message | null;
  grandmaMode: boolean;
  onAction: (id: string, action: "mark_safe" | "block_sender" | "move_spam") => void;
  onAnalyze: (id: string) => void;
  analyzingId: string | null;
  onBack: () => void;
}

function RiskGauge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "text-dangerous"
      : score >= 40
        ? "text-suspicious"
        : "text-safe";
  const bgColor =
    score >= 70
      ? "bg-dangerous"
      : score >= 40
        ? "bg-suspicious"
        : "bg-safe";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${bgColor} rounded-full transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-2xl font-bold tabular-nums ${color}`}>
        {score}
      </span>
    </div>
  );
}

export default function MessageDetail({
  message,
  grandmaMode,
  onAction,
  onAnalyze,
  analyzingId,
  onBack,
}: MessageDetailProps) {
  if (!message) {
    return (
      <div className="bg-card rounded-xl border flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center text-muted">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a message to view details</p>
        </div>
      </div>
    );
  }

  const analysis = message.analysis;
  const severity = analysis?.severity;
  const isAnalyzing = analyzingId === message.id;

  return (
    <div className="bg-card rounded-xl border flex flex-col h-full animate-fade-in">
      {/* Grandma mode warning */}
      {grandmaMode && severity === "dangerous" && (
        <div className="bg-dangerous text-white p-6 rounded-t-xl text-center">
          <p className="text-4xl mb-2">⚠️</p>
          <p className="text-2xl font-extrabold">THIS IS A SCAM — DO NOT CLICK</p>
          <p className="text-lg mt-2 opacity-90">
            Delete this message immediately. Do not reply or click any links.
          </p>
        </div>
      )}
      {grandmaMode && severity === "suspicious" && (
        <div className="bg-suspicious text-white p-5 rounded-t-xl text-center">
          <p className="text-3xl mb-1">⚠️</p>
          <p className="text-xl font-extrabold">
            BE CAREFUL — THIS LOOKS SUSPICIOUS
          </p>
          <p className="mt-1 opacity-90">
            Do not click links or share personal information.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="p-5 border-b">
        <button
          onClick={onBack}
          className="text-xs text-muted hover:text-foreground flex items-center gap-1 mb-3 lg:hidden"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold leading-tight">
              {message.subject}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              {message.type === "sms" ? (
                <MessageSquare className="w-3.5 h-3.5 text-muted" />
              ) : (
                <Mail className="w-3.5 h-3.5 text-muted" />
              )}
              <span className="text-sm text-muted">{message.sender}</span>
            </div>
            <p className="text-xs text-muted mt-1">
              {new Date(message.timestamp).toLocaleString()}
            </p>
          </div>
          {analysis && (
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                severity === "safe"
                  ? "bg-safe-bg text-safe"
                  : severity === "suspicious"
                    ? "bg-suspicious-bg text-suspicious"
                    : "bg-dangerous-bg text-dangerous"
              }`}
            >
              {severity === "safe" && <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />}
              {severity === "suspicious" && (
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              )}
              {severity === "dangerous" && (
                <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />
              )}
              {severity}
            </div>
          )}
        </div>
      </div>

      {/* Analysis */}
      {analysis ? (
        <div className="p-5 border-b space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Risk Score
            </p>
            <RiskGauge score={analysis.risk_score} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">
                Category
              </p>
              <p className="text-sm font-semibold capitalize mt-1">
                {analysis.category}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">
                Severity
              </p>
              <p
                className={`text-sm font-semibold capitalize mt-1 ${
                  severity === "safe"
                    ? "text-safe"
                    : severity === "suspicious"
                      ? "text-suspicious"
                      : "text-dangerous"
                }`}
              >
                {severity}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              AI Explanation
            </p>
            <div
              className={`text-sm leading-relaxed p-3 rounded-lg border-l-3 ${
                severity === "safe"
                  ? "bg-safe-bg/50 border-l-safe"
                  : severity === "suspicious"
                    ? "bg-suspicious-bg/50 border-l-suspicious"
                    : "bg-dangerous-bg/50 border-l-dangerous"
              }`}
            >
              {analysis.explanation}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 border-b">
          <button
            onClick={() => onAnalyze(message.id)}
            disabled={isAnalyzing}
            className="w-full bg-primary text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing with AI…
              </>
            ) : (
              <>
                <ShieldBan className="w-4 h-4" />
                Analyze This Message
              </>
            )}
          </button>
        </div>
      )}

      {/* Body */}
      <div className="p-5 border-b flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          Message Body
        </p>
        <div className="text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4 font-mono text-[13px]">
          {message.body}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex gap-2">
        <button
          onClick={() => onAction(message.id, "mark_safe")}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border hover:bg-safe-bg hover:text-safe hover:border-safe transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Safe
        </button>
        <button
          onClick={() => onAction(message.id, "block_sender")}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border hover:bg-dangerous-bg hover:text-dangerous hover:border-dangerous transition-colors"
        >
          <Ban className="w-3.5 h-3.5" /> Block Sender
        </button>
        <button
          onClick={() => onAction(message.id, "move_spam")}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border hover:bg-gray-100 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Move to Spam
        </button>
      </div>
    </div>
  );
}
