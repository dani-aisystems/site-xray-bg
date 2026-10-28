import { assertPublicHost } from "./validateUrl";

export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export type FetchHtmlResult =
  | { ok: true; html: string; finalUrl: string; truncated: boolean }
  | { ok: false; reason: "blocked" | "timeout" | "http_error" | "not_html" | "network"; messageBg: string };

const FAIL_BG: Record<Extract<FetchHtmlResult, { ok: false }>["reason"], string> = {
  blocked: "Този адрес не може да бъде проверен.",
  timeout: "Сайтът не отговори навреме.",
  http_error: "Сайтът върна грешка при отваряне.",
  not_html: "На този адрес няма уеб страница, която можем да проверим.",
  network: "Не можахме да отворим сайта.",
};

const fail = (reason: keyof typeof FAIL_BG): FetchHtmlResult => ({ ok: false, reason, messageBg: FAIL_BG[reason] });

/** Pick a charset: Content-Type header first, then a <meta charset> sniffed from the first bytes, else utf-8. */
export function decodeBody(bytes: Uint8Array, contentType: string | null): string {
  const fromHeader = contentType?.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1];
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 2048));
  const fromMeta = head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i)?.[1];
  for (const label of [fromHeader, fromMeta]) {
    if (!label) continue;
    try {
      return new TextDecoder(label).decode(bytes);
    } catch {
      // unknown label: try the next source
    }
  }
  return new TextDecoder("utf-8").decode(bytes);
}

async function readCapped(body: ReadableStream<Uint8Array>): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.length > MAX_BODY_BYTES) {
      chunks.push(value.subarray(0, MAX_BODY_BYTES - total));
      total = MAX_BODY_BYTES;
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    total += value.length;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return { bytes, truncated };
}

/**
 * Fetch the homepage HTML. Redirects are followed by hand so every hop is re-checked
 * against the SSRF guard. One 10s deadline covers connect, redirects and body read.
 */
export async function fetchHtml(start: URL): Promise<FetchHtmlResult> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let current = start;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const check = await assertPublicHost(current);
      if (!check.ok) return fail("blocked");

      const res = await fetch(current, {
        redirect: "manual",
        signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SiteXrayBot/1.0)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "bg,en;q=0.8",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        await res.body?.cancel();
        if (!location) return fail("http_error");
        let next: URL;
        try {
          next = new URL(location, current);
        } catch {
          return fail("http_error");
        }
        if (next.protocol !== "http:" && next.protocol !== "https:") return fail("blocked");
        current = next;
        continue;
      }

      if (!res.ok) {
        await res.body?.cancel();
        return fail("http_error");
      }
      const contentType = res.headers.get("content-type");
      if (contentType && !/html|xml/i.test(contentType)) {
        await res.body?.cancel();
        return fail("not_html");
      }
      if (!res.body) return fail("network");

      const { bytes, truncated } = await readCapped(res.body);
      return { ok: true, html: decodeBody(bytes, contentType), finalUrl: current.href, truncated };
    }
    return fail("http_error"); // too many redirects
  } catch (err) {
    if (signal.aborted || (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError"))) {
      return fail("timeout");
    }
    return fail("network");
  }
}
