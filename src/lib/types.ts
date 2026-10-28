export type CheckId =
  | "mobile_speed"
  | "lcp"
  | "https"
  | "click_to_call"
  | "contact_cta"
  | "meta_tags"
  | "mobile_usability"
  | "local_signals";

export type Finding = {
  id: CheckId;
  pass: boolean | null; // null = could not be measured
  severity: "high" | "medium" | "low";
  evidence: string; // what was actually detected, e.g. "LCP 6.2s"
  value?: number | string;
  fallbackTextBg: string; // templated Bulgarian sentence, used if AI fails
};

export type Explanation = {
  headline: string; // one sentence, Bulgarian
  problems: { findingId: CheckId; title: string; impact: string; fix: string }[]; // 1–3
  summary: string;
};

export type Audit = {
  id: string;
  url: string;
  finalUrl: string;
  businessName: string;
  createdAt: string; // ISO 8601
  score: number; // 0–100, computed by code only
  findings: Finding[];
  explanation: Explanation | null; // null = AI failed/rejected, render fallbackTextBg
};
