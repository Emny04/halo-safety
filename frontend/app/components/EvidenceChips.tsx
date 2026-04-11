"use client";

import {
  Fingerprint, Clock, Mail, UserX, Link2, Shield, Key, DollarSign,
  Globe, Zap, Star, PenTool, Hand, Palette, EyeOff, AtSign, Eye, Briefcase,
  type LucideIcon,
} from "lucide-react";

interface Props { evidence: string[]; severity: string; simple?: boolean; }
interface ChipInfo { color: string; friendly: string; icon: LucideIcon; }

const CHIP_MAP: Record<string, ChipInfo> = {
  "Urgency language":        { color: "bg-dangerous-bg text-dangerous border-dangerous/20", friendly: "Rushing you", icon: Clock },
  "Reply-to mismatch":       { color: "bg-dangerous-bg text-dangerous border-dangerous/20", friendly: "Reply goes elsewhere", icon: Mail },
  "New sender domain":       { color: "bg-suspicious-bg text-suspicious border-suspicious/20", friendly: "New sender", icon: UserX },
  "Suspicious link":         { color: "bg-dangerous-bg text-dangerous border-dangerous/20", friendly: "Bad link", icon: Link2 },
  "Identity impersonation":  { color: "bg-dangerous-bg text-dangerous border-dangerous/20", friendly: "Impersonation", icon: Shield },
  "Display name spoofing":   { color: "bg-dangerous-bg text-dangerous border-dangerous/20", friendly: "Fake name", icon: Shield },
  "Credential request":      { color: "bg-dangerous-bg text-dangerous border-dangerous/20", friendly: "Wants password", icon: Key },
  "Payment request":         { color: "bg-suspicious-bg text-suspicious border-suspicious/20", friendly: "Wants money", icon: DollarSign },
  "Lookalike domain":        { color: "bg-dangerous-bg text-dangerous border-dangerous/20", friendly: "Fake domain", icon: Globe },
  "Threatening consequences": { color: "bg-dangerous-bg text-dangerous border-dangerous/20", friendly: "Threats", icon: Zap },
  "Too good to be true":     { color: "bg-suspicious-bg text-suspicious border-suspicious/20", friendly: "Too good", icon: Star },
  "Grammar errors":          { color: "bg-suspicious-bg text-suspicious border-suspicious/20", friendly: "Bad grammar", icon: PenTool },
  "Generic greeting":        { color: "bg-suspicious-bg text-suspicious border-suspicious/20", friendly: "Generic greeting", icon: Hand },
  "Mismatched branding":     { color: "bg-suspicious-bg text-suspicious border-suspicious/20", friendly: "Wrong branding", icon: Palette },
  "Request for secrecy":     { color: "bg-dangerous-bg text-dangerous border-dangerous/20", friendly: "Secrecy", icon: EyeOff },
  "Unusual sender address":  { color: "bg-suspicious-bg text-suspicious border-suspicious/20", friendly: "Odd address", icon: AtSign },
  "Embedded tracking":       { color: "bg-primary-light text-primary border-primary/20", friendly: "Tracking", icon: Eye },
  "Authority impersonation": { color: "bg-dangerous-bg text-dangerous border-dangerous/20", friendly: "Boss fraud", icon: Briefcase },
};

const DEFAULT_COLOR = "bg-suspicious-bg text-suspicious border-suspicious/20";

export default function EvidenceChips({ evidence, severity, simple }: Props) {
  if (!evidence || evidence.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border">
        <Fingerprint className="w-3 h-3 text-cyan" />
        <p className="text-[12px] font-bold">{simple ? "Warning Signs" : "Evidence"}</p>
        <span className="text-[10px] font-bold text-muted bg-background px-1.5 py-0.5 rounded ml-auto">{evidence.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 px-3 py-2">
        {evidence.map((e, i) => {
          const info = CHIP_MAP[e];
          const Icon = info?.icon ?? Fingerprint;
          const colorClass = info?.color ?? DEFAULT_COLOR;
          return (
            <span key={i} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border ${colorClass}`}>
              <Icon className="w-3 h-3" />
              {simple ? (info?.friendly ?? e) : e}
            </span>
          );
        })}
      </div>
    </div>
  );
}
