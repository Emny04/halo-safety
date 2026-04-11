export interface Analysis {
  risk_score: number;
  category: "phishing" | "scam" | "marketing" | "legit";
  severity: "safe" | "suspicious" | "dangerous";
  explanation: string;
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
  analysis?: Analysis;
  source?: "gmail" | "outlook" | "demo" | string;
  account_id?: string;
}

export interface GmailAccount {
  account_id: string;
  email: string;
}

export interface ConnectionStatus {
  gmail_accounts: GmailAccount[];
  outlook: boolean;
}
