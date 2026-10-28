import { describe, expect, it } from "vitest";
import { computeScore, WEIGHTS } from "@/lib/score";
import type { CheckId, Finding } from "@/lib/types";

const ids = Object.keys(WEIGHTS) as CheckId[];
const make = (pass: (id: CheckId) => boolean | null): Finding[] =>
  ids.map((id) => ({ id, pass: pass(id), severity: "medium", evidence: "x", fallbackTextBg: "x" }));

describe("computeScore", () => {
  it("weights sum to 100", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("is 100 when everything passes and 0 when everything fails", () => {
    expect(computeScore(make(() => true))).toBe(100);
    expect(computeScore(make(() => false))).toBe(0);
  });
  it("adds up the weights of passed checks", () => {
    // https 10 + meta_tags 10 + mobile_usability 10
    expect(computeScore(make((id) => ["https", "meta_tags", "mobile_usability"].includes(id)))).toBe(30);
  });
  it("rescales over measured checks when PSI is unavailable", () => {
    // mobile_speed(20) + lcp(15) unmeasurable → 65 available. All the rest pass → 100.
    expect(computeScore(make((id) => (id === "mobile_speed" || id === "lcp" ? null : true)))).toBe(100);
    // Only https (10) passes of 65 available → round(10/65*100) = 15
    expect(computeScore(make((id) => (id === "mobile_speed" || id === "lcp" ? null : id === "https")))).toBe(15);
  });
  it("is 0 when nothing could be measured", () => {
    expect(computeScore(make(() => null))).toBe(0);
  });
});
