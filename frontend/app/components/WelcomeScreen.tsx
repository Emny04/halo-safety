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
} from "lucide-react";
import { getOAuthUrl } from "@/lib/api";
import { ConnectionStatus } from "@/lib/types";

interface WelcomeScreenProps {
  connections: ConnectionStatus;
  onSkip: () => void;
}

export default function WelcomeScreen({ connections, onSkip }: WelcomeScreenProps) {
  const hasAnyConnection =
    connections.gmail_accounts.length > 0 || connections.outlook;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Aminogli Safety
          </h1>
          <p className="text-lg text-muted max-w-md mx-auto mb-12">
            AI-powered email protection. Connect your accounts and we&apos;ll scan every message for phishing, scams, and threats.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              { icon: Zap, label: "AI Threat Detection" },
              { icon: ShieldCheck, label: "Risk Scoring" },
              { icon: AlertTriangle, label: "Scam Alerts" },
              { icon: Sparkles, label: "Smart Categories" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 text-sm font-medium"
              >
                <f.icon className="w-4 h-4 text-primary" />
                {f.label}
              </div>
            ))}
          </div>

          {/* Connection cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
            {/* Gmail card */}
            <div className="bg-card rounded-xl border p-6 text-left hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Gmail</p>
                  <p className="text-xs text-muted">Google Account</p>
                </div>
              </div>
              {connections.gmail_accounts.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {connections.gmail_accounts.map((acc) => (
                    <div
                      key={acc.account_id}
                      className="flex items-center gap-2 text-xs bg-safe-bg text-safe rounded-lg px-2.5 py-1.5 font-medium"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {acc.email}
                    </div>
                  ))}
                </div>
              )}
              <a
                href={getOAuthUrl("gmail")}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-4 rounded-lg bg-foreground text-card hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                {connections.gmail_accounts.length > 0
                  ? "Add Another Gmail"
                  : "Connect Gmail"}
              </a>
            </div>

            {/* Outlook card */}
            <div className="bg-card rounded-xl border p-6 text-left hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Outlook</p>
                  <p className="text-xs text-muted">Microsoft Account</p>
                </div>
              </div>
              {connections.outlook && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-xs bg-safe-bg text-safe rounded-lg px-2.5 py-1.5 font-medium">
                    <ShieldCheck className="w-3 h-3" />
                    Connected
                  </div>
                </div>
              )}
              {connections.outlook ? (
                <div className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 px-4 rounded-lg border text-muted">
                  <ShieldCheck className="w-4 h-4 text-safe" />
                  Already connected
                </div>
              ) : (
                <a
                  href={getOAuthUrl("outlook")}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-4 rounded-lg bg-foreground text-card hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  Connect Outlook
                </a>
              )}
            </div>
          </div>

          {/* Skip / Continue */}
          <button
            onClick={onSkip}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4 transition-colors"
          >
            {hasAnyConnection ? "Continue to Dashboard" : "Skip — use demo data"}
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-muted mt-6 max-w-sm mx-auto">
            Your data stays private. We only read message metadata and content for threat analysis. Nothing is stored permanently.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted">
        Aminogli Safety &middot; AI-Powered Email Protection
      </footer>
    </div>
  );
}
