import { fetchHtml } from "./fetchHtml";
import { fetchPsi } from "./psi";
import { computeScore } from "./score";
import { makeContext, runChecks } from "./checks";
import type { Audit } from "./types";
import { validateUrl } from "./validateUrl";

export type RunAuditResult = { ok: true; audit: Audit } | { ok: false; messageBg: string };

function businessNameFrom(ctx: ReturnType<typeof makeContext>, finalUrl: string): string {
  const { $ } = ctx;
  const raw =
    $('meta[property="og:site_name" i]').attr("content") ??
    $("title").first().text() ??
    "";
  const name = raw.replace(/\s+/g, " ").trim();
  return (name || new URL(finalUrl).hostname).slice(0, 80);
}

/**
 * Deterministic part of the pipeline: validate → [PSI ‖ HTML] → 8 checks → score.
 * `explanation` is left null here; the AI step is added on Day 3.
 */
export async function runAudit(rawUrl: string, id = "local"): Promise<RunAuditResult> {
  const checked = await validateUrl(rawUrl);
  if (!checked.ok) return { ok: false, messageBg: checked.messageBg };

  const [psi, page] = await Promise.all([fetchPsi(checked.url.href), fetchHtml(checked.url)]);
  if (!page.ok) return { ok: false, messageBg: page.messageBg };

  const ctx = makeContext(page.html, page.finalUrl, psi);
  const findings = runChecks(ctx);

  return {
    ok: true,
    audit: {
      id,
      url: checked.url.href,
      finalUrl: page.finalUrl,
      businessName: businessNameFrom(ctx, page.finalUrl),
      createdAt: new Date().toISOString(),
      score: computeScore(findings),
      findings,
      explanation: null,
    },
  };
}
