import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { PsiResult } from "../psi";
import type { CheckId, Finding } from "../types";

export type CheckContext = {
  finalUrl: string;
  $: CheerioAPI;
  psi: PsiResult | null; // null = PSI unavailable
};

export function makeContext(html: string, finalUrl: string, psi: PsiResult | null): CheckContext {
  return { finalUrl, $: cheerio.load(html), psi };
}

const UNMEASURED_BG = "Не можахме да измерим това.";

const MOBILE_SPEED_MIN = 50;
const LCP_MAX_SECONDS = 4.0;
const TITLE_MIN = 10;
const TITLE_MAX = 70;

const CONTACT_HREF_PATTERNS = ["/contact", "/kontakti", "viber://", "wa.me", "calendly", "booking"];
const CONTACT_TEXT_PATTERNS = ["резерв", "запази час", "контакти"];

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export function checkMobileSpeed({ psi }: CheckContext): Finding {
  const score = psi?.performanceScore ?? null;
  if (score === null) {
    return { id: "mobile_speed", pass: null, severity: "high", evidence: "Данните за скоростта не бяха налични", fallbackTextBg: UNMEASURED_BG };
  }
  const pass = score >= MOBILE_SPEED_MIN;
  return {
    id: "mobile_speed",
    pass,
    severity: "high",
    evidence: `Оценка за скорост на телефон ${score} от 100`,
    value: score,
    fallbackTextBg: pass ? "Сайтът се зарежда достатъчно бързо на телефон." : "Сайтът се зарежда бавно на телефон.",
  };
}

export function checkLcp({ psi }: CheckContext): Finding {
  const lcp = psi?.lcpSeconds ?? null;
  if (lcp === null) {
    return { id: "lcp", pass: null, severity: "high", evidence: "Данните за времето за показване не бяха налични", fallbackTextBg: UNMEASURED_BG };
  }
  const pass = lcp <= LCP_MAX_SECONDS;
  return {
    id: "lcp",
    pass,
    severity: "high",
    evidence: `Основното съдържание се показва след ${lcp.toFixed(1)} секунди`,
    value: lcp,
    fallbackTextBg: pass ? "Основното съдържание се показва бързо." : "Основното съдържание се показва твърде бавно.",
  };
}

export function checkHttps({ finalUrl }: CheckContext): Finding {
  const pass = finalUrl.toLowerCase().startsWith("https://");
  return {
    id: "https",
    pass,
    severity: "medium",
    evidence: pass ? "Сайтът е на защитена връзка (https)" : "Сайтът не е на защитена връзка (https)",
    fallbackTextBg: pass ? "Сайтът използва защитена връзка." : "Сайтът не използва защитена връзка и браузърът може да предупреждава посетителите.",
  };
}

export function checkClickToCall({ $ }: CheckContext): Finding {
  const count = $("a[href]").filter((_, el) => ($(el).attr("href") ?? "").trim().toLowerCase().startsWith("tel:")).length;
  const pass = count > 0;
  return {
    id: "click_to_call",
    pass,
    severity: "high",
    evidence: pass ? "Има бутон за директно обаждане на началната страница" : "Няма бутон за директно обаждане на началната страница",
    value: count,
    fallbackTextBg: pass ? "Клиентите могат да се обадят с едно докосване." : "Клиентите не могат да се обадят с едно докосване.",
  };
}

export function checkContactCta({ $ }: CheckContext): Finding {
  const hasForm = $("form").length > 0;
  const hasLink =
    $("a[href]").filter((_, el) => {
      const a = $(el);
      const href = (a.attr("href") ?? "").toLowerCase();
      const text = squash(a.text()).toLowerCase();
      return CONTACT_HREF_PATTERNS.some((p) => href.includes(p)) || CONTACT_TEXT_PATTERNS.some((p) => text.includes(p));
    }).length > 0;
  const pass = hasForm || hasLink;
  return {
    id: "contact_cta",
    pass,
    severity: "high",
    evidence: pass ? "Има форма, връзка за резервация или бутон за контакт" : "Няма форма, връзка за резервация или бутон за контакт",
    fallbackTextBg: pass ? "Има ясен начин за връзка или резервация." : "Няма ясен начин за връзка или резервация.",
  };
}

