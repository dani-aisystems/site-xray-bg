import { describe, expect, it } from "vitest";
import { mockAudit } from "@/lib/mockAudit";
import type { CheckId } from "@/lib/types";

const ALL_CHECKS: CheckId[] = [
  "mobile_speed",
  "lcp",
  "https",
  "click_to_call",
  "contact_cta",
  "meta_tags",
  "mobile_usability",
  "local_signals",
];

describe("mock audit", () => {
  it("has exactly one finding for each of the 8 checks", () => {
    expect(mockAudit.findings.map((f) => f.id).sort()).toEqual([...ALL_CHECKS].sort());
  });
});
