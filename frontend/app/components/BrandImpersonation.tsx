"use client";

import { Globe, ShieldAlert } from "lucide-react";
import { StatsSummary } from "@/lib/types";

interface Props {
  stats: StatsSummary | null;
}

const BRAND_COLORS: Record<string, string> = {
  PayPal: "text-cyan border-cyan/30 bg-cyan-bg",
  Netflix: "text-dangerous border-dangerous/30 bg-dangerous-bg",
  Microsoft: "text-primary border-primary/30 bg-primary-light",
  Apple: "text-muted-light border-border-bright bg-card",
  Amazon: "text-suspicious border-suspicious/30 bg-suspicious-bg",
  Google: "text-safe border-safe/30 bg-safe-bg",
};

export default function BrandImpersonation({ stats }: Props) {
  const brands = stats?.top_impersonated_brands ?? {};
  const entries = Object.entries(brands).sort(([, a], [, b]) => b - a);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-cyan" />
        <h3 className="text-[15px] font-bold">Impersonated Brands</h3>
      </div>
      {entries.length === 0 ? (
        <div className="text-center py-6">
          <ShieldAlert className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
          <p className="text-[13px] text-muted">No brand impersonation detected</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {entries.map(([brand, count]) => {
            const colors = BRAND_COLORS[brand] ?? "text-muted-light border-border-bright bg-card";
            return (
              <div
                key={brand}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors}`}
              >
                <span className="text-[13px] font-bold">{brand}</span>
                <span className="text-[12px] opacity-80">&times;{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
