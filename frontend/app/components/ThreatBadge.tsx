"use client";

interface Props {
  severity: string;
  size?: "sm" | "md";
}

const SEVERITY_MAP: Record<string, { label: string; classes: string }> = {
  dangerous: {
    label: "CRITICAL",
    classes: "bg-dangerous-bg text-dangerous border-dangerous/30",
  },
  suspicious: {
    label: "WARNING",
    classes: "bg-suspicious-bg text-suspicious border-suspicious/30",
  },
  safe: {
    label: "SAFE",
    classes: "bg-safe-bg text-safe border-safe/30",
  },
};

export default function ThreatBadge({ severity, size = "sm" }: Props) {
  const info = SEVERITY_MAP[severity] ?? SEVERITY_MAP.safe;
  const sizeClasses = size === "md"
    ? "text-[13px] px-2.5 py-1"
    : "text-[12px] px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center font-semibold uppercase tracking-wider rounded-md border ${info.classes} ${sizeClasses}`}
    >
      {info.label}
    </span>
  );
}
