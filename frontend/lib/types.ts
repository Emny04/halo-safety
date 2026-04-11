export interface Analysis {
  risk_score: number;
  category: "phishing" | "scam" | "marketing" | "legit";
  severity: "safe" | "suspicious" | "dangerous";
  explanation: string;
  confidence: number;
  attack_type: string;
  evidence: string[];
  attack_techniques: string[];
  impersonated_brand: string | null;
  suspicious_urls: string[];
  recommended_action: string;
  threat_summary: string;
  sender_domain_verdict: "legitimate" | "suspicious" | "spoofed";
  link_verdict: "safe" | "suspicious" | "malicious" | "none";
  campaign_id?: string;
  _failed?: boolean;
}

export interface AuthResults {
  spf: "pass" | "fail" | "none" | "unknown";
  dkim: "pass" | "fail" | "none" | "unknown";
  dmarc: "pass" | "fail" | "none" | "unknown";
}

export interface Message {
  id: string;
  sender: string;
  subject: string;
  body: string;
  timestamp: string;
  type: "email" | "sms";
  blocked?: boolean;
  spam?: boolean;
  quarantined?: boolean;
  reported?: boolean;
  analysis?: Analysis;
  source?: string;
  account_id?: string;
  auth?: AuthResults;
  body_html?: string;
}

export interface GmailAccount {
  account_id: string;
  email: string;
}

export interface ConnectionStatus {
  gmail_accounts: GmailAccount[];
  outlook: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  severity: string;
  message_count: number;
  impersonated_brand: string | null;
  attack_techniques: string[];
  first_seen: string;
  last_seen: string;
}

export interface SecurityScore {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: {
    threat_ratio: number;
    campaigns_active: number;
    actions_taken: number;
    repeat_offenders: number;
  };
  counts: {
    total: number;
    analyzed: number;
    dangerous: number;
    suspicious: number;
    safe: number;
  };
}

export interface StatsSummary {
  threats_detected: number;
  threats_blocked: number;
  messages_scanned: number;
  categories: Record<string, number>;
  severity_distribution: Record<string, number>;
  top_techniques: Record<string, number>;
  top_impersonated_brands: Record<string, number>;
  campaigns_active: number;
}
