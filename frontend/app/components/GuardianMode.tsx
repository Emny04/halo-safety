"use client";

import { Heart } from "lucide-react";

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

export default function GuardianMode({ enabled, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
        enabled
          ? "bg-purple-bg border-purple/30 text-purple"
          : "bg-card border-border text-muted hover:border-border-bright"
      }`}
    >
      <Heart className={`w-3 h-3 ${enabled ? "fill-purple" : ""}`} />
      {enabled ? "Simple ON" : "Simple Mode"}
    </button>
  );
}
