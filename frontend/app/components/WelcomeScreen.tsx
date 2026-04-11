"use client";

import {
  Shield,
  Mail,
  MessageSquare,
  ShieldCheck,
  Zap,
  AlertTriangle,
  ArrowRight,
  Plus,
  Sparkles,
  Lock,
  Eye,
  Activity,
} from "lucide-react";
import { getOAuthUrl } from "@/lib/api";
import { ConnectionStatus } from "@/lib/types";

interface WelcomeScreenProps {
  connections: ConnectionStatus;
  onSkip: () => void;
  onNotify?: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function WelcomeScreen({ connections, onSkip, onNotify }: WelcomeScreenProps) {
  const hasAnyConnection =
    connections.gmail_accounts.length > 0 || connections.outlook;

  return (
    <div className="min-h-screen flex flex-col bg-background bg-grid relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 flex items-center justify-center px-4 py-16 relative z-10">
        <div className="max-w-2xl w-full text-center">
          {/* Shield logo */}
          <div className="flex justify-center mb-8 animate-fade-in-up">
            <div className="relative">
              <div className="w-24 h-24 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center glow-primary">
                <Shield className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-safe rounded-full animate-pulse-safe-glow" />
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-3 animate-fade-in-up bg-gradient-to-r from-foreground via-foreground to-muted bg-clip-text">
            HaloSafety
          </h1>
          <p className="text-[15px] font-semibold text-primary uppercase tracking-widest mb-6 animate-fade-in-up">
            AI Cyber Defense Platform
          </p>
          <p className="text-base text-muted-light max-w-md mx-auto mb-12 animate-fade-in-up">
            Connect your email accounts. Our AI analyzes every message for phishing, scams, and cyber threats in real time.
          </p>

          {/* Feature row */}
          <div className="flex flex-wrap justify-center gap-3 mb-12 animate-fade-in-up">
            {[
              { icon: Eye, label: "Threat Detection" },
              { icon: Activity, label: "Risk Scoring" },
              { icon: AlertTriangle, label: "Campaign Tracking" },
              { icon: Lock, label: "Defense Actions" },
              { icon: Sparkles, label: "AI Analysis" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 bg-card border border-border-bright rounded-full px-4 py-2 text-[13px] font-medium text-muted-light"
              >
                <f.icon className="w-3.5 h-3.5 text-cyan" />
                {f.label}
              </div>
            ))}
          </div>

          {/* Provider cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-10 animate-fade-in-up">
            {/* Gmail */}
            <div className="bg-card border border-border-bright rounded-xl p-6 text-left hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-dangerous-bg border border-dangerous/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-dangerous" />
                </div>
                <div>
                  <p className="font-semibold text-[15px]">Gmail</p>
                  <p className="text-[13px] text-muted">Google Account</p>
                </div>
              </div>
              {connections.gmail_accounts.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {connections.gmail_accounts.map((acc) => (
                    <div
                      key={acc.account_id}
                      className="flex items-center gap-2 text-[13px] bg-safe-bg border border-safe/20 text-safe rounded-lg px-2.5 py-1.5 font-medium"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {acc.email}
                    </div>
                  ))}
                </div>
              )}
              <a
                href={getOAuthUrl("gmail")}
                onClick={() => onNotify?.("Opening Google — sign in to connect Gmail and import messages.", "info")}
                className="w-full flex items-center justify-center gap-2 text-[15px] font-semibold py-2.5 px-4 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {connections.gmail_accounts.length > 0 ? "Add Another" : "Connect Gmail"}
              </a>
            </div>

            {/* Outlook */}
            <div className="bg-card border border-border-bright rounded-xl p-6 text-left hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-cyan-bg border border-cyan/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-cyan" />
                </div>
                <div>
                  <p className="font-semibold text-[15px]">Outlook</p>
                  <p className="text-[13px] text-muted">Microsoft Account</p>
                </div>
              </div>
              {connections.outlook ? (
                <div className="flex items-center gap-2 text-[13px] bg-safe-bg border border-safe/20 text-safe rounded-lg px-2.5 py-1.5 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  Connected
                </div>
              ) : (
                <a
                  href={getOAuthUrl("outlook")}
                  onClick={() => onNotify?.("Opening Microsoft — sign in to connect Outlook mail.", "info")}
                  className="w-full flex items-center justify-center gap-2 text-[15px] font-semibold py-2.5 px-4 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Connect Outlook
                </a>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onNotify?.(
                hasAnyConnection
                  ? "Launching dashboard — your connected mail is ready to scan."
                  : "Continuing with demo inbox — connect real mail anytime from the top bar.",
                "info"
              );
              onSkip();
            }}
            className="inline-flex items-center gap-2 text-[15px] font-semibold text-cyan hover:text-cyan/80 transition-colors"
          >
            {hasAnyConnection ? "Launch Dashboard" : "Skip — use demo data"}
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[13px] text-muted mt-8 max-w-sm mx-auto">
            Read-only access. Your data is analyzed locally and never stored permanently. Disconnect at any time.
          </p>
        </div>
      </div>

      <footer className="border-t border-border py-4 text-center text-[13px] text-muted relative z-10">
        HaloSafety &middot; AI Cyber Defense Platform
      </footer>
    </div>
  );
}
