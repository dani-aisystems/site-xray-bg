import type { CheckId, Finding } from "./types";

// Weights sum to 100 (CLAUDE.md). Code only — the AI never touches the score.
export const WEIGHTS: Record<CheckId, number> = {
  mobile_speed: 20,
  lcp: 15,
  https: 10,
  click_to_call: 15,
  contact_cta: 15,
  meta_tags: 10,
  mobile_usability: 10,
  local_signals: 5,
};

/**
 * Weighted share of passed checks, 0–100. Checks with `pass: null` (unmeasurable,
 * e.g. PSI down) are left out and the score is rescaled over the weights that remain.
 */
export function computeScore(findings: Finding[]): number {
  const measured = findings.filter((f) => f.pass !== null);
  const available = measured.reduce((sum, f) => sum + WEIGHTS[f.id], 0);
  if (available === 0) return 0;
  const earned = measured.reduce((sum, f) => sum + (f.pass ? WEIGHTS[f.id] : 0), 0);
  return Math.round((earned / available) * 100);
}
