export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  phone_verified: boolean;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  ifsc: string;
  account_type: string;
  is_default: boolean;
  is_verified: boolean;
  masked_account_number: string;
}

export interface Signature {
  id: string;
  image_path: string;
  quality_score: number;
  clarity_score: number;
  stroke_score: number;
  contrast_score: number;
  background_score: number;
  created_at: string;
}

export interface SignatureAnalysis {
  quality_score: number;
  clarity_score: number;
  stroke_score: number;
  contrast_score: number;
  background_score: number;
  verdict: string;
  suggestions: string[];
}

export type ChequeStatus = "processing" | "accepted" | "rejected" | "manual_review";

export interface Cheque {
  id: string;
  display_id: string;
  bank_account_id: string;
  bank_name: string;
  amount_numeric: number;
  amount_words: string;
  payee: string;
  micr: string;
  cheque_date: string;
  status: ChequeStatus;
  rejection_reason: string;
  rejection_message: string;
  verification_score: number;
  created_at: string;
  processed_at: string | null;
}

export interface VerificationResult {
  decision: ChequeStatus;
  reason: string;
  message: string;
  confidence: number;
  checks: {
    image_quality: number;
    signature_match: number;
    amount_match: boolean;
    date_valid: boolean;
    micr_readable: number;
  };
  timeline: { label: string; done: boolean; score?: number; passed?: boolean }[];
}

export interface Notification {
  id: string;
  type: "success" | "warning" | "security" | "support" | "info";
  title: string;
  message: string;
  read: boolean;
  related_cheque_id: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  quick_actions: string[];
}

export interface SupportTicket {
  id: string;
  display_id: string;
  cheque_id: string;
  reason: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_deposited: number;
  total_deposited_change_pct: number;
  processing: number;
  accepted: number;
  rejected: number;
  activity: { label: string; date: string; value: number }[];
  recent_cheques: Cheque[];
}

export const DEMO_SCENARIOS = [
  { key: "success", label: "Successful cheque" },
  { key: "signature_mismatch", label: "Signature mismatch" },
  { key: "amount_mismatch", label: "Amount mismatch" },
  { key: "stale_cheque", label: "Stale cheque" },
  { key: "unreadable_micr", label: "Unreadable MICR" },
  { key: "bank_error", label: "Bank error" },
  { key: "manual_review", label: "Manual review" },
] as const;

export const SUPPORTED_BANKS = [
  "HDFC Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "ICICI Bank",
  "State Bank of India",
  "Canara Bank",
  "Bank of Baroda",
  "Punjab National Bank",
];