export function checkMetaTags({ $ }: CheckContext): Finding {
  const title = squash($("title").first().text());
  const description = squash($('meta[name="description" i]').first().attr("content") ?? "");
  const titleOk = title.length >= TITLE_MIN && title.length <= TITLE_MAX;
  const descOk = description.length > 0;
  const pass = titleOk && descOk;

  const problems: string[] = [];
  if (title.length === 0) problems.push("липсва заглавие");
  else if (title.length < TITLE_MIN) problems.push(`заглавието е твърде кратко (${title.length} знака)`);
  else if (title.length > TITLE_MAX) problems.push(`заглавието е твърде дълго (${title.length} знака)`);
  if (!descOk) problems.push("липсва описание");

  return {
    id: "meta_tags",
    pass,
    severity: "medium",
    evidence: pass ? "Има заглавие и описание за търсачките" : `В Google: ${problems.join(", ")}`,
    value: title,
    fallbackTextBg: pass ? "Страницата има заглавие и описание в Google." : "В Google страницата ви няма добро заглавие или описание.",
  };
}

export function checkMobileUsability({ $ }: CheckContext): Finding {
  const viewport = ($('meta[name="viewport" i]').first().attr("content") ?? "").toLowerCase().replace(/\s+/g, "");
  const pass = viewport.includes("width=device-width");
  return {
    id: "mobile_usability",
    pass,
    severity: "medium",
    evidence: pass ? "Страницата се наглася към екрана на телефона" : "Страницата не се наглася към екрана на телефона",
    fallbackTextBg: pass ? "Страницата е пригодена за телефон." : "Страницата не е пригодена за телефон и текстът излиза дребен.",
  };
}

function collectJsonLdTypes(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collectJsonLdTypes(n, out));
  } else if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    if (typeof type === "string") out.push(type);
    else if (Array.isArray(type)) type.forEach((t) => typeof t === "string" && out.push(t));
    Object.values(obj).forEach((v) => collectJsonLdTypes(v, out));
  }
}

function hasLocalBusinessJsonLd($: CheerioAPI): boolean {
  let found = false;
  $('script[type="application/ld+json" i]').each((_, el) => {
    try {
      const types: string[] = [];
      collectJsonLdTypes(JSON.parse($(el).text()), types);
      if (types.includes("LocalBusiness")) found = true;
    } catch {
      // malformed JSON-LD: ignore
    }
  });
  return found;
}

const MAPS_PATTERNS = ["google.com/maps", "maps.google.", "goo.gl/maps", "maps.app.goo.gl"];
const BG_ADDRESS = /(?:^|[\s,(])(?:ул|бул)\.|Пловдив/i;

export function checkLocalSignals({ $ }: CheckContext): Finding {
  const hasJsonLd = hasLocalBusinessJsonLd($);
  const hasMaps =
    $("a[href], iframe[src]").filter((_, el) => {
      const ref = ($(el).attr("href") ?? $(el).attr("src") ?? "").toLowerCase();
      return MAPS_PATTERNS.some((p) => ref.includes(p));
    }).length > 0;
  const body = $("body").clone();
  body.find("script, style, noscript").remove();
  const hasAddress = BG_ADDRESS.test(squash(body.text()));

  const pass = hasJsonLd || hasMaps || hasAddress;
  return {
    id: "local_signals",
    pass,
    severity: "low",
    evidence: pass ? "Има адрес, карта или данни за местен бизнес" : "Няма адрес, карта или данни за местен бизнес",
    fallbackTextBg: pass ? "Личи къде се намирате." : "Не личи къде се намирате.",
  };
}

const CHECKS: Record<CheckId, (ctx: CheckContext) => Finding> = {
  mobile_speed: checkMobileSpeed,
  lcp: checkLcp,
  https: checkHttps,
  click_to_call: checkClickToCall,
  contact_cta: checkContactCta,
  meta_tags: checkMetaTags,
  mobile_usability: checkMobileUsability,
  local_signals: checkLocalSignals,
};

export function runChecks(ctx: CheckContext): Finding[] {
  return (Object.keys(CHECKS) as CheckId[]).map((id) => CHECKS[id](ctx));
}
