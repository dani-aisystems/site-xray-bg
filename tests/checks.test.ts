import { describe, expect, it } from "vitest";
import {
  checkClickToCall,
  checkContactCta,
  checkHttps,
  checkLcp,
  checkLocalSignals,
  checkMetaTags,
  checkMobileSpeed,
  checkMobileUsability,
  makeContext,
  runChecks,
} from "@/lib/checks";
import type { PsiResult } from "@/lib/psi";

const ctx = (html: string, psi: PsiResult | null = null, url = "https://example.bg/") => makeContext(html, url, psi);
const page = (head: string, body = "") => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

describe("mobile_speed", () => {
  it("passes at exactly 50 and fails at 49", () => {
    expect(checkMobileSpeed(ctx("", { performanceScore: 50, lcpSeconds: 1 })).pass).toBe(true);
    const f = checkMobileSpeed(ctx("", { performanceScore: 49, lcpSeconds: 1 }));
    expect(f.pass).toBe(false);
    expect(f.evidence).toContain("49");
    expect(f.value).toBe(49);
  });
  it("is unavailable (null) without PSI data", () => {
    expect(checkMobileSpeed(ctx("", null)).pass).toBeNull();
    expect(checkMobileSpeed(ctx("", { performanceScore: null, lcpSeconds: 2 })).pass).toBeNull();
  });
});

describe("lcp", () => {
  it("passes at exactly 4.0s and fails at 4.1s", () => {
    expect(checkLcp(ctx("", { performanceScore: 80, lcpSeconds: 4.0 })).pass).toBe(true);
    const f = checkLcp(ctx("", { performanceScore: 80, lcpSeconds: 4.1 }));
    expect(f.pass).toBe(false);
    expect(f.evidence).toContain("4.1");
  });
  it("keeps one decimal in evidence", () => {
    expect(checkLcp(ctx("", { performanceScore: 10, lcpSeconds: 6 })).evidence).toContain("6.0");
  });
  it("is unavailable without PSI data", () => {
    expect(checkLcp(ctx("", null)).pass).toBeNull();
    expect(checkLcp(ctx("", { performanceScore: 70, lcpSeconds: null })).pass).toBeNull();
  });
});

describe("https", () => {
  it("passes on the final https URL and fails on http", () => {
    expect(checkHttps(ctx("", null, "https://example.bg/")).pass).toBe(true);
    expect(checkHttps(ctx("", null, "http://example.bg/")).pass).toBe(false);
  });
});

describe("click_to_call", () => {
  it("passes with a tel: link, any case", () => {
    expect(checkClickToCall(ctx(page("", '<a href="tel:+359888123456">Обадете се</a>'))).pass).toBe(true);
    expect(checkClickToCall(ctx(page("", '<a href="TEL:0888123456">x</a>'))).pass).toBe(true);
  });
  it("fails when the number is plain text or a non-tel link", () => {
    const f = checkClickToCall(ctx(page("", "<p>Тел: 0888 123 456</p><a href='mailto:a@b.bg'>mail</a>")));
    expect(f.pass).toBe(false);
  });
});

describe("contact_cta", () => {
  it.each([
    ["a form", "<form><input name=q></form>"],
    ["/contact link", '<a href="/contact">x</a>'],
    ["/kontakti link", '<a href="/kontakti/">x</a>'],
    ["viber link", '<a href="viber://chat?number=%2B359888">x</a>'],
    ["wa.me link", '<a href="https://wa.me/359888">x</a>'],
    ["calendly link", '<a href="https://calendly.com/x">x</a>'],
    ["booking link", '<a href="https://booking.example/x">x</a>'],
    ["Контакти text", '<a href="/c">Контакти</a>'],
    ["Запази час text", '<a href="/s">Запази час онлайн</a>'],
    ["Резервации text (uppercase)", '<a href="/r">РЕЗЕРВАЦИИ</a>'],
  ])("passes with %s", (_, body) => {
    expect(checkContactCta(ctx(page("", body))).pass).toBe(true);
  });
  it("fails with no form and no matching link", () => {
    expect(checkContactCta(ctx(page("", '<a href="/about">За нас</a><a href="/menu">Меню</a>'))).pass).toBe(false);
  });
});

