import { describe, expect, it } from "vitest";
import { decodeBody } from "@/lib/fetchHtml";
import { parsePsi } from "@/lib/psi";

describe("parsePsi", () => {
  const json = (score: unknown, lcpMs: unknown) => ({
    lighthouseResult: {
      categories: { performance: { score } },
      audits: { "largest-contentful-paint": { numericValue: lcpMs } },
    },
  });
  it("converts score to 0–100 and LCP ms to seconds with one decimal", () => {
    expect(parsePsi(json(0.34, 6234.7))).toEqual({ performanceScore: 34, lcpSeconds: 6.2 });
  });
  it("keeps what is present when one value is missing", () => {
    expect(parsePsi(json(null, 2500))).toEqual({ performanceScore: null, lcpSeconds: 2.5 });
  });
  it("returns null for garbage or empty responses", () => {
    expect(parsePsi(null)).toBeNull();
    expect(parsePsi({})).toBeNull();
    expect(parsePsi({ error: { code: 429 } })).toBeNull();
  });
});

describe("decodeBody", () => {
  const win1251 = Uint8Array.from([0xcf, 0xeb, 0xee, 0xe2, 0xe4, 0xe8, 0xe2]); // "Пловдив"
  it("decodes utf-8 by default", () => {
    expect(decodeBody(new TextEncoder().encode("Пловдив"), "text/html")).toBe("Пловдив");
  });
  it("honours the charset in the Content-Type header", () => {
    expect(decodeBody(win1251, "text/html; charset=windows-1251")).toBe("Пловдив");
  });
  it("falls back to <meta charset> when the header has none", () => {
    const html = new TextEncoder().encode('<meta charset="windows-1251">');
    const bytes = new Uint8Array([...html, ...win1251]);
    expect(decodeBody(bytes, "text/html")).toContain("Пловдив");
  });
  it("ignores an unknown charset label", () => {
    expect(decodeBody(new TextEncoder().encode("abc"), "text/html; charset=bogus-1")).toBe("abc");
  });
});
