"use client";

import { ShieldCheck, ShieldX, ShieldQuestion, Lock, CheckCircle, XCircle } from "lucide-react";
import { AuthResults } from "@/lib/types";

interface Props {
  auth: AuthResults | undefined;
  simple?: boolean;
  brand?: string | null;
}

const STATUS_CONFIG = {
  pass: { icon: ShieldCheck, color: "text-safe", bg: "bg-safe-bg", border: "border-safe/30", label: "PASS" },
  fail: { icon: ShieldX, color: "text-dangerous", bg: "bg-dangerous-bg", border: "border-dangerous/30", label: "FAIL" },
  none: { icon: ShieldQuestion, color: "text-muted", bg: "bg-card", border: "border-border", label: "NONE" },
  unknown: { icon: ShieldQuestion, color: "text-muted", bg: "bg-card", border: "border-border", label: "N/A" },
};

const CHECKS = [
  { key: "spf" as const, name: "SPF" },
  { key: "dkim" as const, name: "DKIM" },
  { key: "dmarc" as const, name: "DMARC" },
];

export default function AuthBadges({ auth, simple, brand }: Props) {
  if (!auth) return null;

  const hasFail = auth.spf === "fail" || auth.dkim === "fail" || auth.dmarc === "fail";
  const allPass = auth.spf === "pass" && auth.dkim === "pass" && auth.dmarc === "pass";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-cyan" />
          <p className="text-[12px] font-bold">{simple ? "Identity Check" : "Email Auth"}</p>
        </div>
        <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
          allPass ? "bg-safe-bg text-safe" : hasFail ? "bg-dangerous-bg text-dangerous" : "bg-card text-muted"
        }`}>
          {allPass ? <CheckCircle className="w-3 h-3" /> : hasFail ? <XCircle className="w-3 h-3" /> : null}
          {allPass ? "Verified" : hasFail ? "Failed" : "Partial"}
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-border">
        {CHECKS.map((check) => {
          const status = auth[check.key] || "unknown";
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <div key={check.key} className={`flex items-center justify-center gap-1.5 py-2 px-2 border-r last:border-r-0 border-border ${cfg.bg}`}>
              <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
              <span className="text-[12px] font-bold">{check.name}</span>
              <span className={`text-[10px] font-bold uppercase ${cfg.color}`}>{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {(hasFail || allPass) && (
        <div className={`px-3 py-2 border-t text-[12px] leading-relaxed ${hasFail ? "border-dangerous/20 bg-dangerous-bg/50 text-dangerous" : "border-safe/20 bg-safe-bg/50 text-safe"}`}>
          {hasFail
            ? (simple ? `Failed identity checks. ${brand ? `Real ${brand} emails always pass.` : "Legit senders always pass."}` : "Auth failed \u2014 may not be from claimed sender.")
            : (simple ? "Identity confirmed \u2014 verified server." : "All checks passed \u2014 authorized server.")
          }
        </div>
      )}
    </div>
  );
}
