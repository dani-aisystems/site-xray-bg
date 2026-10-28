export const PSI_TIMEOUT_MS = 25_000;
const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export type PsiResult = {
  performanceScore: number | null; // 0–100 integer
  lcpSeconds: number | null; // one decimal
};

type PsiJson = {
  lighthouseResult?: {
    categories?: { performance?: { score?: number | null } };
    audits?: { "largest-contentful-paint"?: { numericValue?: number | null } };
  };
};

/** Pure: pull the two numbers we use out of a PSI v5 response. Returns null if neither is present. */
export function parsePsi(json: unknown): PsiResult | null {
  const lh = (json as PsiJson | null)?.lighthouseResult;
  const rawScore = lh?.categories?.performance?.score;
  const rawLcpMs = lh?.audits?.["largest-contentful-paint"]?.numericValue;

  const performanceScore = typeof rawScore === "number" ? Math.round(rawScore * 100) : null;
  const lcpSeconds = typeof rawLcpMs === "number" ? Math.round(rawLcpMs / 100) / 10 : null;

  return performanceScore === null && lcpSeconds === null ? null : { performanceScore, lcpSeconds };
}

/**
 * PageSpeed Insights, mobile strategy, 25s timeout. Never throws: any failure
 * (no key, timeout, quota, bad response) returns null so checks 1–2 become "unavailable".
 */
export async function fetchPsi(url: string, apiKey = process.env.PSI_API_KEY): Promise<PsiResult | null> {
  if (!apiKey) return null;
  const endpoint = new URL(PSI_ENDPOINT);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("key", apiKey);
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(PSI_TIMEOUT_MS) });
    if (!res.ok) return null;
    return parsePsi(await res.json());
  } catch {
    return null;
  }
}