describe("meta_tags", () => {
  const good = '<title>Фризьорски салон Лавандула Пловдив</title><meta name="description" content="Подстригване и боядисване в центъра">';
  it("passes with a 10–70 char title and a description", () => {
    expect(checkMetaTags(ctx(page(good))).pass).toBe(true);
  });
  it("fails on a too-short title and reports its length", () => {
    const f = checkMetaTags(ctx(page('<title>Начало</title><meta name="description" content="x">')));
    expect(f.pass).toBe(false);
    expect(f.evidence).toContain("6 знака");
  });
  it("accepts the boundaries 10 and 70, rejects 71", () => {
    const d = '<meta name="description" content="x">';
    expect(checkMetaTags(ctx(page(`<title>${"а".repeat(10)}</title>${d}`))).pass).toBe(true);
    expect(checkMetaTags(ctx(page(`<title>${"а".repeat(70)}</title>${d}`))).pass).toBe(true);
    expect(checkMetaTags(ctx(page(`<title>${"а".repeat(71)}</title>${d}`))).pass).toBe(false);
  });
  it("fails on a missing or blank description", () => {
    expect(checkMetaTags(ctx(page("<title>Фризьорски салон Лавандула</title>"))).pass).toBe(false);
    expect(checkMetaTags(ctx(page('<title>Фризьорски салон Лавандула</title><meta name="description" content="   ">'))).pass).toBe(false);
  });
  it("fails with no title at all", () => {
    expect(checkMetaTags(ctx(page('<meta name="description" content="x">'))).evidence).toContain("липсва заглавие");
  });
});

describe("mobile_usability", () => {
  it("passes with width=device-width", () => {
    expect(checkMobileUsability(ctx(page('<meta name="viewport" content="width=device-width, initial-scale=1">'))).pass).toBe(true);
  });
  it("fails with no viewport or a fixed width", () => {
    expect(checkMobileUsability(ctx(page(""))).pass).toBe(false);
    expect(checkMobileUsability(ctx(page('<meta name="viewport" content="width=1024">'))).pass).toBe(false);
  });
});

describe("local_signals", () => {
  it("passes with LocalBusiness JSON-LD (plain, in @graph, or in an array @type)", () => {
    const ld = (j: unknown) => page(`<script type="application/ld+json">${JSON.stringify(j)}</script>`);
    expect(checkLocalSignals(ctx(ld({ "@type": "LocalBusiness", name: "x" }))).pass).toBe(true);
    expect(checkLocalSignals(ctx(ld({ "@graph": [{ "@type": "WebSite" }, { "@type": "LocalBusiness" }] }))).pass).toBe(true);
    expect(checkLocalSignals(ctx(ld([{ "@type": ["Organization", "LocalBusiness"] }]))).pass).toBe(true);
  });
  it("ignores JSON-LD without LocalBusiness and malformed JSON-LD", () => {
    expect(checkLocalSignals(ctx(page('<script type="application/ld+json">{"@type":"WebSite"}</script>'))).pass).toBe(false);
    expect(checkLocalSignals(ctx(page('<script type="application/ld+json">{oops</script>'))).pass).toBe(false);
  });
  it("passes with a Google Maps link or embed", () => {
    expect(checkLocalSignals(ctx(page("", '<iframe src="https://www.google.com/maps/embed?pb=1"></iframe>'))).pass).toBe(true);
    expect(checkLocalSignals(ctx(page("", '<a href="https://maps.app.goo.gl/abc">Карта</a>'))).pass).toBe(true);
  });
  it.each(["ул. Иван Вазов 5", "бул. Марица 10", "Ние сме в Пловдив"])("passes with Bulgarian address text %j", (text) => {
    expect(checkLocalSignals(ctx(page("", `<p>${text}</p>`))).pass).toBe(true);
  });
  it("does not count words in scripts, and fails when there is no signal", () => {
    expect(checkLocalSignals(ctx(page("", '<script>var city="Пловдив"</script><p>Добре дошли</p>'))).pass).toBe(false);
  });
});

describe("runChecks", () => {
  it("returns exactly one finding per check id, each with evidence and Bulgarian fallback text", () => {
    const findings = runChecks(ctx(page(""), { performanceScore: 30, lcpSeconds: 5.5 }));
    expect(findings.map((f) => f.id).sort()).toEqual(
      ["click_to_call", "contact_cta", "https", "lcp", "local_signals", "meta_tags", "mobile_speed", "mobile_usability"],
    );
    for (const f of findings) {
      expect(f.evidence.length).toBeGreaterThan(0);
      expect(f.fallbackTextBg).toMatch(/[а-я]/i);
    }
  });
  it("marks only checks 1–2 as null when PSI is unavailable", () => {
    const byId = Object.fromEntries(runChecks(ctx(page(""), null)).map((f) => [f.id, f.pass]));
    expect(byId.mobile_speed).toBeNull();
    expect(byId.lcp).toBeNull();
    expect(Object.entries(byId).filter(([, p]) => p === null)).toHaveLength(2);
  });
});
